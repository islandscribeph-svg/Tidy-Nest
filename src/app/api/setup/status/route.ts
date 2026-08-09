import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSetupKey } from "@/lib/setup-auth";
import { corsJson, corsPreflight } from "@/lib/cors";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: NextRequest) {
  if (!checkSetupKey(req)) {
    return corsJson({ error: "Unauthorized" }, { status: 401 });
  }

  const [users, deals, contacts] = await Promise.all([
    prisma.user.count(),
    prisma.deal.count(),
    prisma.contact.count(),
  ]);

  return corsJson({ users, deals, contacts });
}
