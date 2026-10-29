"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExportLinks } from "@/components/export-links";
import { SavedFilterBar } from "@/components/saved-filter-bar";
import { textMatch } from "@/lib/filter-presets";
import { problemLabel, type ProblemCode } from "@/lib/data-problems";

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

const PAGE_SIZE = 40;

export type ProblemRow = { id: string; code: ProblemCode; dealId: string; displayName: string; detail: string };

export function DataProblemsView({ problems, initialType }: { problems: ProblemRow[]; initialType: string }) {
  const [type, setType] = useState(FILTERS.some((filter) => filter.code === initialType) ? initialType : "all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = useMemo(
    () =>
      problems.filter((problem) => {
        if (type !== "all" && problem.code !== type) return false;
        return textMatch(query, [problem.displayName, problem.detail, problemLabel(problem.code)]);
      }),
    [problems, type, query],
  );
  const page = visible.slice(0, shown);

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Data problems</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">
            These rows are flagged and left as they are. Nothing here is rewritten in Monday or in the snapshot file.
          </p>
        </div>
        <ExportLinks href="/api/exports/data-problems" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="input min-h-10 w-full max-w-sm"
          placeholder="Search problems"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShown(PAGE_SIZE);
          }}
        />
        <SavedFilterBar
          page="data-problems"
          query={{ type, q: query }}
          onApply={(next) => {
            setType(next.type || "all");
            setQuery(next.q ?? "");
            setShown(PAGE_SIZE);
          }}
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const count = filter.code === "all" ? problems.length : problems.filter((problem) => problem.code === filter.code).length;
          const selected = type === filter.code;
          return (
            <button
              key={filter.code}
              type="button"
              onClick={() => {
                setType(filter.code);
                setShown(PAGE_SIZE);
              }}
              className={`min-h-10 rounded-full border px-3 text-xs ${
                selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-600"
              }`}
            >
              {filter.label} ({count})
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Project</th>
              <th className="px-4 py-2 font-medium">Problem</th>
              <th className="px-4 py-2 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {page.map((problem) => (
              <tr key={problem.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/pipeline?deal=${problem.dealId}`} prefetch={false} className="font-medium text-neutral-900 underline">
                    {problem.displayName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-700">{problemLabel(problem.code)}</td>
                <td className="px-4 py-3 text-neutral-600">{problem.detail}</td>
              </tr>
            ))}
            {page.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                  No problems in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {shown < visible.length && (
        <button type="button" className="mt-3 min-h-10 rounded-md border border-neutral-300 px-3 text-sm" onClick={() => setShown((count) => count + PAGE_SIZE)}>
          Show more ({visible.length - shown} left)
        </button>
      )}
    </div>
  );
}
