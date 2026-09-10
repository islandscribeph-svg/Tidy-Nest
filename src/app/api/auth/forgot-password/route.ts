import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

const GENERIC_MESSAGE = "If an account exists for that email, a reset link has been sent.";

// Always returns the same generic message regardless of whether the email
// matches an account, so this can't be used to enumerate valid logins.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    // A fresh request invalidates any still-outstanding tokens for this
    // user, so only the most recently emailed link works.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    const resetUrl = `${req.nextUrl.origin}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
      console.error("sendPasswordResetEmail failed:", err);
    });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
