import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { findDataProblems, problemLabel, type ProblemCode } from "@/lib/data-problems";

export const dynamic = "force-dynamic";

const FILTERS: { code: ProblemCode | "all"; label: string }[] = [
  { code: "all", label: "All" },
  { code: "duplicate_invoice", label: "Duplicate invoice" },
  { code: "closed_missing_value", label: "Closed, no value" },
  { code: "closed_missing_date", label: "Closed, no date" },
  { code: "closed_missing_drive", label: "Closed, no Drive link" },
  { code: "missing_worksheet", label: "Missing worksheet" },
  { code: "worksheet_name_mismatch", label: "Worksheet name" },
  { code: "pdf_name_mismatch", label: "PDF name" },
  { code: "died_with_invoice", label: "Died with invoice" },
  { code: "unparseable_date", label: "Unreadable date" },
];

export default async function DataProblemsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const deals = await prisma.deal.findMany({ include: { contact: true } });
  const problems = findDataProblems(deals);
  const active = FILTERS.some((filter) => filter.code === type) ? type : "all";
  const shown = active === "all" ? problems : problems.filter((problem) => problem.code === active);

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-neutral-900">Data problems</h1>
      <p className="mt-1 mb-4 max-w-3xl text-sm text-neutral-500">
        These rows are flagged and left as they are. Nothing here is rewritten in Monday or in the snapshot file.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const count =
            filter.code === "all" ? problems.length : problems.filter((problem) => problem.code === filter.code).length;
          const href = filter.code === "all" ? "/data-problems" : `/data-problems?type=${filter.code}`;
          const selected = active === filter.code;
          return (
            <Link
              key={filter.code}
              href={href}
              className={`rounded-full border px-3 py-1 text-xs ${
                selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-600"
              }`}
            >
              {filter.label} ({count})
            </Link>
          );
        })}
      </div>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Project</th>
              <th className="px-4 py-2 font-medium">Problem</th>
              <th className="px-4 py-2 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((problem) => (
              <tr key={problem.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/pipeline?deal=${problem.dealId}`} className="font-medium text-neutral-900 underline">
                    {problem.displayName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-700">{problemLabel(problem.code)}</td>
                <td className="px-4 py-2 text-neutral-600">{problem.detail}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                  No problems in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
