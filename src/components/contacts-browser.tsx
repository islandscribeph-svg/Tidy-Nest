"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExportLinks } from "@/components/export-links";
import { SavedFilterBar } from "@/components/saved-filter-bar";
import { textMatch } from "@/lib/filter-presets";

export type ContactRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  place: string;
  deals: { id: string; service: string | null; displayName: string; date: string | null }[];
};

const PAGE_SIZE = 40;

export function ContactsBrowser({ contacts }: { contacts: ContactRow[] }) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = useMemo(
    () =>
      contacts.filter((contact) =>
        textMatch(query, [
          contact.firstName,
          contact.lastName,
          contact.email,
          contact.phone,
          contact.place,
          ...contact.deals.map((deal) => deal.displayName),
        ]),
      ),
    [contacts, query],
  );
  const page = visible.slice(0, shown);

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-neutral-900">Contacts</h1>
        <ExportLinks href="/api/exports/contacts" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="input min-h-10 w-full max-w-sm"
          placeholder="Search contacts"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShown(PAGE_SIZE);
          }}
        />
        <SavedFilterBar
          page="contacts"
          query={{ q: query }}
          onApply={(next) => {
            setQuery(next.q ?? "");
            setShown(PAGE_SIZE);
          }}
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">City / State</th>
              <th className="px-4 py-2 font-medium">Projects</th>
            </tr>
          </thead>
          <tbody>
            {page.map((contact) => (
              <tr key={contact.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 align-top font-medium text-neutral-900">
                  <Link href={`/clients/${contact.id}`} prefetch={false} className="underline">
                    {contact.firstName} {contact.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 align-top text-neutral-600">{contact.email || "—"}</td>
                <td className="px-4 py-3 align-top text-neutral-600">{contact.phone || "—"}</td>
                <td className="px-4 py-3 align-top text-neutral-600">{contact.place || "—"}</td>
                <td className="px-4 py-3 align-top text-neutral-600">
                  {contact.deals.length === 0 ? (
                    "—"
                  ) : (
                    <ul className="space-y-1">
                      {contact.deals.map((deal) => (
                        <li key={deal.id}>
                          {deal.service ? <span className="font-medium text-neutral-800">{deal.service}</span> : "No service"}
                          {" — "}
                          {deal.displayName}
                          {deal.date && <span className="text-neutral-400"> ({deal.date})</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
            {page.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No contacts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {shown < visible.length && (
        <button type="button" className="mt-3 min-h-10 rounded-md border border-neutral-300 px-3 text-sm" onClick={() => setShown((count) => count + PAGE_SIZE)}>
          Show more ({visible.length - shown} left)
        </button>
      )}
    </div>
  );
}
