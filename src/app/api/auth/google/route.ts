import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

function appOrigin() {
  return (process.env.APP_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
}

export async function GET() {
  const origin = appOrigin();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/login?error=google-not-configured", origin));
  }

  const state = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");
  const redirectUri = `${origin}/api/auth/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  // Hint only. The callback allows an account from the email and email_verified claims.
  url.searchParams.set("hd", "tidynest.com");
  url.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(url);
  const cookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
  res.cookies.set("tn_google_state", state, cookie);
  res.cookies.set("tn_google_nonce", nonce, cookie);
  return res;
}
