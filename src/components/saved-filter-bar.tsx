"use client";

import { useEffect, useState } from "react";
import { filterPresets, type FilterPage, type FilterQuery } from "@/lib/filter-presets";

type Saved = { id: string; name: string; query: FilterQuery };

export function SavedFilterBar({
  page,
  query,
  onApply,
}: {
  page: FilterPage;
  query: FilterQuery;
  onApply: (query: FilterQuery) => void;
}) {
  const [saved, setSaved] = useState<Saved[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const presets = filterPresets(page);

  useEffect(() => {
    fetch(`/api/filters?page=${page}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => setSaved(Array.isArray(rows) ? rows : []))
      .catch(() => setSaved([]));
  }, [page]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const res = await fetch("/api/filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, name: trimmed, query }),
    });
    if (!res.ok) return;
    const row = (await res.json()) as Saved;
    setSaved((rows) => [...rows.filter((item) => item.id !== row.id), row].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setSelected(row.id);
  }

  async function rename() {
    const current = saved.find((item) => item.id === selected);
    const trimmed = name.trim();
    if (!current || !trimmed) return;
    const res = await fetch(`/api/filters/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) return;
    const row = (await res.json()) as Saved;
    setSaved((rows) => rows.map((item) => (item.id === row.id ? row : item)));
    setName("");
  }

  async function remove() {
    if (!selected) return;
    const res = await fetch(`/api/filters/${selected}`, { method: "DELETE" });
    if (!res.ok) return;
    setSaved((rows) => rows.filter((item) => item.id !== selected));
    setSelected("");
  }

  function apply(value: string) {
    setSelected(value);
    if (value.startsWith("preset:")) {
      const preset = presets[Number(value.slice(7))];
      if (preset) onApply(preset.query);
      return;
    }
    const row = saved.find((item) => item.id === value);
    if (row) onApply(row.query);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="input min-h-10 max-w-xs" value={selected} onChange={(event) => apply(event.target.value)}>
        <option value="">Saved views</option>
        {presets.map((preset, index) => (
          <option key={preset.name} value={`preset:${index}`}>
            {preset.name}
          </option>
        ))}
        {saved.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <input
        className="input min-h-10 w-40"
        placeholder="Name this view"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button type="button" className="min-h-10 rounded-md bg-neutral-900 px-3 text-sm text-white" onClick={save}>
        Save
      </button>
      <button type="button" className="min-h-10 rounded-md border border-neutral-300 px-3 text-sm" onClick={rename}>
        Rename
      </button>
      <button type="button" className="min-h-10 rounded-md border border-neutral-300 px-3 text-sm" onClick={remove}>
        Delete
      </button>
    </div>
  );
}
