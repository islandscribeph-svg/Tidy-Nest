import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { presentContact, presentDeal } from "@/lib/present";
import { contactSearchLabel, searchContacts, searchDeals } from "@/lib/search";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("q") ?? "";
  const [deals, contacts] = await Promise.all([
    prisma.deal.findMany({
      include: { contact: true },
      orderBy: { updatedAt: "desc" },
      take: 400,
    }),
    prisma.contact.findMany({ orderBy: { updatedAt: "desc" }, take: 400 }),
  ]);

  const dealHits = searchDeals(deals.map((deal) => presentDeal(deal)), query).map((deal) => ({
    id: deal.id,
    label: deal.displayName || "Project",
    stage: deal.stage,
    href: `/pipeline?deal=${deal.id}`,
  }));
  const contactHits = searchContacts(contacts.map((contact) => presentContact(contact)), query).map((contact) => ({
    id: contact.id,
    label: contactSearchLabel(contact),
    href: `/clients/${contact.id}`,
  }));

  return NextResponse.json({ deals: dealHits, contacts: contactHits });
}
