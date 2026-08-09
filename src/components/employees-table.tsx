"use client";

import { useState } from "react";
import Link from "next/link";
import type { EmployeeSummary } from "@/lib/types";

const TYPE_LABELS = { EMPLOYEE: "Employee", CONTRACTOR: "Contractor" } as const;

export function EmployeesTable({ initialEmployees }: { initialEmployees: EmployeeSummary[] }) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Employees & Contractors</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Add
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Hourly Rate</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link href={`/employees/${e.id}`} className="font-medium text-neutral-900 hover:underline">
                    {e.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-600">{TYPE_LABELS[e.type]}</td>
                <td className="px-4 py-2 text-neutral-600">
                  ${Number(e.hourlyRate).toFixed(2)}/hr
                  {Number(e.hourlyRate) === 0 && (
                    <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Set rate
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-600">{e.active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  No employees or contractors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onCreated={(e) => {
            setEmployees((list) => [...list, e].sort((a, b) => a.name.localeCompare(b.name)));
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function AddEmployeeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (employee: EmployeeSummary) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"EMPLOYEE" | "CONTRACTOR">("CONTRACTOR");
  const [hourlyRate, setHourlyRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, hourlyRate: hourlyRate ? Number(hourlyRate) : 0 }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Could not add. Check the fields and try again.");
      return;
    }
    onCreated(await res.json());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">Add Employee / Contractor</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              Name<span className="text-red-500"> *</span>
            </span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "EMPLOYEE" | "CONTRACTOR")}
              className="input"
            >
              <option value="CONTRACTOR">Contractor</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Hourly rate ($)</span>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="input"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
