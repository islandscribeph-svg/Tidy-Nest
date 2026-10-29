export const SHANNON_APPROVAL = "Approved by Shannon";

export const FINANCIAL_FIELDS = [
  "estimatedDealValue",
  "closedDealValue",
  "consultFee",
  "invoiceNumber",
  "consultInvoiceNumber",
] as const;

export type FinancialField = (typeof FINANCIAL_FIELDS)[number];

const SECRET_FIELD = /password|secret|token|hash/i;

export function isFinancialField(field: string): field is FinancialField {
  return (FINANCIAL_FIELDS as readonly string[]).includes(field);
}

export function valuesDiffer(field: string, previous: unknown, next: unknown): boolean {
  if (previous == null && (next == null || next === "")) return false;
  if (next == null && (previous == null || previous === "")) return false;
  if (isFinancialField(field) || field.endsWith("Value") || field.endsWith("Fee")) {
    const left = previous == null || previous === "" ? null : Number(previous);
    const right = next == null || next === "" ? null : Number(next);
    return left !== right;
  }
  const leftDate = previous instanceof Date ? previous.toISOString() : previous;
  const rightDate = next instanceof Date ? next.toISOString() : next;
  return String(leftDate ?? "") !== String(rightDate ?? "");
}

export function nextEditedFields(
  edited: string[],
  imported: Record<string, unknown> | null | undefined,
  changes: { field: string; value: unknown }[],
): string[] {
  if (!imported) return edited;
  const set = new Set(edited);
  for (const change of changes) {
    if (valuesDiffer(change.field, imported[change.field], change.value)) set.add(change.field);
    else set.delete(change.field);
  }
  return [...set];
}

export function financialEditError(input: {
  role: string;
  approval: unknown;
  changing: boolean;
}): { status: number; error: string } | null {
  if (!input.changing) return null;
  if (input.role !== "ADMIN") return { status: 403, error: "Only an admin can change financial fields." };
  if (input.approval !== SHANNON_APPROVAL) {
    return { status: 400, error: "This change should be approved by Shannon." };
  }
  return null;
}

export function activityValue(field: string | null | undefined, value: unknown): string | null {
  if (field && SECRET_FIELD.test(field)) return null;
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  if (SECRET_FIELD.test(text) && text.length > 40) return null;
  return text.slice(0, 2000);
}
