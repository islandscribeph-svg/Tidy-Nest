import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
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
      <body className="flex min-h-full flex-col bg-neutral-50 text-neutral-900">
        {user && asOf && (
          <NavBar
            userName={user.name}
            role={user.role}
            brandColor={brandColor()}
            logoPath={brandLogoPath()}
            snapshotLabel={asOf}
          />
        )}
        <main className="min-h-0 flex-1">{children}</main>
        {user && asOf && (
          <footer className="border-t border-neutral-200 bg-white px-6 py-2 text-xs text-neutral-500">{asOf}</footer>
        )}
      </body>
    </html>
  );
}
