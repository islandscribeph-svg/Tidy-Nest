import type { Prisma, PrismaClient } from "@prisma/client";
import { activityValue } from "@/lib/field-edits";

type Writer = PrismaClient | Prisma.TransactionClient;

export async function logActivity(
  db: Writer,
  event: {
    userId?: string | null;
    action: string;
    recordType?: string | null;
    recordId?: string | null;
    field?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
  },
) {
  if (event.field && /password|secret|token|hash/i.test(event.field)) return;
  await db.activityEvent.create({
    data: {
      userId: event.userId ?? null,
      action: event.action,
      recordType: event.recordType ?? null,
      recordId: event.recordId ?? null,
      field: event.field ?? null,
      oldValue: activityValue(event.field, event.oldValue),
      newValue: activityValue(event.field, event.newValue),
    },
  });
}
