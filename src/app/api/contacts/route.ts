import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { presentContact } from "@/lib/present";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contacts = await prisma.contact.findMany({
    include: { deals: { select: { id: true, stage: true, serviceType: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(contacts.map((contact) => presentContact(contact)));
}
