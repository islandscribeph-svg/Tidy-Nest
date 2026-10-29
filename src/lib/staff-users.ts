export const MAX_STAFF_USERS = 2;

export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))];
}

export function currentAllowlist(): string[] {
  return parseAllowlist(process.env.ALLOWED_USER_EMAILS);
}

export function staffAccessError(email: string, allowlist = currentAllowlist()): string | null {
  if (allowlist.length === 0 || !allowlist.includes(email.trim().toLowerCase())) {
    return "Sign-in is limited to the two configured staff accounts.";
  }
  return null;
}

export function staffCreateError(input: {
  email: string;
  existingEmails: string[];
  allowlist?: string[];
}): string | null {
  const allowlist = input.allowlist ?? currentAllowlist();
  const email = input.email.trim().toLowerCase();
  const existing = input.existingEmails.map((e) => e.toLowerCase());
  if (allowlist.length === 0) {
    return "Set ALLOWED_USER_EMAILS to the two staff addresses before creating accounts.";
  }
  if (!allowlist.includes(email)) return "That email is not one of the two configured staff accounts.";
  if (existing.includes(email)) return "That account already exists.";
  if (existing.length >= MAX_STAFF_USERS) return "This app only has two staff accounts.";
  return null;
}
