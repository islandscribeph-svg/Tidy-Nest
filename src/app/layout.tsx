import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { DevBadgeOffset } from "@/components/dev-badge-offset";
import { getCurrentUser } from "@/lib/auth";
import { brandColor, brandLogoPath } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import { snapshotStatusLabel } from "@/lib/snapshot-status";

export const metadata: Metadata = {
  title: "Tidy Nest CRM",
  description: "Tidy Nest lead pipeline and project management",
};

export const dynamic = "force-dynamic";

async function snapshotLabel() {
  try {
    const run = await prisma.syncRun.findFirst({
      where: { source: "monday-snapshot", status: "success" },
      orderBy: { finishedAt: "desc" },
    });
    return snapshotStatusLabel(run);
  } catch {
    return snapshotStatusLabel(null);
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  const asOf = user ? await snapshotLabel() : null;

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#f4f1ea] text-[#1c2116]">
        <DevBadgeOffset />
        {user && asOf ? (
          <AppShell
            userName={user.name}
            role={user.role}
            brandColor={brandColor()}
            logoPath={brandLogoPath()}
            snapshotLabel={asOf}
          >
            {children}
          </AppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
