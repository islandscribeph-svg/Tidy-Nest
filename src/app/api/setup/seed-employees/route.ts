import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSetupKey } from "@/lib/setup-auth";
import { corsJson, corsPreflight } from "@/lib/cors";

// Optional bootstrap for field staff names. Names come from the request body
// or SEED_EMPLOYEE_NAMES. Nothing is hardcoded. Self-disables once any
// employee exists. Rates default to 0.

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

  const body = (await req.json().catch(() => null)) as { names?: unknown } | null;
  const fromBody = Array.isArray(body?.names) ? body.names.filter((name): name is string => typeof name === "string") : [];
  const fromEnv = (process.env.SEED_EMPLOYEE_NAMES ?? "").split(",").map((name) => name.trim()).filter(Boolean);
  const names = (fromBody.length ? fromBody : fromEnv).map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) {
    return corsJson({ error: "Pass names or set SEED_EMPLOYEE_NAMES." }, { status: 400 });
  }

  await prisma.employee.createMany({
    data: names.map((name) => ({ name, type: "CONTRACTOR" as const, hourlyRate: 0 })),
  });

  return corsJson({ ok: true, created: names.length }, { status: 201 });
}
