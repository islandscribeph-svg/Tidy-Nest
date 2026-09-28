import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DataImportPanel } from "@/components/data-import-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/pipeline");

  const [deals, contacts] = await Promise.all([prisma.deal.count(), prisma.contact.count()]);

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="mb-4 text-lg font-semibold text-neutral-900">Settings</h1>
      <DataImportPanel initialCounts={{ deals, contacts }} />
    </div>
  );
}
