import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const noteSchema = z.object({ body: z.string().min(1) });

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = noteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid note" }, { status: 400 });

  const note = await prisma.note.create({
    data: { dealId: id, authorId: session.userId, body: parsed.data.body },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json(note, { status: 201 });
}
