"use client";

import { useMemo, useState } from "react";
import { STAGE_COLORS, projectDate } from "@/lib/pipeline";
import type { DealSummary } from "@/lib/types";
import { DealDrawer } from "@/components/deal-drawer";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

// Deals store plain dates (no meaningful time-of-day), so bucket by the
// ISO string's calendar date directly rather than via a local Date object,
// which can shift the day depending on the viewer's timezone offset.
function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function CalendarView({
  deals,
  users,
  employees,
}: {
  deals: DealSummary[];
  users: { id: string; name: string }[];
  employees: { id: string; name: string; active: boolean }[];
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [dealList, setDealList] = useState<DealSummary[]>(deals);

  const dealsByDay = useMemo(() => {
    const map = new Map<string, DealSummary[]>();
    for (const deal of dealList) {
      const raw = projectDate(deal);
      if (!raw) continue;
      const key = dayKey(raw);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(deal);
    }
    return map;
  }, [dealList]);

  const todayKey = dayKey(today.toISOString());

  const cells = useMemo(() => {
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const startWeekday = firstOfMonth.getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    const result: { key: string | null; day: number | null }[] = [];
    for (let i = 0; i < startWeekday; i++) result.push({ key: null, day: null });
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      result.push({ key, day });
    }
    return result;
  }, [year, month]);

  function goToMonth(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }

  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  function handleDealSaved(updated: Partial<DealSummary> & { id: string }) {
    setDealList((ds) => ds.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold text-neutral-900">Calendar</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToMonth(-1)}
            className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            ‹
          </button>
          <span className="w-40 text-center text-sm font-medium text-neutral-800">
            {MONTH_FORMATTER.format(new Date(Date.UTC(year, month, 1)))}
          </span>
          <button
            onClick={() => goToMonth(1)}
            className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            ›
          </button>
          <button
            onClick={goToToday}
            className="ml-2 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1.5 text-center text-xs font-semibold uppercase text-neutral-500">
            {w}
          </div>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-fr grid-cols-7 overflow-y-auto">
        {cells.map((cell, i) => {
          const dayDeals = cell.key ? (dealsByDay.get(cell.key) ?? []) : [];
          const isToday = cell.key === todayKey;
          return (
            <div key={i} className="min-h-[110px] border-b border-r border-neutral-100 p-1.5">
              {cell.day && (
                <>
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      isToday ? "bg-neutral-900 font-semibold text-white" : "text-neutral-400"
                    }`}
                  >
                    {cell.day}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayDeals.map((deal) => {
                      const colors = STAGE_COLORS[deal.stage];
                      const name =
                        [deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(" ") || "Unnamed";
                      const label = deal.title ? `${name} - ${deal.title}` : name;
                      return (
                        <button
                          key={deal.id}
                          onClick={() => setSelectedDealId(deal.id)}
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] text-neutral-700 hover:bg-neutral-100"
                          title={label}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                          <span className="truncate">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {selectedDealId && (
        <DealDrawer
          key={selectedDealId}
          dealId={selectedDealId}
          users={users}
          employees={employees}
          onClose={() => setSelectedDealId(null)}
          onSaved={handleDealSaved}
        />
      )}
    </div>
  );
}
