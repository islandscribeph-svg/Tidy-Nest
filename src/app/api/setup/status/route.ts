import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSetupKey } from "@/lib/setup-auth";
import { corsJson, corsPreflight } from "@/lib/cors";
import { presentClientJson } from "@/lib/present";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: NextRequest) {
  if (!checkSetupKey(req)) {
    return corsJson({ error: "Unauthorized" }, { status: 401 });
  }

  const [userEmails, deals, contacts] = await Promise.all([
    prisma.user.findMany({ select: { email: true, name: true, role: true }, orderBy: { email: "asc" } }),
    prisma.deal.count(),
    prisma.contact.count(),
  ]);

  return corsJson(presentClientJson({ users: userEmails.length, userEmails, deals, contacts }));
}
