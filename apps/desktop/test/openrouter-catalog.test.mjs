/**
 * Contract tests for the OpenRouter endpoint metadata catalog (ADR 0169).
 *
 * The route is public, so no credential handling is involved; what matters is
 * the parsing shape, the endpoint gate, and the fetch discipline: gap-filling
 * only, one bounded fetch per window, and a back off that never turns a
 * broken network into per-keystroke retries.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as agentRuntime from "@pi-desktop/agent-runtime";
import * as modelsDevModule from "../electron/main/models-dev-catalog.ts";

/** Minimal CJS loader for the main-process module under test. */
function load(relative, imports) {
  const file = new URL(relative, import.meta.url);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: file.pathname,
  });
  const module = { exports: {} };
  new Function("require", "exports", "module", outputText)(
    (id) => {
      assert.ok(Object.hasOwn(imports, id), `unexpected dependency: ${id}`);
      return imports[id];
    },
    module.exports,
    module,
  );
  return module.exports;
}

const openRouterModule = load("../electron/main/openrouter-catalog.ts", {
  "@pi-desktop/agent-runtime": agentRuntime,
  "./models-dev-catalog": modelsDevModule,
});
const {
  OPENROUTER_ENDPOINT_BASE_URL,
  OPENROUTER_MODELS_URL,
  OpenRouterCatalog,
  modelConfigFromOpenRouter,
  modelInfoFromOpenRouter,
  parseOpenRouterModels,
} = openRouterModule;

const documentFixture = {
  data: [
    {
      id: "vendor/new-model",
      name: "New Model",
      context_length: 400_000,
      top_provider: { max_completion_tokens: 128_000 },
    },
    {
      id: "vendor/context-only",
      name: "Context Only",
      context_length: 1_048_576,
    },
    {
      id: "vendor/dup",
      context_length: 1,
    },
    { id: "vendor/DUP", context_length: 2 },
    { id: "   " },
    { nope: true },
    "not-an-object",
  ],
};

test("the parser keeps one row per id with only published numbers", () => {
  const records = parseOpenRouterModels(documentFixture);
  assert.deepEqual(
    records.map((record) => record.modelId),
    ["vendor/new-model", "vendor/context-only", "vendor/dup"],
  );
  const [full, contextOnly] = records;
  assert.equal(full.displayName, "New Model");
  assert.equal(full.contextLength, 400_000);
  assert.equal(full.maxCompletionTokens, 128_000);
  assert.equal(contextOnly.maxCompletionTokens, undefined);
  assert.equal(contextOnly.contextLength, 1_048_576);
  // Case-insensitive dedupe keeps the first occurrence.
  assert.equal(records[2].contextLength, 1);
});

test("only OpenRouter's own endpoint is enriched", () => {
  const catalog = new OpenRouterCatalog();
  assert.equal(catalog.matchesEndpoint("https://openrouter.ai/api/v1"), true);
  assert.equal(catalog.matchesEndpoint("https://openrouter.ai/api/v1/"), true);
  assert.equal(catalog.matchesEndpoint("https://OPENROUTER.AI/api/v1"), true);
  assert.equal(catalog.matchesEndpoint("https://api.openai.com/v1"), false);
  assert.equal(catalog.matchesEndpoint("https://openrouter.ai/api/v1/proxy"), false);
  assert.equal(catalog.matchesEndpoint(undefined), false);
});

test("ensureReady fetches once, answers lookups, and honors the TTL", async () => {
  let fetches = 0;
  let clock = 0;
  const catalog = new OpenRouterCatalog({
    fetchImpl: async (url) => {
      fetches += 1;
      assert.equal(url, OPENROUTER_MODELS_URL);
      return new Response(JSON.stringify(documentFixture), { status: 200 });
    },
    now: () => clock,
  });
  // A foreign endpoint never fetches.
  assert.equal(await catalog.ensureReady("https://api.openai.com/v1"), false);
  assert.equal(fetches, 0);
  assert.equal(catalog.findModel("vendor/new-model"), undefined);

  assert.equal(await catalog.ensureReady(OPENROUTER_ENDPOINT_BASE_URL), true);
  assert.equal(fetches, 1);
  const record = catalog.findModel("Vendor/New-Model");
  assert.equal(record?.contextLength, 400_000);

  // Fresh snapshot: a second call inside the window must not refetch.
  assert.equal(await catalog.ensureReady(OPENROUTER_ENDPOINT_BASE_URL), true);
  assert.equal(fetches, 1);
  clock += 10 * 60_000;
  assert.equal(await catalog.ensureReady(OPENROUTER_ENDPOINT_BASE_URL), true);
  assert.equal(fetches, 2);
});

test("a failed fetch backs off instead of retrying per edit", async () => {
  let fetches = 0;
  let clock = 0;
  const catalog = new OpenRouterCatalog({
    fetchImpl: async () => {
      fetches += 1;
      return new Response("nope", { status: 503 });
    },
    now: () => clock,
  });
  assert.equal(await catalog.ensureReady(OPENROUTER_ENDPOINT_BASE_URL), false);
  assert.equal(await catalog.ensureReady(OPENROUTER_ENDPOINT_BASE_URL), false);
  assert.equal(fetches, 1);
  clock += 60_000;
  assert.equal(await catalog.ensureReady(OPENROUTER_ENDPOINT_BASE_URL), false);
  assert.equal(fetches, 2);
  // A broken network degrades to the generic shape, never throws.
  assert.equal(catalog.findModel("vendor/new-model"), undefined);
});

test("gap-filling records keep generic runtime semantics but carry provenance", () => {
  const record = parseOpenRouterModels(documentFixture)[0];
  const info = modelInfoFromOpenRouter(record, "provider-1", "discovered");
  assert.equal(info.catalogSource, "openrouter");
  assert.equal(info.contextWindow, 400_000);
  assert.equal(info.maxTokens, 128_000);
  assert.deepEqual(info.capabilities, ["text"]);
  // Context-only records leave the output limit unset rather than seeding it.
  const contextOnly = modelInfoFromOpenRouter(
    parseOpenRouterModels(documentFixture)[1],
    "provider-1",
    "discovered",
  );
  assert.equal(contextOnly.maxTokens, undefined);
  assert.equal(contextOnly.limit?.output, undefined);

  const config = modelConfigFromOpenRouter(record, OPENROUTER_ENDPOINT_BASE_URL);
  assert.equal(config.source, "generic");
  assert.equal(config.contextWindow, 400_000);
  assert.equal(config.maxTokens, 128_000);
  assert.equal(config.name, "New Model");
});
