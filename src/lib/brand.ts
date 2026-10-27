const DEFAULT_BRAND_COLOR = "#5c6b3f";
const DEFAULT_LOGO_PATH = "/brand/tidynest-logo-white.webp";

export function brandColor(): string {
  const raw = process.env.NEXT_PUBLIC_BRAND_COLOR?.trim();
  if (raw && /^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  return DEFAULT_BRAND_COLOR;
}

export function brandLogoPath(): string {
  const raw = process.env.NEXT_PUBLIC_BRAND_LOGO_PATH?.trim();
  return raw || DEFAULT_LOGO_PATH;
}
