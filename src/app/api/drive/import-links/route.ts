import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { isGoogleDriveUrl } from "@/lib/drive-url";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const contacts = await prisma.contact.findMany({ include: { deals: { select: { driveFolderUrl: true } } } });
  let updated = 0;
  for (const contact of contacts) {
    if (contact.driveFolderUrl) continue;
    const link = contact.deals.find((deal) => deal.driveFolderUrl && isGoogleDriveUrl(deal.driveFolderUrl))?.driveFolderUrl;
    if (!link) continue;
    await prisma.contact.update({ where: { id: contact.id }, data: { driveFolderUrl: link } });
    updated += 1;
  }
  await logActivity(prisma, { userId: session.userId, action: "import", recordType: "contact", field: "driveFolderUrl", newValue: String(updated) });
  return NextResponse.json({ updated });
}
