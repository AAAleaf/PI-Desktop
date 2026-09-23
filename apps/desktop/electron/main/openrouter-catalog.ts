/**
 * OpenRouter's public per-model metadata, consulted only where models.dev is
 * silent.
 *
 * ADR 0134 keeps models.dev the sole model metadata authority. An
 * OpenRouter-configured endpoint additionally publishes per-model limits on
 * its own `/models` route; for an ID the snapshot does not know, those
 * endpoint-published numbers are strictly better than the generic 128k/8k
 * seed, so they fill the gap (ADR 0169). A models.dev record is never
 * overridden, no provider credential is ever attached (the route is public),
 * and a failed or missing answer degrades to the generic shape.
 */

import type { ModelInfo } from "@pi-desktop/shared";
import type { ModelConfig } from "@pi-desktop/agent-runtime";
import { genericModelConfig } from "@pi-desktop/agent-runtime";
import { apiMatches } from "./models-dev-catalog";

export const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
/** The canonical OpenRouter OpenAI-compatible endpoint base. */
export const OPENROUTER_ENDPOINT_BASE_URL = "https://openrouter.ai/api/v1";

const FETCH_TIMEOUT_MS = 10_000;
/** One refresh per process window; metadata enrichment is not latency-bound. */
const REFRESH_INTERVAL_MS = 10 * 60_000;
/** Back off after a failed fetch so a flaky network does not retry per edit. */
const RETRY_AFTER_FAILURE_MS = 60_000;

export type OpenRouterModelRecord = {
  modelId: string;
  displayName?: string;
  contextLength?: number;
  maxCompletionTokens?: number;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 0xffff_ffff
    ? value
    : undefined;
}

/** Parse the public OpenRouter models document into the fields we consume. */
export function parseOpenRouterModels(body: unknown): OpenRouterModelRecord[] {
  const root = asRecord(body);
  const data = Array.isArray(root?.data) ? root.data : [];
  const records: OpenRouterModelRecord[] = [];
  const seen = new Set<string>();
  for (const entry of data) {
    const record = asRecord(entry);
    const modelId = nonEmptyString(record?.id);
    if (!modelId) continue;
    const key = modelId.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const displayName = nonEmptyString(record?.name);
    const contextLength = positiveInteger(record?.context_length);
    const topProvider = asRecord(record?.top_provider);
    const maxCompletionTokens = positiveInteger(topProvider?.max_completion_tokens);
    records.push({
      modelId,
      ...(displayName ? { displayName } : {}),
      ...(contextLength !== undefined ? { contextLength } : {}),
      ...(maxCompletionTokens !== undefined ? { maxCompletionTokens } : {}),
    });
  }
  return records;
}

export type OpenRouterCatalogOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
};

export class OpenRouterCatalog {
  private records = new Map<string, OpenRouterModelRecord>();
  private fetchedAt = -Infinity;
  private lastFailureAt = -Infinity;
  private loadPromise: Promise<boolean> | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly now: () => number;

  constructor(options: OpenRouterCatalogOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
    this.now = options.now ?? (() => Date.now());
  }

  /** Whether this configured endpoint is OpenRouter's own API. */
  matchesEndpoint(baseUrl: string | undefined): boolean {
    return apiMatches(baseUrl, OPENROUTER_ENDPOINT_BASE_URL);
  }

  /**
   * Load the endpoint snapshot once per window when the provider needs it.
   * Resolves false without network I/O for any other base URL, while a recent
   * failure is backing off, or when the current snapshot is still fresh.
   */
  async ensureReady(baseUrl: string | undefined): Promise<boolean> {
    if (!this.matchesEndpoint(baseUrl)) return false;
    const now = this.now();
    if (this.loadPromise) return this.loadPromise;
    if (this.records.size > 0 && now - this.fetchedAt < REFRESH_INTERVAL_MS) return true;
    if (this.records.size === 0 && now - this.lastFailureAt < RETRY_AFTER_FAILURE_MS) {
      return false;
    }
    this.loadPromise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(OPENROUTER_MODELS_URL, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`OpenRouter models request failed (${response.status})`);
        }
        const parsed = parseOpenRouterModels(await response.json());
        if (parsed.length === 0) {
          throw new Error("OpenRouter models document contained no models");
        }
        this.records = new Map(
          parsed.map((record) => [record.modelId.toLowerCase(), record]),
        );
        this.fetchedAt = this.now();
        this.lastFailureAt = -Infinity;
        return true;
      } catch {
        this.lastFailureAt = this.now();
        return false;
      } finally {
        clearTimeout(timer);
        this.loadPromise = undefined;
      }
    })();
    return this.loadPromise;
  }

  /** Endpoint-published record for the id, when the snapshot has one. */
  findModel(modelId: string): OpenRouterModelRecord | undefined {
    const requested = modelId.trim().toLowerCase();
    return requested ? this.records.get(requested) : undefined;
  }
}

/**
 * Endpoint-published metadata as a renderer-facing record. Only the numbers
 * OpenRouter actually publishes are set — an absent output limit renders as an
 * em dash instead of inheriting the generic seed's fake certainty.
 */
export function modelInfoFromOpenRouter(
  record: OpenRouterModelRecord,
  providerId: string,
  source: ModelInfo["source"],
): ModelInfo {
  return {
    modelId: record.modelId,
    displayName: record.displayName ?? record.modelId,
    providerId,
    ...(record.contextLength !== undefined || record.maxCompletionTokens !== undefined
      ? {
          limit: {
            ...(record.contextLength !== undefined
              ? { context: record.contextLength, input: record.contextLength }
              : {}),
            ...(record.maxCompletionTokens !== undefined
              ? { output: record.maxCompletionTokens }
              : {}),
          },
        }
      : {}),
    ...(record.contextLength !== undefined
      ? { contextWindow: record.contextLength }
      : {}),
    ...(record.maxCompletionTokens !== undefined
      ? { maxTokens: record.maxCompletionTokens }
      : {}),
    modalities: { input: ["text"], output: ["text"] },
    capabilities: ["text"],
    supportedThinkingLevels: [],
    source,
    catalogSource: "openrouter",
  };
}

/**
 * Endpoint-published limits over the generic transport-safe shape. The config
 * stays `source: "generic"` — models.dev remains the only authority that can
 * mark a model as known to the runtime (ADR 0134).
 */
export function modelConfigFromOpenRouter(
  record: OpenRouterModelRecord,
  baseUrl: string,
): ModelConfig {
  const config = genericModelConfig(record.modelId, baseUrl);
  if (record.displayName) config.name = record.displayName;
  if (record.contextLength !== undefined) {
    config.contextWindow = record.contextLength;
  }
  if (record.maxCompletionTokens !== undefined) {
    config.maxTokens = record.maxCompletionTokens;
  }
  if (record.contextLength !== undefined || record.maxCompletionTokens !== undefined) {
    config.limit = {
      context: config.contextWindow,
      input: config.contextWindow,
      output: config.maxTokens,
    };
  }
  return config;
}
