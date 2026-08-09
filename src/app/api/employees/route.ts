import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employees = await prisma.employee.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(employees);
}

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["EMPLOYEE", "CONTRACTOR"]).default("CONTRACTOR"),
  hourlyRate: z.number().min(0),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid employee" }, { status: 400 });

  const employee = await prisma.employee.create({ data: parsed.data });
  return NextResponse.json(employee, { status: 201 });
}
