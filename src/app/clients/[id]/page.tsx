import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Stage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildClientReport, type ReportLine } from "@/lib/client-report";
import { findDataProblems } from "@/lib/data-problems";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

function DealTable({ lines, showTotal, total }: { lines: ReportLine[]; showTotal?: boolean; total?: string }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
        <tr>
          <th className="px-4 py-2 font-medium">Name</th>
          <th className="px-4 py-2 font-medium">Project date</th>
          <th className="px-4 py-2 font-medium">Closed date</th>
          <th className="px-4 py-2 font-medium">Closed deal value</th>
          <th className="px-4 py-2 font-medium">Invoice</th>
          <th className="px-4 py-2 font-medium">Drive</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.id} className="border-b border-neutral-100 last:border-0">
            <td className="px-4 py-2 text-neutral-900">
              <Link href={`/pipeline?deal=${line.id}`} prefetch={false} className="font-medium underline">
                {line.name}
              </Link>
              {line.hasProblem && (
                <Link
                  href="/data-problems"
                  prefetch={false}
                  className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                >
                  Data problem
                </Link>
              )}
            </td>
            <td className="px-4 py-2 text-neutral-600">{line.projectDate}</td>
            <td className="px-4 py-2 text-neutral-600">{line.closedDate}</td>
            <td className="px-4 py-2 text-neutral-800">{line.closedDealValue}</td>
            <td className="px-4 py-2 text-neutral-600">{line.invoiceNumber}</td>
            <td className="px-4 py-2 text-neutral-600">
              {line.driveFolderUrl ? (
                <a href={line.driveFolderUrl} target="_blank" rel="noreferrer" className="underline">
                  Drive
                </a>
              ) : (
                "—"
              )}
            </td>
          </tr>
        ))}
        {lines.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-4 text-neutral-400">
              —
            </td>
          </tr>
        )}
        {showTotal && (
          <tr className="border-t border-neutral-200 bg-neutral-50 font-medium">
            <td className="px-4 py-2">TOTAL</td>
            <td className="px-4 py-2">—</td>
            <td className="px-4 py-2">—</td>
            <td className="px-4 py-2">{total}</td>
            <td className="px-4 py-2">—</td>
            <td className="px-4 py-2">—</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-1 text-sm font-semibold text-neutral-900">{title}</h2>
      {note && <p className="mb-2 text-xs text-neutral-500">{note}</p>}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">{children}</div>
    </section>
  );
}

export default async function ClientReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contact, allDeals] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: { deals: { orderBy: { updatedAt: "desc" } } },
    }),
    prisma.deal.findMany({ include: { contact: true } }),
  ]);
  if (!contact) notFound();

  const ownIds = new Set(contact.deals.map((deal) => deal.id));
  const problemDealIds = findDataProblems(allDeals)
    .map((problem) => problem.dealId)
    .filter((dealId) => ownIds.has(dealId));
  const report = buildClientReport({ contact, deals: contact.deals, problemDealIds });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-500">
            <Link href="/contacts" className="underline">
              Contacts
            </Link>
          </p>
          <h1 className="text-lg font-semibold text-neutral-900">{report.name}</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">
            Read-only. This page does not change Monday or the records in this app. Dates are Eastern Time.
          </p>
        </div>
        <a
          href={`/api/clients/${id}/export`}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Download CSV
        </a>
      </div>

      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Name</dt>
          <dd>
            {report.contact.firstName} {report.contact.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Email</dt>
          <dd>{report.contact.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Phone</dt>
          <dd>{report.contact.phone}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Address</dt>
          <dd>{report.contact.address}</dd>
        </div>
      </dl>

      <p className="mb-6 flex flex-wrap gap-2 text-xs text-neutral-600">
        {STAGE_ORDER.map((stage: Stage) => (
          <span key={stage} className="rounded-full border border-neutral-200 bg-white px-2 py-1">
            {STAGE_LABELS[stage]} {report.counts[stage]}
          </span>
        ))}
      </p>

      <Section title="Closed" note="The total is the sum of Closed deal values only. A missing value stays a dash.">
        <DealTable lines={report.closed} showTotal total={report.closedTotal} />
      </Section>
      <Section title="In progress and consultation" note="Not included in the total.">
        <DealTable lines={report.active} />
      </Section>
      <Section title="Died" note="Not included in the total.">
        <DealTable lines={report.died} />
      </Section>
      {report.other.length > 0 && (
        <Section title="Other" note="Not included in the total.">
          <DealTable lines={report.other} />
        </Section>
      )}
    </div>
  );
}
