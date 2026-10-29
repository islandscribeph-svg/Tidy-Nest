"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExportLinks } from "@/components/export-links";
import { textMatch } from "@/lib/filter-presets";

export type PartnerRow = {
  id: string;
  name: string;
  kind: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  tags: string[];
};

const PAGE_SIZE = 40;

export function PartnersBrowser({ partners }: { partners: PartnerRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const visible = useMemo(
    () =>
      partners.filter((partner) => {
        if (status !== "all" && partner.status !== status) return false;
        if (kind !== "all" && partner.kind !== kind) return false;
        return textMatch(query, [partner.name, partner.contactName, partner.email, partner.phone, partner.tags.join(" ")]);
      }),
    [partners, query, status, kind],
  );

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind: kind === "all" ? "VENDOR" : kind }),
    });
    if (!res.ok) {
      setMessage("Could not add that partner.");
      return;
    }
    const created = await res.json();
    router.push(`/partners/${created.id}`);
  }

  async function upload(file: File) {
    const text = await file.text();
    const res = await fetch("/api/partners/import", { method: "POST", headers: { "Content-Type": "text/csv" }, body: text });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? `Imported ${data.created ?? 0}.` : "Import failed.");
    if (res.ok) router.refresh();
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Partners</h1>
          <p className="mt-1 text-sm text-neutral-500">Vendors, suppliers, and partners. This list starts empty.</p>
        </div>
        <ExportLinks href="/api/exports/partners" />
      </div>
      <form onSubmit={add} className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input min-h-10 w-56" placeholder="New name" value={name} onChange={(event) => setName(event.target.value)} required />
        <button className="min-h-10 rounded-md bg-neutral-900 px-3 text-sm text-white" type="submit">
          Add
        </button>
        <label className="min-h-10 cursor-pointer rounded-md border border-neutral-300 px-3 py-2 text-sm">
          Import CSV
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
            }}
          />
        </label>
      </form>
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input min-h-10 w-full max-w-sm" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="input min-h-10" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="all">All types</option>
          <option value="VENDOR">Vendor</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="PARTNER">Partner</option>
        </select>
        <select className="input min-h-10" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>
      {message && <p className="mb-3 text-sm text-neutral-600">{message}</p>}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, shown).map((partner) => (
              <tr key={partner.id} className="border-b border-neutral-100">
                <td className="px-4 py-3">
                  <Link href={`/partners/${partner.id}`} prefetch={false} className="font-medium underline">
                    {partner.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{partner.kind}</td>
                <td className="px-4 py-3">{partner.contactName || "—"}</td>
                <td className="px-4 py-3">{partner.email || "—"}</td>
                <td className="px-4 py-3">{partner.status}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No partners yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {shown < visible.length && (
        <button type="button" className="mt-3 min-h-10 rounded-md border px-3 text-sm" onClick={() => setShown((count) => count + PAGE_SIZE)}>
          Show more
        </button>
      )}
    </div>
  );
}
