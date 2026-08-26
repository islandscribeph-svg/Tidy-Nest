import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { checkSetupKey } from "@/lib/setup-auth";
import { corsJson, corsPreflight } from "@/lib/cors";

// Password reset for a forgotten admin login, gated by the same x-setup-key
// check as the other one-time setup routes. Unlike those, this doesn't
// self-disable once a user exists -- that's the whole point here -- but it
// doesn't widen access: anyone holding SESSION_SECRET could already forge a
// valid session cookie directly (it's the same key used to sign them), so
// they already have full app access without this endpoint.
const schema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8),
});

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  if (!checkSetupKey(req)) {
    return corsJson({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return corsJson({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return corsJson({ error: "No user with that email" }, { status: 404 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return corsJson({ ok: true, email: user.email });
}
