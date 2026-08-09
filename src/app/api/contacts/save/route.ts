import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const saveContactSchema = z.object({
  dealId: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  company: z.string().optional(),
  serviceType: z
    .enum(["ORGANIZING", "RELOCATION", "HOME_MANAGEMENT", "HOLIDAY_BOX", "MAINTENANCE", "OTHER"])
    .optional(),
  // Set true once the user has reviewed a duplicate match and still wants
  // to link to it, or explicitly chosen to skip linking, per the dedupe flow.
  useExistingContactId: z.string().optional(),
  skipDuplicateCheck: z.boolean().optional(),
});

const REQUIRED_FIELDS_MSG =
  "Name, an email or phone number, and a service type are required to save this contact.";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = saveContactSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (!data.email && !data.phone) {
    return NextResponse.json({ error: REQUIRED_FIELDS_MSG, field: "email" }, { status: 422 });
  }
  if (!data.serviceType) {
    return NextResponse.json({ error: REQUIRED_FIELDS_MSG, field: "serviceType" }, { status: 422 });
  }

  const deal = await prisma.deal.findUnique({ where: { id: data.dealId } });
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  // Duplicate check: look for another contact with the same email/phone,
  // excluding the contact already linked to this deal, before we save.
  if (!data.useExistingContactId && !data.skipDuplicateCheck) {
    const orConditions = [];
    if (data.email) orConditions.push({ email: data.email });
    if (data.phone) orConditions.push({ phone: data.phone });

    const candidate = orConditions.length
      ? await prisma.contact.findFirst({
          where: { AND: [{ id: { not: deal.contactId } }, { OR: orConditions }] },
        })
      : null;

    if (candidate) {
      return NextResponse.json(
        {
          duplicate: true,
          candidate: {
            id: candidate.id,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
            phone: candidate.phone,
          },
        },
        { status: 409 },
      );
    }
  }

  const contactId = data.useExistingContactId ?? deal.contactId;

  const contact = await prisma.contact.update({
    where: { id: contactId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || undefined,
      phone: data.phone,
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state,
      company: data.company,
    },
  });

  const updatedDeal = await prisma.deal.update({
    where: { id: data.dealId },
    data: {
      contactId,
      serviceType: data.serviceType,
      contactSaved: true,
    },
    include: { contact: true },
  });

  return NextResponse.json({ contact, deal: updatedDeal });
}
