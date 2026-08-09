import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Public endpoint the Tidy Nest website form (or an email-parsing
// integration, Phase 2) posts new leads to. Protected by a shared secret
// rather than staff login since the caller is the website, not a person.
const intakeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  serviceType: z
    .enum(["ORGANIZING", "RELOCATION", "HOME_MANAGEMENT", "HOLIDAY_BOX", "MAINTENANCE", "OTHER"])
    .optional(),
  detailsOfProject: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  source: z.string().optional(), // free text from the form; normalized below
});

function normalizeSource(raw?: string) {
  if (!raw) return "WEBSITE" as const;
  const s = raw.trim().toLowerCase();
  if (s.includes("social")) return "SOCIAL_MEDIA" as const;
  if (s.includes("referr") || s.includes("friend")) return "REFERRAL" as const;
  if (s.includes("magazine")) return "MAGAZINE" as const;
  if (s.includes("ad") || s.includes("article")) return "ONLINE_AD" as const;
  if (s.includes("google")) return "GOOGLE" as const;
  return "WEBSITE" as const;
}

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-intake-key");
  if (!process.env.LEAD_INTAKE_SECRET || key !== process.env.LEAD_INTAKE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = intakeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const contact = await prisma.contact.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state,
    },
  });

  const deal = await prisma.deal.create({
    data: {
      contactId: contact.id,
      stage: "NEW_LEAD",
      title: data.title,
      serviceType: data.serviceType,
      detailsOfProject: data.detailsOfProject,
      source: normalizeSource(data.source),
      sourceDetail: data.source,
    },
  });

  return NextResponse.json({ ok: true, dealId: deal.id }, { status: 201 });
}
