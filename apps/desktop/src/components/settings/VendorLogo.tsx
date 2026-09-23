import { useDarkTheme } from "../../lib/use-dark-theme";
import { vendorLogoKeyForModel } from "../../lib/model-vendor-key";
import type { VendorLogoKey } from "../../lib/model-vendor-key";
import openaiLogo from "../../assets/provider-icons/model-provider-openai.png";
import anthropicLogo from "../../assets/provider-icons/model-provider-anthropic.png";
import deepseekLogo from "../../assets/provider-icons/model-provider-deepseek.png";
import alibabaLogo from "../../assets/provider-icons/model-provider-alibaba-cloud.png";
import moonshotLogo from "../../assets/provider-icons/model-provider-moonshot-kimi.png";
import minimaxLogo from "../../assets/provider-icons/model-provider-minimax.png";
import xaiLogo from "../../assets/provider-icons/model-provider-xai.png";
import xiaomiLogo from "../../assets/provider-icons/model-provider-xiaomi-mimo.png";
import openrouterLogoLight from "../../assets/provider-icons/model-provider-openrouter-light.svg";
import openrouterLogoDark from "../../assets/provider-icons/model-provider-openrouter-dark.svg";
import bigmodelLogo from "../../assets/provider-icons/logo-bigmodel.svg";

const VENDOR_LOGO_MARKS: Record<VendorLogoKey, { light: string; dark?: string }> = {
  openai: { light: openaiLogo },
  anthropic: { light: anthropicLogo },
  deepseek: { light: deepseekLogo },
  alibaba: { light: alibabaLogo },
  moonshot: { light: moonshotLogo },
  minimax: { light: minimaxLogo },
  xai: { light: xaiLogo },
  xiaomi: { light: xiaomiLogo },
  openrouter: { light: openrouterLogoLight, dark: openrouterLogoDark },
  zhipu: { light: bigmodelLogo },
};

/**
 * The vendor platform's own mark for a model row, when the vendor is known
 * from the provider's vendor key or the model ID's platform prefix. Unknown
 * vendors render nothing, so a row without a mark reads exactly as before.
 * Decorative by contract: the model ID beside it is the accessible content.
 */
export function VendorLogo({
  modelId,
  providerVendorKey,
  size = 14,
}: {
  modelId: string;
  providerVendorKey?: string;
  size?: number;
}) {
  const dark = useDarkTheme();
  const key = vendorLogoKeyForModel(modelId, providerVendorKey);
  if (!key) return null;
  const mark = VENDOR_LOGO_MARKS[key];
  const src = dark && mark.dark ? mark.dark : mark.light;
  return (
    <img
      className="provider-vendor-logo"
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      loading="lazy"
    />
  );
}
