import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

function cells(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      out.push(current.trim());
      current = "";
    } else current += char;
  }
  out.push(current.trim());
  return out;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const text = await req.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const [header, ...rows] = lines;
  if (!header) return NextResponse.json({ error: "The CSV is empty." }, { status: 400 });
  const columns = cells(header).map((column) => column.toLowerCase());
  const index = (name: string) => columns.indexOf(name);
  let created = 0;
  for (const row of rows) {
    const values = cells(row);
    const name = values[index("name")] ?? "";
    if (!name) continue;
    const kind = (values[index("type")] || "VENDOR").toUpperCase();
    await prisma.partner.create({
      data: {
        name,
        kind: kind === "SUPPLIER" || kind === "PARTNER" ? kind : "VENDOR",
        contactName: values[index("contact")] || null,
        email: values[index("email")] || null,
        phone: values[index("phone")] || null,
        website: values[index("website")] || null,
        address: values[index("address")] || null,
        notes: values[index("notes")] || null,
        status: (values[index("status")] || "").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        tags: (values[index("tags")] || "").split("|").map((tag) => tag.trim()).filter(Boolean),
        driveUrl: values[index("drive")] || null,
        slackUrl: values[index("slack")] || null,
      },
    });
    created += 1;
  }
  await logActivity(prisma, { userId: session.userId, action: "import", recordType: "partner", field: "csv", newValue: String(created) });
  return NextResponse.json({ created });
}
