"use client";

import { useEffect, useState } from "react";
import { easternDateInputValue } from "@/lib/eastern-time";

type HourRow = {
  id: string;
  date: string;
  personName: string;
  dealId: string | null;
  clientLabel: string | null;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string | null;
  hours: number | null;
};

type DealOption = { id: string; displayName?: string; title: string | null; contact: { firstName: string; lastName: string | null } };
type EmployeeOption = { id: string; name: string };

function dateInput(iso: string) {
  return iso.slice(0, 10);
}

function dealLabel(deal: DealOption) {
  if (deal.displayName) return deal.displayName;
  const name = [deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(" ");
  return deal.title ? `${name} – ${deal.title}` : name;
}

export function HoursView() {
  const [entries, setEntries] = useState<HourRow[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    date: easternDateInputValue(),
    personName: "",
    dealId: "",
    startTime: "",
    endTime: "",
    breakMinutes: "0",
    notes: "",
  });

  function reload() {
    fetch("/api/hours")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []));
  }

  useEffect(() => {
    reload();
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data) => setDeals(Array.isArray(data) ? data : []));
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => setEmployees(Array.isArray(data) ? data : []));
  }, []);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: draft.date,
        personName: draft.personName,
        dealId: draft.dealId || null,
        startTime: draft.startTime,
        endTime: draft.endTime,
        breakMinutes: Number(draft.breakMinutes || 0),
        notes: draft.notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save hours.");
      return;
    }
    setDraft((d) => ({ ...d, startTime: "", endTime: "", notes: "" }));
    reload();
  }

  async function remove(id: string) {
    await fetch(`/api/hours/${id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-lg font-semibold text-neutral-900">Hours</h1>
      <p className="mt-1 mb-4 text-sm text-neutral-500">
        Manual time log in Eastern time. These hours stay in this app. They are not read from Monday, Slack, or worksheets.
      </p>

      <form onSubmit={addEntry} className="mb-6 grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Date</span>
          <input type="date" required className="input" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Person</span>
          <input
            required
            list="hour-people"
            className="input"
            value={draft.personName}
            onChange={(e) => setDraft({ ...draft, personName: e.target.value })}
          />
          <datalist id="hour-people">
            {employees.map((person) => (
              <option key={person.id} value={person.name} />
            ))}
          </datalist>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Client / project</span>
          <select className="input" value={draft.dealId} onChange={(e) => setDraft({ ...draft, dealId: e.target.value })}>
            <option value="">No project</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {dealLabel(deal)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Start (ET)</span>
          <input required type="time" className="input" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-600">End (ET)</span>
          <input required type="time" className="input" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Break (minutes)</span>
          <input
            type="number"
            min={0}
            className="input"
            value={draft.breakMinutes}
            onChange={(e) => setDraft({ ...draft, breakMinutes: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Notes</span>
          <input className="input" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </label>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add hours"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Person</th>
              <th className="px-3 py-2 font-medium">Project</th>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Hours</th>
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{dateInput(entry.date)}</td>
                <td className="px-3 py-2">{entry.personName}</td>
                <td className="px-3 py-2">{entry.clientLabel || "—"}</td>
                <td className="px-3 py-2">
                  {entry.startTime}–{entry.endTime}
                  {entry.breakMinutes ? ` · ${entry.breakMinutes}m break` : ""}
                </td>
                <td className="px-3 py-2">{entry.hours ?? "—"}</td>
                <td className="px-3 py-2">{entry.notes || "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => remove(entry.id)} className="text-xs text-neutral-400 hover:text-red-600">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-neutral-400">
                  No hours logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
