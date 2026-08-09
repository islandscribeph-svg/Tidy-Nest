"use client";

import { useState } from "react";
import { SERVICE_TYPE_LABELS, SOURCE_LABELS } from "@/lib/pipeline";
import type { DealSummary } from "@/lib/types";

export function NewLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (deal: DealSummary) => void;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    title: "",
    serviceType: "",
    source: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        serviceType: form.serviceType || undefined,
        source: form.source || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Could not create lead. Check the fields and try again.");
      return;
    }
    const deal = await res.json();
    onCreated(deal);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">New Lead</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" required>
              <input
                required
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Last name">
              <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="input" />
            </Field>
          </div>
          <Field label="Project title">
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Fall Relocation"
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Service">
              <select
                value={form.serviceType}
                onChange={(e) => set("serviceType", e.target.value)}
                className="input"
              >
                <option value="">Select...</option>
                {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <select value={form.source} onChange={(e) => set("source", e.target.value)} className="input">
                <option value="">Select...</option>
                {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
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
              {saving ? "Creating..." : "Create lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
