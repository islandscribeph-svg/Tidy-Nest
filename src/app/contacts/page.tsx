import { prisma } from "@/lib/prisma";
import { formatCalendarDate } from "@/lib/eastern-time";
import { presentContact, presentDeal } from "@/lib/present";
import { ContactsBrowser, type ContactRow } from "@/components/contacts-browser";
import { SERVICE_TYPE_LABELS, projectDate } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    include: { deals: { orderBy: { createdAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
  const rows: ContactRow[] = contacts.map((raw) => {
    const contact = presentContact(raw);
    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      place: [contact.city, contact.state].filter(Boolean).join(", ") || contact.cityState || "",
      deals: contact.deals.map((deal) => {
        const shown = presentDeal({ ...deal, contact });
        return {
          id: deal.id,
          service: deal.serviceType ? SERVICE_TYPE_LABELS[deal.serviceType] : null,
          displayName: shown.displayName,
          date: formatCalendarDate(projectDate(shown)),
        };
      }),
    };
  });
  return <ContactsBrowser contacts={rows} />;
}
