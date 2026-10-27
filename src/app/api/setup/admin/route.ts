import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { checkSetupKey } from "@/lib/setup-auth";
import { MAX_STAFF_USERS, staffCreateError } from "@/lib/staff-users";
import { corsJson, corsPreflight } from "@/lib/cors";

// One-time bootstrap endpoint: creates the first admin login. Self-disables
// once any user exists, so it's safe to leave deployed rather than needing
// to be removed after use.
const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  if (!checkSetupKey(req)) {
    return corsJson({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.user.findMany({ select: { email: true } });
  if (existing.length >= MAX_STAFF_USERS) {
    return corsJson({ error: "Setup already completed — both staff accounts exist." }, { status: 409 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return corsJson({ error: parsed.error.flatten() }, { status: 400 });
  }

  const name = parsed.data.name;
  const email = parsed.data.email.toLowerCase();
  const createError = staffCreateError({ email, existingEmails: existing.map((user) => user.email) });
  if (createError) {
    return corsJson({ error: createError }, { status: existing.some((user) => user.email.toLowerCase() === email) ? 409 : 403 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "ADMIN" },
  });

  return corsJson({ id: user.id, email: user.email }, { status: 201 });
}
