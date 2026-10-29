const DRIVE_HOSTS = /(^|\.)((drive|docs)\.google\.com)$/i;

export function isGoogleDriveUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && DRIVE_HOSTS.test(url.hostname);
  } catch {
    return false;
  }
}

export const DRIVE_URL_ERROR = "Drive links must be an https Google Drive or Google Docs URL.";
