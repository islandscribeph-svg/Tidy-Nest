"use client";

import { useEffect, useState } from "react";
import type { DealDetail } from "@/lib/types";

type EmployeeOption = { id: string; name: string };

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function toDateInput(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

export function WorksheetTab({
  deal,
  patchDeal,
  refetch,
}: {
  deal: DealDetail;
  patchDeal: (patch: Record<string, unknown>) => Promise<void>;
  refetch: () => void;
}) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [draft, setDraft] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    hours: "",
    rate: "",
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((list: (EmployeeOption & { active: boolean })[]) => setEmployees(list.filter((e) => e.active)));
  }, []);

  const total = deal.worksheetEntries.reduce((sum, e) => sum + Number(e.hours) * Number(e.rate), 0);

  async function addRow() {
    if (!draft.description.trim() || !draft.hours || !draft.rate || !draft.employeeId) return;
    setAdding(true);
    const res = await fetch(`/api/deals/${deal.id}/worksheet-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: draft.employeeId,
        date: draft.date || undefined,
        description: draft.description,
        hours: Number(draft.hours),
        rate: Number(draft.rate),
      }),
    });
    setAdding(false);
    if (res.ok) {
      setDraft({ employeeId: "", date: draft.date, description: "", hours: "", rate: "" });
      refetch();
    }
  }

  async function updateRow(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/worksheet-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refetch();
  }

  async function deleteRow(id: string) {
    await fetch(`/api/worksheet-entries/${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-32 px-3 py-2 text-left font-medium">Person</th>
              <th className="w-28 px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="w-20 px-3 py-2 text-right font-medium">Hours</th>
              <th className="w-24 px-3 py-2 text-right font-medium">Rate</th>
              <th className="w-24 px-3 py-2 text-right font-medium">Total</th>
              <th className="w-8 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {deal.worksheetEntries.map((entry) => (
              <tr key={entry.id} className="border-t border-neutral-100">
                <td className="px-3 py-1.5">
                  <select
                    className="w-full border-0 bg-transparent text-sm focus:outline-none"
                    defaultValue={entry.employeeId ?? ""}
                    onChange={(e) => updateRow(entry.id, { employeeId: e.target.value || null })}
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="date"
                    className="w-full border-0 bg-transparent text-sm focus:outline-none"
                    defaultValue={toDateInput(entry.date)}
                    onBlur={(e) => updateRow(entry.id, { date: e.target.value || null })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    className="w-full border-0 bg-transparent text-sm focus:outline-none"
                    defaultValue={entry.description}
                    onBlur={(e) => updateRow(entry.id, { description: e.target.value })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    className="w-full border-0 bg-transparent text-right text-sm focus:outline-none"
                    defaultValue={entry.hours}
                    onBlur={(e) => updateRow(entry.id, { hours: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    className="w-full border-0 bg-transparent text-right text-sm focus:outline-none"
                    defaultValue={entry.rate}
                    onBlur={(e) => updateRow(entry.id, { rate: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-1.5 text-right text-sm text-neutral-700">
                  {money(Number(entry.hours) * Number(entry.rate))}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button onClick={() => deleteRow(entry.id)} className="text-neutral-400 hover:text-red-600">
                    ×
                  </button>
                </td>
              </tr>
            ))}
            <tr className="border-t border-neutral-100 bg-neutral-50/50">
              <td className="px-3 py-1.5">
                <select
                  className="w-full border-0 bg-transparent text-sm focus:outline-none"
                  value={draft.employeeId}
                  onChange={(e) => setDraft((d) => ({ ...d, employeeId: e.target.value }))}
                >
                  <option value="">Select person...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </td>
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
                  placeholder="New line..."
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
              <td className="px-3 py-1.5">
                <input
                  type="number"
                  className="w-full border-0 bg-transparent text-right text-sm focus:outline-none"
                  placeholder="0"
                  value={draft.rate}
                  onChange={(e) => setDraft((d) => ({ ...d, rate: e.target.value }))}
                />
              </td>
              <td colSpan={2} className="px-2 py-1.5 text-center">
                <button
                  onClick={addRow}
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

      <div className="flex items-start justify-between gap-6">
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Notes</span>
          <textarea
            className="input"
            rows={3}
            defaultValue={deal.worksheetNotes ?? ""}
            onBlur={(e) => patchDeal({ worksheetNotes: e.target.value || null })}
          />
        </label>
        <div className="shrink-0 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total</p>
          <p className="text-lg font-semibold text-neutral-900">{money(total)}</p>
        </div>
      </div>
    </div>
  );
}
