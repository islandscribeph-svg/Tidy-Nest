import { prisma } from "@/lib/prisma";
import { presentClientJson } from "@/lib/present";
import { PartnersBrowser, type PartnerRow } from "@/components/partners-browser";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const partners = await prisma.partner.findMany({ orderBy: { name: "asc" } });
  return <PartnersBrowser partners={presentClientJson(partners) as PartnerRow[]} />;
}
