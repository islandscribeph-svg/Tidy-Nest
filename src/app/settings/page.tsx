import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseAliasMap } from "@/lib/alias";
import { snapshotStatusLabel } from "@/lib/snapshot-status";
import { DataImportPanel } from "@/components/data-import-panel";
import { SnapshotPanel } from "@/components/snapshot-panel";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { calendarSyncStatus, sheetsBackupStatus, slackStatus } from "@/lib/integrations";
import { formatEasternDateTime } from "@/lib/eastern-time";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/pipeline");

  const [deals, contacts, run, backup, slackSettings] = await Promise.all([
    prisma.deal.count(),
    prisma.contact.count(),
    prisma.syncRun.findFirst({
      where: { source: "monday-snapshot", status: "success" },
      orderBy: { finishedAt: "desc" },
    }),
    prisma.syncRun.findFirst({ where: { source: "google-sheets" }, orderBy: { finishedAt: "desc" } }),
    prisma.integrationSetting.findUnique({ where: { id: "app" } }),
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
      <IntegrationsPanel
        sheets={sheetsBackupStatus()}
        slack={slackStatus()}
        calendar={calendarSyncStatus()}
        backupLabel={backup?.finishedAt ? `${formatEasternDateTime(backup.finishedAt)} · ${backup.status}` : "No backup yet"}
        slackLead={slackSettings?.slackNotifyLead ?? true}
        slackStage={slackSettings?.slackNotifyStage ?? true}
      />
    </div>
  );
}
