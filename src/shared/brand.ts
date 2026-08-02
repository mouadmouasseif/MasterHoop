export const BRAND_NAME = "BasketMotion AI";
export const BRAND_SHORT_NAME = "BasketMotion";
export const BRAND_TAGLINE = "AI Basketball Performance Intelligence";
export const BRAND_SECONDARY_TAGLINE = "Analyze Motion. Improve Performance.";

export const CURRENT_ENGINE_NAME = "basketmotion";
export const LEGACY_ENGINE_NAME = "masterhoop";

export const CURRENT_LOCAL_PREFIX = "basketmotion";
export const LEGACY_LOCAL_PREFIXES = ["BasketMotion-Ai", "masterhoop", "master-hoop", "MasterHoop"];

export const CURRENT_MODEL_CACHE_PREFIX = "basketmotion-model-";
export const LEGACY_MODEL_CACHE_PREFIXES = ["master-hoop-model-", "BasketMotion-Ai-model-"];

export const CURRENT_QR_SCHEME = "BasketMotion://player/";
export const LEGACY_QR_SCHEMES = ["BasketMotion-Ai://player/", "MasterHoop://player/"];

export function basketmotionFilename(name: string, extension: string) {
  return `basketmotion-${name}.${extension}`;
}

export function parsePlayerQr(value: string) {
  const trimmed = value.trim();
  const allSchemes = [CURRENT_QR_SCHEME, ...LEGACY_QR_SCHEMES];
  const scheme = allSchemes.find((item) => trimmed.startsWith(item));
  return scheme ? trimmed.slice(scheme.length).trim() : trimmed;
}
