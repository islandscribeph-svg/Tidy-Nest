"use client";

import { useState } from "react";
import { SERVICE_TYPE_LABELS } from "@/lib/pipeline";
import type { DealDetail, DealSummary } from "@/lib/types";

type DuplicateCandidate = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
};

export function SaveContactModal({
  deal,
  onClose,
  onSaved,
}: {
  deal: DealDetail;
  onClose: () => void;
  onSaved: (updated: Partial<DealSummary> & { contact: DealDetail["contact"] }) => void;
}) {
  const [form, setForm] = useState({
    firstName: deal.contact.firstName ?? "",
    lastName: deal.contact.lastName ?? "",
    email: deal.contact.email ?? "",
    phone: deal.contact.phone ?? "",
    streetAddress: deal.contact.streetAddress ?? "",
    city: deal.contact.city ?? "",
    state: deal.contact.state ?? "",
    company: deal.contact.company ?? "",
    serviceType: deal.serviceType ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [missingField, setMissingField] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateCandidate | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(opts: { useExistingContactId?: string; skipDuplicateCheck?: boolean } = {}) {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/contacts/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: deal.id, ...form, ...opts }),
    });
    setSaving(false);

    if (res.status === 409) {
      const data = await res.json();
      setDuplicate(data.candidate);
      return;
    }
    if (res.status === 422) {
      const data = await res.json();
      setMissingField(data.field ?? null);
      setError(data.error);
      return;
    }
    if (!res.ok) {
      setError("Could not save contact.");
      return;
    }

    const data = await res.json();
    onSaved({ id: deal.id, contactSaved: true, contact: data.contact, serviceType: data.deal.serviceType });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-1 text-base font-semibold text-neutral-900">Save Contact</h2>
        <p className="mb-4 text-xs text-neutral-500">
          Fill in anything missing before saving this lead as a contact.
        </p>

        {duplicate ? (
          <div className="space-y-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              A contact with this email or phone already exists:
              <p className="mt-1 font-medium">
                {duplicate.firstName} {duplicate.lastName}
              </p>
              <p className="text-xs">{duplicate.email || duplicate.phone}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDuplicate(null)}
                className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                Back
              </button>
              <button
                onClick={() => submit({ skipDuplicateCheck: true })}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Keep as new contact
              </button>
              <button
                onClick={() => submit({ useExistingContactId: duplicate.id })}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Link to existing
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" required error={missingField === "firstName"}>
                <input required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="input" />
              </Field>
              <Field label="Last name">
                <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="input" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" required error={missingField === "email"}>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input" />
              </Field>
              <Field label="Phone" required error={missingField === "email"}>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="input" />
              </Field>
            </div>
            <p className="-mt-1 text-[11px] text-neutral-400">Email or phone is required (at least one).</p>
            <Field label="Street address">
              <input value={form.streetAddress} onChange={(e) => set("streetAddress", e.target.value)} className="input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">
                <input value={form.city} onChange={(e) => set("city", e.target.value)} className="input" />
              </Field>
              <Field label="State">
                <input value={form.state} onChange={(e) => set("state", e.target.value)} className="input" />
              </Field>
            </div>
            <Field label="Company">
              <input value={form.company} onChange={(e) => set("company", e.target.value)} className="input" />
            </Field>
            <Field label="Service type" required error={missingField === "serviceType"}>
              <select value={form.serviceType} onChange={(e) => set("serviceType", e.target.value)} className="input">
                <option value="">Select...</option>
                {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

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
                {saving ? "Saving..." : "Save contact"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={`mb-1 block text-xs font-medium ${error ? "text-red-600" : "text-neutral-600"}`}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
