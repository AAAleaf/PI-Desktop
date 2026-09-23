/**
 * Vendor-mark mapping and wiring.
 *
 * The mapping module is pure TypeScript with no asset or I/O imports, so it
 * runs directly under the type stripper. The source-contract parts pin the
 * wiring in the settings panes and the presence of the re-hosted brand assets
 * described by the provenance list.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { vendorLogoKeyForModel } from "../src/lib/model-vendor-key.ts";

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, path), "utf8");
const panes = read("../src/components/settings/ModelSelectionPanes.tsx");

test("a provider vendor key that names a platform decides on its own", () => {
  assert.equal(vendorLogoKeyForModel("whatever", "deepseek"), "deepseek");
  assert.equal(vendorLogoKeyForModel("whatever", "alibaba-cn"), "alibaba");
  assert.equal(vendorLogoKeyForModel("whatever", "moonshotai-cn"), "moonshot");
  assert.equal(vendorLogoKeyForModel("whatever", "zhipuai"), "zhipu");
  assert.equal(vendorLogoKeyForModel("whatever", "bigmodel"), "zhipu");
  assert.equal(vendorLogoKeyForModel("whatever", "X-AI"), "xai");
  // Unknown vendor keys fall through to the id.
  assert.equal(vendorLogoKeyForModel("claude-sonnet-4-5", "custom"), "anthropic");
});

test("model id prefixes name the platform before and after a slash", () => {
  assert.equal(vendorLogoKeyForModel("gpt-5.2"), "openai");
  assert.equal(vendorLogoKeyForModel("o1-mini"), "openai");
  assert.equal(vendorLogoKeyForModel("claude-sonnet-4-5"), "anthropic");
  assert.equal(vendorLogoKeyForModel("deepseek/deepseek-v4-pro"), "deepseek");
  assert.equal(vendorLogoKeyForModel("z-ai/glm-5.3"), "zhipu");
  assert.equal(vendorLogoKeyForModel("kimi-k2.5"), "moonshot");
  assert.equal(vendorLogoKeyForModel("qwen3-max"), "alibaba");
  assert.equal(vendorLogoKeyForModel("openrouter/auto"), "openrouter");
  // The prefix must sit at the start, so lookalikes stay unmarked.
  assert.equal(vendorLogoKeyForModel("my-gpt-clone"), undefined);
  assert.equal(vendorLogoKeyForModel("gemini-3-pro"), undefined);
});

test("ids are matched trimmed and case-insensitively; blanks stay unmarked", () => {
  assert.equal(vendorLogoKeyForModel("  Claude-Sonnet-4 "), "anthropic");
  assert.equal(vendorLogoKeyForModel("   "), undefined);
  assert.equal(vendorLogoKeyForModel("", "  "), undefined);
});

test("both settings lists render the vendor mark", () => {
  const uses = panes.split("<VendorLogo").length - 1;
  assert.ok(uses >= 2, `expected the mark in the available and chosen lists, found ${uses}`);
  assert.match(panes, /providerVendorKey=\{lookupContext\?\.vendorKey\}/);
});

test("every mapped vendor has a re-hosted asset and a provenance entry", () => {
  const assetsDir = join(here, "../src/assets/provider-icons");
  const sources = JSON.parse(
    readFileSync(join(assetsDir, "provider-logo-sources.json"), "utf8"),
  );
  const documented = new Set(sources.logos.flatMap((logo) => [logo.file, logo.darkFile].filter(Boolean)));
  for (const file of [
    "model-provider-openai.png",
    "model-provider-anthropic.png",
    "model-provider-deepseek.png",
    "model-provider-alibaba-cloud.png",
    "model-provider-moonshot-kimi.png",
    "model-provider-minimax.png",
    "model-provider-xai.png",
    "model-provider-xiaomi-mimo.png",
    "model-provider-openrouter-light.svg",
    "model-provider-openrouter-dark.svg",
    "logo-bigmodel.svg",
  ]) {
    assert.ok(existsSync(join(assetsDir, file)), `${file} is missing`);
    assert.ok(documented.has(file), `${file} is not documented in provider-logo-sources.json`);
  }
});
