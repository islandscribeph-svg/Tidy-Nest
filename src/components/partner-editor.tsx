"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Partner = {
  id: string;
  name: string;
  kind: "VENDOR" | "SUPPLIER" | "PARTNER";
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
  tags: string[];
  driveUrl: string | null;
  slackUrl: string | null;
  links: { dealId: string | null; contactId: string | null }[];
};

export function PartnerEditor({
  partner,
  deals,
  contacts,
}: {
  partner: Partner;
  deals: { id: string; label: string }[];
  contacts: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...partner,
    tags: partner.tags.join(", "),
    dealIds: partner.links.map((link) => link.dealId).filter(Boolean) as string[],
    contactIds: partner.links.map((link) => link.contactId).filter(Boolean) as string[],
  });
  const [message, setMessage] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch(`/api/partners/${partner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        links: undefined,
      }),
    });
    setMessage(res.ok ? "Saved." : "Could not save.");
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-3">
      <h1 className="text-lg font-semibold">{form.name || "Partner"}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["name", "Name"],
            ["contactName", "Contact person"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["website", "Website"],
            ["address", "Address"],
            ["driveUrl", "Drive link"],
            ["slackUrl", "Slack link"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-sm">
            {label}
            <input className="input mt-1 min-h-10" value={form[key] ?? ""} onChange={(event) => set(key, event.target.value)} />
          </label>
        ))}
        <label className="text-sm">
          Type
          <select className="input mt-1 min-h-10" value={form.kind} onChange={(event) => set("kind", event.target.value as Partner["kind"])}>
            <option value="VENDOR">Vendor</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="PARTNER">Partner</option>
          </select>
        </label>
        <label className="text-sm">
          Status
          <select className="input mt-1 min-h-10" value={form.status} onChange={(event) => set("status", event.target.value as Partner["status"])}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Tags
          <input className="input mt-1 min-h-10" value={form.tags} onChange={(event) => set("tags", event.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2">
          Notes
          <textarea className="input mt-1" rows={3} value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} />
        </label>
        <label className="text-sm">
          Linked deal
          <select
            className="input mt-1 min-h-10"
            value={form.dealIds[0] ?? ""}
            onChange={(event) => set("dealIds", event.target.value ? [event.target.value] : [])}
          >
            <option value="">None</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Linked client
          <select
            className="input mt-1 min-h-10"
            value={form.contactIds[0] ?? ""}
            onChange={(event) => set("contactIds", event.target.value ? [event.target.value] : [])}
          >
            <option value="">None</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="min-h-10 rounded-md bg-neutral-900 px-3 text-sm text-white" type="submit">
        Save
      </button>
      {message && <p className="text-sm text-neutral-600">{message}</p>}
    </form>
  );
}
