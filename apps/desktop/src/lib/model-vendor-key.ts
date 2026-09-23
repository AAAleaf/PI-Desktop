/**
 * Which vendor platform serves a model, for logo display only.
 *
 * Pure mapping — no assets, no I/O — so tests can run it directly. The
 * provider's own vendor key decides when it already names a known platform;
 * otherwise the model ID's platform prefix does, checked before and after a
 * `vendor/model` slash, so a relayed `z-ai/glm-5` still shows the GLM mark.
 * This is display metadata: it never feeds capability or transport decisions.
 */
export type VendorLogoKey =
  | "openai"
  | "anthropic"
  | "deepseek"
  | "alibaba"
  | "moonshot"
  | "minimax"
  | "xai"
  | "xiaomi"
  | "openrouter"
  | "zhipu";

/** models.dev-style provider vendor keys that already name a known platform. */
const VENDOR_KEY_ALIASES: Readonly<Record<string, VendorLogoKey>> = {
  openai: "openai",
  anthropic: "anthropic",
  deepseek: "deepseek",
  alibaba: "alibaba",
  "alibaba-cn": "alibaba",
  dashscope: "alibaba",
  qwen: "alibaba",
  moonshot: "moonshot",
  moonshotai: "moonshot",
  "moonshotai-cn": "moonshot",
  kimi: "moonshot",
  minimax: "minimax",
  "minimax-cn": "minimax",
  xai: "xai",
  "x-ai": "xai",
  grok: "xai",
  xiaomi: "xiaomi",
  mimo: "xiaomi",
  "xiaomi-mimo": "xiaomi",
  openrouter: "openrouter",
  zhipu: "zhipu",
  zhipuai: "zhipu",
  bigmodel: "zhipu",
};

/**
 * Platform prefixes visible in model IDs. A prefix must sit at the start of
 * the ID (or of the segment after the last slash) so `deepseek-v4` matches
 * but `my-gpt-clone` does not.
 */
const MODEL_ID_PREFIXES: ReadonlyArray<readonly [prefix: string, key: VendorLogoKey]> = [
  ["claude", "anthropic"],
  ["gpt-", "openai"],
  ["chatgpt", "openai"],
  ["o1", "openai"],
  ["o3", "openai"],
  ["o4", "openai"],
  ["deepseek", "deepseek"],
  ["qwen", "alibaba"],
  ["qwq", "alibaba"],
  ["qvq", "alibaba"],
  ["kimi", "moonshot"],
  ["moonshot", "moonshot"],
  ["glm", "zhipu"],
  ["grok", "xai"],
  ["minimax", "minimax"],
  ["abab", "minimax"],
  ["mimo", "xiaomi"],
  ["openrouter", "openrouter"],
];

function keyForId(value: string): VendorLogoKey | undefined {
  for (const [prefix, key] of MODEL_ID_PREFIXES) {
    if (value.startsWith(prefix)) return key;
  }
  return undefined;
}

export function vendorLogoKeyForModel(
  modelId: string,
  providerVendorKey?: string,
): VendorLogoKey | undefined {
  const vendorKey = providerVendorKey?.trim().toLowerCase();
  if (vendorKey) {
    const aliased = VENDOR_KEY_ALIASES[vendorKey];
    if (aliased) return aliased;
  }
  const id = modelId.trim().toLowerCase();
  if (!id) return undefined;
  const slash = id.lastIndexOf("/");
  const tail = slash >= 0 ? id.slice(slash + 1) : id;
  return keyForId(tail) ?? keyForId(id);
}
