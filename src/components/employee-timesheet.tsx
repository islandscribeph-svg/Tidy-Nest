"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPayPeriod, previousPayPeriod, nextPayPeriod, type PayPeriod } from "@/lib/pay-period";

type EmployeeDetail = {
  id: string;
  name: string;
  type: "EMPLOYEE" | "CONTRACTOR";
  hourlyRate: string;
  active: boolean;
};

type ManualRow = { id: string; date: string; hours: string; description: string | null; source: "manual" };
type ProjectRow = {
  id: string;
  date: string | null;
  hours: string;
  description: string;
  source: "project";
  dealId: string;
  dealTitle: string | null;
};

type TimesheetResponse = {
  employee: EmployeeDetail;
  manualEntries: ManualRow[];
  worksheetEntries: ProjectRow[];
  totalHours: number;
  totalPay: number;
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function EmployeeTimesheet({ employeeId }: { employeeId: string }) {
  const [period, setPeriod] = useState<PayPeriod>(() => getPayPeriod(new Date()));
  const [data, setData] = useState<TimesheetResponse | null>(null);
  const [draft, setDraft] = useState({ date: toDateInput(new Date().toISOString()), hours: "", description: "" });
  const [adding, setAdding] = useState(false);

  function refetch() {
    const params = new URLSearchParams({ start: period.start.toISOString(), end: period.end.toISOString() });
    fetch(`/api/employees/${employeeId}/timesheet?${params}`)
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, period]);

  async function patchEmployee(patch: Record<string, unknown>) {
    await fetch(`/api/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refetch();
  }

  async function addManualEntry() {
    if (!draft.hours || !draft.date) return;
    setAdding(true);
    const res = await fetch(`/api/employees/${employeeId}/timesheet-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: draft.date, hours: Number(draft.hours), description: draft.description || undefined }),
    });
    setAdding(false);
    if (res.ok) {
      setDraft({ date: draft.date, hours: "", description: "" });
      refetch();
    }
  }

  async function updateManualEntry(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/timesheet-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refetch();
  }

  async function deleteManualEntry(id: string) {
    await fetch(`/api/timesheet-entries/${id}`, { method: "DELETE" });
    refetch();
  }

  if (!data) {
    return (
      <div>
        <Link href="/employees" className="text-xs text-neutral-500 hover:underline">
          ← Employees
        </Link>
        <p className="mt-4 text-sm text-neutral-400">Loading...</p>
      </div>
    );
  }

  const { employee } = data;
  const allRows = [...data.manualEntries, ...data.worksheetEntries].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? ""),
  );

  return (
    <div>
      <Link href="/employees" className="text-xs text-neutral-500 hover:underline">
        ← Employees
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <input
            className="border-0 bg-transparent text-lg font-semibold text-neutral-900 focus:outline-none"
            defaultValue={employee.name}
            onBlur={(e) => patchEmployee({ name: e.target.value })}
          />
          <div className="mt-1 flex items-center gap-3 text-sm text-neutral-500">
            <select
              className="rounded border border-neutral-300 px-2 py-1 text-sm"
              defaultValue={employee.type}
              onChange={(e) => patchEmployee({ type: e.target.value })}
            >
              <option value="CONTRACTOR">Contractor</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
            <span className="flex items-center gap-1">
              $
              <input
                type="number"
                className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
                defaultValue={employee.hourlyRate}
                onBlur={(e) => patchEmployee({ hourlyRate: Number(e.target.value) })}
              />
              /hr
            </span>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={employee.active}
                onChange={(e) => patchEmployee({ active: e.target.checked })}
              />
              Active
            </label>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2">
        <button onClick={() => setPeriod(previousPayPeriod(period))} className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Prev
        </button>
        <span className="text-sm font-medium text-neutral-900">{period.label}</span>
        <button onClick={() => setPeriod(nextPayPeriod(period))} className="text-sm text-neutral-500 hover:text-neutral-900">
          Next →
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-28 px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="w-20 px-3 py-2 text-right font-medium">Hours</th>
              <th className="w-8 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row) =>
              row.source === "manual" ? (
                <tr key={`manual-${row.id}`} className="border-t border-neutral-100">
                  <td className="px-3 py-1.5">
                    <input
                      type="date"
                      className="w-full border-0 bg-transparent text-sm focus:outline-none"
                      defaultValue={toDateInput(row.date)}
                      onBlur={(e) => updateManualEntry(row.id, { date: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className="w-full border-0 bg-transparent text-sm focus:outline-none"
                      defaultValue={row.description ?? ""}
                      onBlur={(e) => updateManualEntry(row.id, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      className="w-full border-0 bg-transparent text-right text-sm focus:outline-none"
                      defaultValue={row.hours}
                      onBlur={(e) => updateManualEntry(row.id, { hours: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={() => deleteManualEntry(row.id)} className="text-neutral-400 hover:text-red-600">
                      ×
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={`project-${row.id}`} className="border-t border-neutral-100 bg-neutral-50/40">
                  <td className="px-3 py-1.5 text-neutral-600">{row.date ? toDateInput(row.date) : "—"}</td>
                  <td className="px-3 py-1.5 text-neutral-600">
                    {row.description}{" "}
                    <span className="text-xs text-neutral-400">via {row.dealTitle || "Untitled project"}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-neutral-600">{row.hours}</td>
                  <td className="px-2 py-1.5"></td>
                </tr>
              ),
            )}
            <tr className="border-t border-neutral-100 bg-neutral-50/50">
              <td className="px-3 py-1.5">
                <input
                  type="date"
                  className="w-full border-0 bg-transparent text-sm focus:outline-none"
                  value={draft.date}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  className="w-full border-0 bg-transparent text-sm focus:outline-none"
                  placeholder="New manual entry..."
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  type="number"
                  className="w-full border-0 bg-transparent text-right text-sm focus:outline-none"
                  placeholder="0"
                  value={draft.hours}
                  onChange={(e) => setDraft((d) => ({ ...d, hours: e.target.value }))}
                />
              </td>
              <td className="px-2 py-1.5 text-center">
                <button
                  onClick={addManualEntry}
                  disabled={adding}
                  className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end gap-6 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total Hours</p>
          <p className="text-lg font-semibold text-neutral-900">{data.totalHours}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total Pay</p>
          <p className="text-lg font-semibold text-neutral-900">{money(data.totalPay)}</p>
        </div>
      </div>
    </div>
  );
}
