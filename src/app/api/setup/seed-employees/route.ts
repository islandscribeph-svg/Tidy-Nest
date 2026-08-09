import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSetupKey } from "@/lib/setup-auth";
import { corsJson, corsPreflight } from "@/lib/cors";

// One-time bootstrap endpoint: creates the 5 named employees/contractors.
// Self-disables once any Employee exists, so it's safe to leave deployed —
// rates default to 0 and need to be filled in via the Employees page since
// real payroll numbers shouldn't be guessed at.
const NAMES = ["Peps Bustamante", "Kelly", "Molly", "Jared", "Shannon"];

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  if (!checkSetupKey(req)) {
    return corsJson({ error: "Unauthorized" }, { status: 401 });
  }

  const existingCount = await prisma.employee.count();
  if (existingCount > 0) {
    return corsJson({ error: "Setup already completed — employees already exist." }, { status: 409 });
  }

  await prisma.employee.createMany({
    data: NAMES.map((name) => ({ name, type: "CONTRACTOR" as const, hourlyRate: 0 })),
  });

  return corsJson({ ok: true, created: NAMES.length }, { status: 201 });
}
