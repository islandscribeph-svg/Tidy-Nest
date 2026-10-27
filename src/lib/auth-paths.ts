// Pages a signed-out visitor can open. There is no registration page.
export const PUBLIC_PAGE_PREFIXES = ["/login", "/forgot-password", "/reset-password", "/brand"];

// Session cookie is not required. Each route rejects a missing or wrong secret.
export const SECRET_GATED_API_PREFIXES = ["/api/leads/intake", "/api/setup"];

export const PUBLIC_AUTH_API = ["/api/auth/login", "/api/auth/forgot-password", "/api/auth/reset-password"];

export function isSessionOptionalPath(pathname: string): boolean {
  return [...PUBLIC_PAGE_PREFIXES, ...SECRET_GATED_API_PREFIXES, ...PUBLIC_AUTH_API].some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}
