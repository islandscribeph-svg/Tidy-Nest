import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isMaskedEmail, preserveStoredText } from "@/lib/alias";
import { logActivity } from "@/lib/activity";
import { nextEditedFields, valuesDiffer } from "@/lib/field-edits";
import { presentContact } from "@/lib/present";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().nullable().optional(),
  email: z
    .string()
    .refine((value) => value === "" || z.string().email().safeParse(value).success || isMaskedEmail(value))
    .nullable()
    .optional(),
  phone: z.string().nullable().optional(),
  streetAddress: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  driveFolderUrl: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = { ...parsed.data };
  const textKeys = ["firstName", "lastName", "email", "phone", "streetAddress", "city", "state", "company", "notes", "driveFolderUrl"] as const;
  for (const key of textKeys) {
    if (data[key] === undefined) continue;
    data[key] = preserveStoredText(data[key], existing[key]) as never;
  }

  const changes = textKeys.flatMap((field) => {
    if (data[field] === undefined || !valuesDiffer(field, existing[field], data[field])) return [];
    return [{ field, value: data[field], previous: existing[field] }];
  });
  const imported =
    existing.importedValues && typeof existing.importedValues === "object" && !Array.isArray(existing.importedValues)
      ? (existing.importedValues as Record<string, unknown>)
      : null;

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...data,
      email: data.email === "" ? null : data.email,
      editedFields: nextEditedFields(
        existing.editedFields,
        imported,
        changes.map((change) => ({ field: change.field, value: change.value })),
      ),
    },
  });

  for (const change of changes) {
    await logActivity(prisma, {
      userId: session.userId,
      action: "edit",
      recordType: "contact",
      recordId: contact.id,
      field: change.field,
      oldValue: change.previous,
      newValue: change.value,
    });
  }

  return NextResponse.json(presentContact(contact));
}
