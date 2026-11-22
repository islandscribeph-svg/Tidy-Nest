import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { brandColor, brandLogoPath } from "@/lib/brand";

export default function LoginPage() {
  const passwordEnabled = process.env.PASSWORD_LOGIN_ENABLED !== "0";
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f1ea]" />}>
      <LoginForm passwordEnabled={passwordEnabled} logoPath={brandLogoPath()} brandColor={brandColor()} />
    </Suspense>
  );
}
