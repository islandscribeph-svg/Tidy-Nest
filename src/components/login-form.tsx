"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const ERRORS: Record<string, string> = {
  "google-not-configured": "Google sign-in is not set up yet. An admin can add the Google client, or use the admin password.",
  "google-domain": "Sign-in is limited to verified tidynest.com emails.",
  "google-unverified": "That Google email is not verified.",
  "google-failed": "Google sign-in did not finish. Try again.",
};

export function LoginForm({
  passwordEnabled,
  logoPath,
  brandColor,
}: {
  passwordEnabled: boolean;
  logoPath: string;
  brandColor: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(ERRORS[params.get("error") ?? ""] ?? null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed");
      return;
    }
    router.push("/today");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#e4dfd2] bg-white shadow-sm">
        <div className="flex justify-center px-8 py-6" style={{ backgroundColor: brandColor }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoPath} alt="Tidy Nest" className="h-8 w-auto" />
        </div>
        <div className="space-y-5 p-6">
          <div>
            <h1 className="text-lg font-semibold text-[#1c2116]">Sign in</h1>
            <p className="mt-1 text-sm text-neutral-600">Use your tidynest.com Google account.</p>
          </div>
          <a
            href="/api/auth/google"
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#e4dfd2] bg-white px-3 text-sm font-medium text-[#1c2116] hover:bg-[#faf8f3]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 text-xs font-semibold">
              G
            </span>
            Sign in with Google
          </a>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {passwordEnabled ? (
            <form onSubmit={handleSubmit} className="space-y-4 border-t border-[#eeeae1] pt-4">
              <p className="text-sm text-neutral-600">Admin password, for the two saved accounts.</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm focus:border-[#5c6b3f] focus:outline-none"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-neutral-700" htmlFor="password">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-neutral-500 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm focus:border-[#5c6b3f] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="min-h-12 w-full rounded-xl bg-[#1c2116] px-3 text-sm font-medium text-white hover:bg-[#2c3424] disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in with password"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
