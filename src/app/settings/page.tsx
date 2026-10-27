import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseAliasMap } from "@/lib/alias";
import { snapshotStatusLabel } from "@/lib/snapshot-status";
import { DataImportPanel } from "@/components/data-import-panel";
import { SnapshotPanel } from "@/components/snapshot-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/pipeline");

  const [deals, contacts, run] = await Promise.all([
    prisma.deal.count(),
    prisma.contact.count(),
    prisma.syncRun.findFirst({
      where: { source: "monday-snapshot", status: "success" },
      orderBy: { finishedAt: "desc" },
    }),
  ]);
  const alias = parseAliasMap(process.env.CLIENT_ALIAS_MAP);
  const aliasDisplays = [...new Set(alias.rules.map((rule) => rule.display))];

  return (
    <div className="max-w-2xl p-6">
      <h1 className="mb-4 text-lg font-semibold text-neutral-900">Settings</h1>
      <SnapshotPanel
        snapshotLabel={snapshotStatusLabel(run)}
        boardId={run?.boardId ?? null}
        boardName={run?.boardName ?? null}
        itemCount={run?.itemCount ?? null}
        aliasDisplays={aliasDisplays}
        aliasError={alias.error}
        snapshotPathConfigured={Boolean(process.env.MONDAY_SNAPSHOT_PATH?.trim())}
      />
      <DataImportPanel initialCounts={{ deals, contacts }} />
    </div>
  );
}
