import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { presentClientJson, presentDeal } from "@/lib/present";
import { PartnerEditor } from "@/components/partner-editor";

export const dynamic = "force-dynamic";

export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = await prisma.partner.findUnique({
    where: { id },
    include: { links: true },
  });
  if (!partner) notFound();
  const [deals, contacts] = await Promise.all([
    prisma.deal.findMany({ include: { contact: true }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.contact.findMany({ orderBy: { lastName: "asc" }, take: 200 }),
  ]);
  return (
    <div className="p-6">
      <p className="mb-3 text-xs">
        <Link href="/partners" className="underline">
          Partners
        </Link>
      </p>
      <PartnerEditor
        partner={presentClientJson(partner)}
        deals={deals.map((deal) => ({ id: deal.id, label: presentDeal(deal).displayName }))}
        contacts={presentClientJson(contacts).map((contact) => ({
          id: contact.id,
          label: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
        }))}
      />
    </div>
  );
}
