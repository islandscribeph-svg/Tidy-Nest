import { textMatch } from "@/lib/filter-presets";

export type SearchDeal = {
  id: string;
  displayName?: string;
  title?: string | null;
  stage: string;
  contact: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    city?: string | null;
  };
};

export type SearchContact = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
};

export function searchDeals(deals: SearchDeal[], query: string, limit = 8): SearchDeal[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  return deals
    .filter((deal) =>
      textMatch(trimmed, [
        deal.displayName,
        deal.title,
        deal.contact.firstName,
        deal.contact.lastName,
        deal.contact.email,
        deal.contact.city,
      ]),
    )
    .slice(0, limit);
}

export function searchContacts(contacts: SearchContact[], query: string, limit = 8): SearchContact[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  return contacts
    .filter((contact) =>
      textMatch(trimmed, [contact.firstName, contact.lastName, contact.email, contact.company, contact.phone]),
    )
    .slice(0, limit);
}

export function contactSearchLabel(contact: SearchContact): string {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  return name || contact.company || "Unnamed contact";
}
