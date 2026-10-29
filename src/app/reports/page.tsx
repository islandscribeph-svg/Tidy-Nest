import { prisma } from "@/lib/prisma";
import { buildReports } from "@/lib/reports";
import { ExportLinks } from "@/components/export-links";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [deals, hours] = await Promise.all([
    prisma.deal.findMany({ include: { contact: true } }),
    prisma.hourEntry.findMany({ include: { deal: { include: { contact: true } } } }),
  ]);
  const report = buildReports(deals, hours);
  return (
    <div className="p-6 print:p-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Reports</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">
            Revenue uses Closed deal value only. In progress, consultation, and died projects are counted separately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportLinks href="/api/exports/reports" />
          <PrintButton />
        </div>
      </div>
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">
          Closed revenue: {report.closedWithValue === 0 ? "—" : `$${report.closedTotal.toLocaleString("en-US")}`}
        </h2>
        <p className="mb-2 text-xs text-neutral-500">
          In progress and consultation: {report.openCount}. Died: {report.diedCount}. Those are not in the revenue total.
        </p>
        <SimpleTable headers={["Month", "Closed deal value"]} rows={report.revenueByMonth.map(([month, total]) => [month, `$${total.toLocaleString("en-US")}`])} />
      </section>
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Revenue by client</h2>
        <SimpleTable headers={["Client", "Closed deal value"]} rows={report.topClients.map(([name, total]) => [name, `$${total.toLocaleString("en-US")}`])} />
        {report.clients.length > report.topClients.length && (
          <p className="mt-2 text-xs text-neutral-500">Top 10 shown. The export includes the full list.</p>
        )}
      </section>
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Pipeline by stage</h2>
        <SimpleTable headers={["Stage", "Count"]} rows={report.stages.map((stage) => [stage.label, String(stage.count)])} />
      </section>
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Hours</h2>
        <SimpleTable headers={["Person", "Hours"]} rows={report.hoursByPerson.map(([name, hours]) => [name, String(hours)])} />
        <div className="mt-3">
          <SimpleTable headers={["Project", "Hours"]} rows={report.hoursByProject.map(([name, hours]) => [name, String(hours)])} />
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Data problems</h2>
        <SimpleTable headers={["Problem", "Count"]} rows={report.problemCounts.map((problem) => [problem.label, String(problem.count)])} />
      </section>
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="border-b bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-2">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-4 text-neutral-400" colSpan={headers.length}>
                —
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className="border-b border-neutral-100">
              {row.map((cell) => (
                <td key={cell} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
