import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

// Gates the one-time /api/setup/* bootstrap endpoints. Reuses SESSION_SECRET
// (already configured for signing login cookies) rather than requiring yet
// another env var round-trip through Vercel just for a one-time setup step.
export function secretsMatch(provided: string | null, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function checkSetupKey(req: NextRequest): boolean {
  return secretsMatch(req.headers.get("x-setup-key"), process.env.SESSION_SECRET);
}
