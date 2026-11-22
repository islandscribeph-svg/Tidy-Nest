import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { presentClientJson } from "@/lib/present";

const schema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Only an admin can change roles." }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick Admin or Member." }, { status: 400 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === parsed.data.role) {
    return NextResponse.json(presentClientJson({ id: user.id, name: user.name, email: user.email, role: user.role }));
  }

  if (user.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) return NextResponse.json({ error: "Keep at least one admin." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: parsed.data.role },
    select: { id: true, name: true, email: true, role: true },
  });
  await logActivity(prisma, {
    userId: session.userId,
    action: "edit",
    recordType: "user",
    recordId: user.id,
    field: "role",
    oldValue: user.role,
    newValue: updated.role,
  });
  return NextResponse.json(presentClientJson(updated));
}
