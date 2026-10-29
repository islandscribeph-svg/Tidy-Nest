"use client";

import { useState } from "react";

type ContactFields = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  company?: string | null;
  notes?: string | null;
  driveFolderUrl?: string | null;
  editedFields?: string[];
  importedValues?: Record<string, string | number | null> | null;
};

export function ContactEditor({ contact }: { contact: ContactFields }) {
  const [form, setForm] = useState({
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    streetAddress: contact.streetAddress ?? "",
    city: contact.city ?? "",
    state: contact.state ?? "",
    company: contact.company ?? "",
    notes: contact.notes ?? "",
    driveFolderUrl: contact.driveFolderUrl ?? "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [edited, setEdited] = useState(contact.editedFields ?? []);
  const [imported, setImported] = useState(contact.importedValues ?? null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ? "Check the contact fields and try again." : "Could not save.");
      return;
    }
    setEdited(data.editedFields ?? []);
    setImported(data.importedValues ?? null);
    setMessage("Saved in this app. Monday was not changed.");
  }

  return (
    <form onSubmit={save} className="mb-6 space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Contact details</h2>
      {edited.length > 0 && <p className="text-xs text-amber-700">Edited in this app: {edited.join(", ")}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          First name
          <input className="input mt-1 min-h-10" value={form.firstName} onChange={(event) => set("firstName", event.target.value)} required />
        </label>
        <label className="text-sm">
          Last name
          <input className="input mt-1 min-h-10" value={form.lastName} onChange={(event) => set("lastName", event.target.value)} />
          {edited.includes("lastName") && (
            <span className="mt-1 block text-[11px] text-amber-700">Imported: {imported?.lastName || "—"}</span>
          )}
        </label>
        <label className="text-sm">
          Email
          <input className="input mt-1 min-h-10" value={form.email} onChange={(event) => set("email", event.target.value)} />
        </label>
        <label className="text-sm">
          Phone
          <input className="input mt-1 min-h-10" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2">
          Drive folder
          <input className="input mt-1 min-h-10" value={form.driveFolderUrl} onChange={(event) => set("driveFolderUrl", event.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2">
          Notes
          <textarea className="input mt-1" rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} />
        </label>
      </div>
      <button type="submit" className="min-h-10 rounded-md bg-neutral-900 px-3 text-sm text-white">
        Save contact
      </button>
      {message && <p className="text-sm text-neutral-600">{message}</p>}
    </form>
  );
}
