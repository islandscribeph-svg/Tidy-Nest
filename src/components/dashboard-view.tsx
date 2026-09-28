"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Building2, CheckCircle2, Download, LayoutGrid, Search, TrendingUp } from "lucide-react";
import {
  STAGE_ORDER,
  STAGE_LABELS,
  SERVICE_TYPE_LABELS,
  SOURCE_LABELS,
  DEFAULT_DASHBOARD_FILTERS,
  matchesDashboardFilters,
  type DashboardFilters,
} from "@/lib/pipeline";
import type { DealSummary } from "@/lib/types";
import { SelectButton } from "@/components/ui/select-button";
import type { Stage, ServiceType, Source } from "@prisma/client";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const RESOLVED_STAGES: Stage[] = ["CLOSED", "DEAD", "UNQUALIFIED"];

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function DashboardView({ deals }: { deals: DealSummary[] }) {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS);

  function set<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of deals) {
      const name = [d.contact.firstName, d.contact.lastName].filter(Boolean).join(" ") || "Unnamed contact";
      map.set(d.contact.id, name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [deals]);

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getUTCFullYear()]);
    for (const d of deals) {
      const raw = d.dateClosed ?? d.projectStartDate ?? d.consultDate;
      if (raw) set.add(new Date(raw).getUTCFullYear());
    }
    return [...set].sort((a, b) => b - a);
  }, [deals]);

  const filteredDeals = useMemo(() => deals.filter((d) => matchesDashboardFilters(d, filters)), [deals, filters]);

  const stats = useMemo(() => {
    const total = filteredDeals.length;
    const closedWon = filteredDeals.filter((d) => d.stage === "CLOSED").length;
    const resolved = filteredDeals.filter((d) => RESOLVED_STAGES.includes(d.stage)).length;
    const winRate = resolved > 0 ? Math.round((closedWon / resolved) * 100) : 0;
    const activePipelineValue = filteredDeals
      .filter((d) => !RESOLVED_STAGES.includes(d.stage))
      .reduce((sum, d) => sum + Number(d.estimatedDealValue ?? 0), 0);
    const closedWonRevenue = filteredDeals
      .filter((d) => d.stage === "CLOSED")
      .reduce((sum, d) => sum + Number(d.closedDealValue ?? 0), 0);

    const byStage = countBy(filteredDeals, (d) => d.stage) as Record<Stage, number>;
    const byService = countBy(
      filteredDeals.filter((d) => d.serviceType),
      (d) => d.serviceType as ServiceType,
    ) as Record<ServiceType, number>;
    const bySource = countBy(filteredDeals, (d) => d.source) as Record<Source, number>;

    return { total, closedWon, resolved, winRate, activePipelineValue, closedWonRevenue, byStage, byService, bySource };
  }, [filteredDeals]);

  const exportParams = new URLSearchParams({
    year: String(filters.year),
    month: String(filters.month),
    contactId: filters.contactId,
    address: filters.address,
    title: filters.title,
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Dashboard & Reports</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {filters.year === "all" && filters.month === "all"
              ? "Showing all dates."
              : `Defaulted to current month (${filters.month === "all" ? "all months" : MONTH_NAMES[filters.month - 1]} ${filters.year === "all" ? "" : filters.year}).`}{" "}
            Real-time conversion, service metrics, and project pipeline.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={`/api/reports/export?${exportParams.toString()}`}
            className="flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Download size={14} />
            Export CSV ({stats.total})
          </a>
          <Link
            href="/pipeline"
            className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <LayoutGrid size={14} />
            Go to Kanban Board
          </Link>
        </div>
      </div>

      <section className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
          <Search size={14} className="text-neutral-400" />
          Filter Criteria
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterField label="Year">
            <SelectButton
              value={String(filters.year)}
              onChange={(v) => set("year", v === "all" ? "all" : Number(v))}
              options={[{ value: "all", label: "All Years" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
            />
          </FilterField>
          <FilterField label="Month">
            <SelectButton
              value={String(filters.month)}
              onChange={(v) => set("month", v === "all" ? "all" : Number(v))}
              options={[
                { value: "all", label: "All Months" },
                ...MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m })),
              ]}
            />
          </FilterField>
          <FilterField label="Client">
            <SelectButton
              value={filters.contactId}
              onChange={(v) => set("contactId", v)}
              options={[{ value: "all", label: `All Clients (${clients.length})` }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </FilterField>
          <FilterField label="Address / City / State">
            <input
              className="input"
              placeholder="e.g. Highland Park or Dallas"
              value={filters.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </FilterField>
          <FilterField label="Project Title">
            <input
              className="input"
              placeholder="Search title (e.g. Relocation)"
              value={filters.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </FilterField>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp size={16} className="text-neutral-400" />}
          label="Win Rate"
          value={`${stats.winRate}%`}
          sub={`${stats.closedWon} won · ${stats.resolved} resolved (Won + Dead + Unqualified)`}
        />
        <StatCard
          icon={<Briefcase size={16} className="text-neutral-400" />}
          label="Total Filtered Deals"
          value={String(stats.total)}
          sub={`${deals.length} total projects in company CRM`}
        />
        <StatCard
          icon={<Building2 size={16} className="text-neutral-400" />}
          label="Active Pipeline Value"
          value={money(stats.activePipelineValue)}
          sub="Open leads & in-progress contracts"
        />
        <StatCard
          icon={<CheckCircle2 size={16} className="text-neutral-400" />}
          label="Closed Won Revenue"
          value={money(stats.closedWonRevenue)}
          sub={`${stats.closedWon} completed project(s)`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownPanel
          title="Deals by Stage"
          countLabel={`${stats.total} total`}
          rows={STAGE_ORDER.map((s) => [STAGE_LABELS[s], stats.byStage[s] ?? 0])}
          total={stats.total}
        />
        <BreakdownPanel
          title="Deals by Service Type"
          countLabel={`${Object.keys(SERVICE_TYPE_LABELS).length} types`}
          rows={Object.entries(SERVICE_TYPE_LABELS).map(([k, label]) => [label, stats.byService[k as ServiceType] ?? 0])}
          total={stats.total}
        />
        <BreakdownPanel
          title="Deals by Lead Source"
          countLabel={`${Object.keys(SOURCE_LABELS).length} sources`}
          rows={Object.entries(SOURCE_LABELS).map(([k, label]) => [label, stats.bySource[k as Source] ?? 0])}
          total={stats.total}
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

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="mt-1 text-xs text-neutral-400">{sub}</p>
    </div>
  );
}

function BreakdownPanel({
  title,
  countLabel,
  rows,
  total,
}: {
  title: string;
  countLabel: string;
  rows: [string, number][];
  total: number;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-800">{title}</h3>
        <span className="text-xs text-neutral-400">{countLabel}</span>
      </div>
      <div className="space-y-3">
        {rows.map(([label, count]) => {
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="text-neutral-700">{label}</span>
                <span className="text-neutral-500">
                  <span className="font-medium text-neutral-900">{count}</span> ({percent}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-neutral-800" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
