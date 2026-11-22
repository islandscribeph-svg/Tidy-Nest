import { randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { applySessionCookie, createSessionToken, hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { googleSignInDecision, roleForNewGoogleUser } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";
import { currentAllowlist } from "@/lib/staff-users";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function appOrigin() {
  return (process.env.APP_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
}

function fail(origin: string, code: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${code}`, origin));
  res.cookies.set("tn_google_state", "", { path: "/", maxAge: 0 });
  res.cookies.set("tn_google_nonce", "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const origin = appOrigin();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(origin, "google-not-configured");

  const state = req.nextUrl.searchParams.get("state") ?? "";
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const savedState = req.cookies.get("tn_google_state")?.value ?? "";
  const nonce = req.cookies.get("tn_google_nonce")?.value ?? "";
  if (!code || !state || state !== savedState) return fail(origin, "google-failed");

  const redirectUri = `${origin}/api/auth/google/callback`;
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) return fail(origin, "google-failed");
  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) return fail(origin, "google-failed");

  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(tokens.id_token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });
    payload = verified.payload as Record<string, unknown>;
  } catch {
    return fail(origin, "google-failed");
  }

  const decision = googleSignInDecision(payload, nonce);
  if (!decision.ok) {
    const codeFor =
      decision.code === "domain" ? "google-domain" : decision.code === "unverified" ? "google-unverified" : "google-failed";
    return fail(origin, codeFor);
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: decision.email, mode: "insensitive" } },
  });
  const user =
    existing ??
    (await prisma.user.create({
      data: {
        email: decision.email,
        name: decision.name,
        role: roleForNewGoogleUser(decision.email, currentAllowlist()),
        passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      },
    }));

  if (!existing) {
    await logActivity(prisma, {
      userId: user.id,
      action: "sign-in",
      recordType: "user",
      recordId: user.id,
      field: "account",
      newValue: "created",
    });
  }

  const token = await createSessionToken({ userId: user.id, role: user.role });
  await logActivity(prisma, {
    userId: user.id,
    action: "sign-in",
    recordType: "user",
    recordId: user.id,
    field: "session",
    newValue: "signed in",
  });

  const res = applySessionCookie(NextResponse.redirect(new URL("/today", origin)), token);
  res.cookies.set("tn_google_state", "", { path: "/", maxAge: 0 });
  res.cookies.set("tn_google_nonce", "", { path: "/", maxAge: 0 });
  return res;
}
