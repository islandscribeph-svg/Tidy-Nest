export const TIDY_NEST_DOMAIN = "tidynest.com";

export type GoogleIdentity = {
  email?: unknown;
  email_verified?: unknown;
  hd?: unknown;
  name?: unknown;
  nonce?: unknown;
};

export type GoogleSignInDecision =
  | { ok: true; email: string; name: string }
  | { ok: false; error: string; code: "missing-email" | "unverified" | "domain" | "nonce" };

// The domain check uses the email claim only. `hd` is an authorize-URL hint and is not consulted here.
export function emailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at < 1 || at !== trimmed.lastIndexOf("@")) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!local || !domain || domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return null;
  if (local.includes(" ") || domain.includes(" ")) return null;
  return domain;
}

export function isTidynestEmail(email: string): boolean {
  return emailDomain(email) === TIDY_NEST_DOMAIN;
}

export function googleSignInDecision(identity: GoogleIdentity, expectedNonce: string): GoogleSignInDecision {
  if (typeof identity.email !== "string" || !identity.email.trim()) {
    return { ok: false, error: "Google did not share an email.", code: "missing-email" };
  }
  const verified = identity.email_verified === true || identity.email_verified === "true";
  if (!verified) {
    return { ok: false, error: "That Google email is not verified.", code: "unverified" };
  }
  const email = identity.email.trim().toLowerCase();
  if (!isTidynestEmail(email)) {
    return { ok: false, error: "Sign-in is limited to tidynest.com emails.", code: "domain" };
  }
  if (typeof identity.nonce !== "string" || !expectedNonce || identity.nonce !== expectedNonce) {
    return { ok: false, error: "Sign-in could not be verified. Try again.", code: "nonce" };
  }
  const rawName = typeof identity.name === "string" ? identity.name.trim() : "";
  const fallback = email.split("@")[0] ?? "Staff";
  const name = (rawName || fallback).replace(/\s+/g, " ").slice(0, 80);
  return { ok: true, email, name };
}

// The two env accounts (Peps and Shannon) stay admins. Everyone else at tidynest.com starts as a member.
export function roleForNewGoogleUser(email: string, allowlist: string[]): "ADMIN" | "MEMBER" {
  return allowlist.includes(email.trim().toLowerCase()) ? "ADMIN" : "MEMBER";
}
