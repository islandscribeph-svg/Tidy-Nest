import { prisma } from "@/lib/prisma";
import { STAGE_LABELS, SERVICE_TYPE_LABELS, SOURCE_LABELS, STAGE_ORDER } from "@/lib/pipeline";
import type { Stage, ServiceType, Source } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const deals = await prisma.deal.findMany({ select: { stage: true, serviceType: true, source: true } });

  const byStage = countBy(deals, (d) => d.stage) as Record<Stage, number>;
  const byService = countBy(
    deals.filter((d) => d.serviceType),
    (d) => d.serviceType as ServiceType,
  ) as Record<ServiceType, number>;
  const bySource = countBy(deals, (d) => d.source) as Record<Source, number>;

  const closedWon = byStage.CLOSED ?? 0;
  const closedLost = (byStage.DEAD ?? 0) + (byStage.UNQUALIFIED ?? 0);
  const decided = closedWon + closedLost;
  const winRate = decided > 0 ? Math.round((closedWon / decided) * 100) : null;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Reports</h1>
        <a
          href="/api/reports/export"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Export CSV
        </a>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total deals" value={deals.length} />
        <StatCard label="Closed won" value={closedWon} />
        <StatCard label="Win rate" value={winRate === null ? "—" : `${winRate}%`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportTable title="By stage" rows={STAGE_ORDER.map((s) => [STAGE_LABELS[s], byStage[s] ?? 0])} />
        <ReportTable
          title="By service type"
          rows={Object.entries(SERVICE_TYPE_LABELS).map(([k, label]) => [label, byService[k as ServiceType] ?? 0])}
        />
        <ReportTable
          title="By source"
          rows={Object.entries(SOURCE_LABELS).map(([k, label]) => [label, bySource[k as Source] ?? 0])}
        />
      </div>
    </div>
  );
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const map: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    map[k] = (map[k] ?? 0) + 1;
  }
  return map;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function ReportTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
      <table className="w-full text-sm">
        <tbody>
          {rows
            .filter(([, count]) => count > 0)
            .map(([label, count]) => (
              <tr key={label} className="border-b border-neutral-100 last:border-0">
                <td className="py-1.5 text-neutral-700">{label}</td>
                <td className="py-1.5 text-right font-medium text-neutral-900">{count}</td>
              </tr>
            ))}
          {rows.every(([, count]) => count === 0) && (
            <tr>
              <td className="py-3 text-neutral-400">No data yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
