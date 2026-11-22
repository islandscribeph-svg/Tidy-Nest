"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExportLinks } from "@/components/export-links";
import { SavedFilterBar } from "@/components/saved-filter-bar";
import { textMatch } from "@/lib/filter-presets";
import { SHANNON_APPROVAL } from "@/lib/field-edits";
import { attentionHelp, attentionTitle } from "@/lib/needs-attention";
import type { ProblemCode } from "@/lib/data-problems";

const FILTERS: { code: ProblemCode | "all"; label: string }[] = [
  { code: "all", label: "All" },
  { code: "duplicate_invoice", label: "Shared invoice" },
  { code: "closed_missing_value", label: "Missing price" },
  { code: "closed_missing_date", label: "Missing end date" },
  { code: "closed_missing_drive", label: "Missing Drive" },
  { code: "missing_worksheet", label: "Missing worksheet" },
  { code: "worksheet_name_mismatch", label: "Worksheet name" },
  { code: "pdf_name_mismatch", label: "Invoice file" },
  { code: "died_with_invoice", label: "Died with invoice" },
  { code: "unparseable_date", label: "Unreadable date" },
];

export type AttentionRow = {
  id: string;
  code: ProblemCode;
  dealId: string;
  displayName: string;
  detail: string;
  canUseDate: boolean;
  canClearInvoice: boolean;
};

export function NeedsAttentionView({
  problems,
  initialType,
  isAdmin,
}: {
  problems: AttentionRow[];
  initialType: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState(FILTERS.some((filter) => filter.code === initialType) ? initialType : "all");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = useMemo(
    () =>
      problems.filter((problem) => {
        if (type !== "all" && problem.code !== type) return false;
        return textMatch(query, [problem.displayName, problem.detail, attentionTitle(problem.code)]);
      }),
    [problems, type, query],
  );

  async function fix(problem: AttentionRow, body: Record<string, unknown>) {
    setError(null);
    setPending(problem.id);
    const res = await fetch("/api/needs-attention/fix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: problem.dealId, code: problem.code, ...body }),
    });
    setPending(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not apply that fix.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#1c2116]">Needs attention</h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-600">
            A short checklist. Fix what you can here, or open the project. Nothing is sent anywhere else.
          </p>
        </div>
        <ExportLinks href="/api/exports/data-problems" />
      </div>
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="min-h-11 w-full rounded-xl border border-[#e4dfd2] bg-white px-3 text-sm sm:max-w-sm"
          placeholder="Search this list"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <SavedFilterBar
          page="data-problems"
          query={{ type, q: query }}
          onApply={(next) => {
            setType(next.type || "all");
            setQuery(next.q ?? "");
          }}
        />
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter) => {
          const count = filter.code === "all" ? problems.length : problems.filter((problem) => problem.code === filter.code).length;
          if (filter.code !== "all" && count === 0) return null;
          const selected = type === filter.code;
          return (
            <button
              key={filter.code}
              type="button"
              onClick={() => setType(filter.code)}
              className={`min-h-11 shrink-0 rounded-full border px-3 text-sm ${
                selected ? "border-[#1c2116] bg-[#1c2116] text-white" : "border-[#e4dfd2] bg-white text-neutral-700"
              }`}
            >
              {filter.label} ({count})
            </button>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9d3c4] bg-white px-4 py-10 text-center">
          <p className="text-base font-medium text-[#1c2116]">Nothing in this list.</p>
          <p className="mt-1 text-sm text-neutral-500">You are clear for this filter.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((problem) => (
            <li key={problem.id} className="rounded-2xl border border-[#e4dfd2] bg-white p-4">
              <p className="text-sm font-semibold text-[#1c2116]">{attentionTitle(problem.code)}</p>
              <p className="mt-1 text-sm text-neutral-800">{problem.displayName}</p>
              <p className="mt-1 text-sm text-neutral-600">{problem.detail}</p>
              <p className="mt-2 text-sm text-neutral-500">{attentionHelp(problem.code)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/pipeline?deal=${problem.dealId}`}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center rounded-full bg-[#1c2116] px-4 text-sm font-medium text-white"
                >
                  Open project
                </Link>
                {problem.canUseDate && (
                  <button
                    type="button"
                    disabled={pending === problem.id}
                    onClick={() => fix(problem, {})}
                    className="inline-flex min-h-11 items-center rounded-full border border-[#5c6b3f] px-4 text-sm font-medium text-[#3f4c28] disabled:opacity-50"
                  >
                    Use the project date
                  </button>
                )}
                {problem.canClearInvoice && isAdmin && (
                  <button
                    type="button"
                    disabled={pending === problem.id}
                    onClick={() => {
                      if (!window.confirm("This change should be approved by Shannon.")) return;
                      void fix(problem, { shannonApproval: SHANNON_APPROVAL });
                    }}
                    className="inline-flex min-h-11 items-center rounded-full border border-[#c46b4a] px-4 text-sm font-medium text-[#8a4630] disabled:opacity-50"
                  >
                    Clear the invoice number
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
