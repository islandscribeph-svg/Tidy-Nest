import { prisma } from "@/lib/prisma";
import { formatCalendarDate } from "@/lib/eastern-time";
import { presentContact, presentDeal } from "@/lib/present";
import { SERVICE_TYPE_LABELS, projectDate } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    include: {
      deals: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold text-neutral-900">Contacts</h1>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
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
            {contacts.map((raw) => {
              const c = presentContact(raw);
              return (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2 align-top font-medium text-neutral-900">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-2 align-top text-neutral-600">{c.email || "—"}</td>
                  <td className="px-4 py-2 align-top text-neutral-600">{c.phone || "—"}</td>
                  <td className="px-4 py-2 align-top text-neutral-600">
                    {[c.city, c.state].filter(Boolean).join(", ") || c.cityState || "—"}
                  </td>
                  <td className="px-4 py-2 align-top text-neutral-600">
                    {c.deals.length === 0 ? (
                      "—"
                    ) : (
                      <ul className="space-y-1">
                        {c.deals.map((deal) => {
                          const shown = presentDeal({ ...deal, contact: c });
                          const date = formatCalendarDate(projectDate(shown));
                          return (
                            <li key={deal.id}>
                              {deal.serviceType ? (
                                <span className="font-medium text-neutral-800">{SERVICE_TYPE_LABELS[deal.serviceType]}</span>
                              ) : (
                                <span className="text-neutral-400">No service</span>
                              )}
                              {" — "}
                              {shown.displayName}
                              {date && <span className="text-neutral-400"> ({date})</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No contacts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
