import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSetupKey } from "@/lib/setup-auth";

export async function GET(req: NextRequest) {
  if (!checkSetupKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [users, deals, contacts] = await Promise.all([
    prisma.user.count(),
    prisma.deal.count(),
    prisma.contact.count(),
  ]);

  return NextResponse.json({ users, deals, contacts });
}
