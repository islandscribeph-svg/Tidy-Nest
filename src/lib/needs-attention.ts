import type { ProblemCode } from "@/lib/data-problems";
import { financialEditError } from "@/lib/field-edits";

export function attentionTitle(code: ProblemCode): string {
  switch (code) {
    case "duplicate_invoice":
      return "Two projects share an invoice number";
    case "closed_missing_value":
      return "Finished project is missing a price";
    case "closed_missing_date":
      return "Finished project is missing an end date";
    case "closed_missing_drive":
      return "Finished project is missing a Drive folder";
    case "missing_worksheet":
      return "Worksheet is missing";
    case "worksheet_name_mismatch":
      return "Worksheet name does not match the client";
    case "pdf_name_mismatch":
      return "Invoice file name does not match the client";
    case "died_with_invoice":
      return "Died project still has an invoice number";
    case "unparseable_date":
      return "A date could not be read";
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}

export function attentionHelp(code: ProblemCode): string {
  switch (code) {
    case "duplicate_invoice":
      return "Open each project and give them different invoice numbers.";
    case "closed_missing_value":
      return "An admin can add the closed price from the project panel.";
    case "closed_missing_date":
      return "Use the project date when you have one, or open the project and type the end date.";
    case "closed_missing_drive":
      return "Open the project and paste the Google Drive folder link.";
    case "missing_worksheet":
      return "Open the project and add the worksheet link or file name.";
    case "worksheet_name_mismatch":
      return "Open the project and check the worksheet file name.";
    case "pdf_name_mismatch":
      return "Open the project and check the invoice file name.";
    case "died_with_invoice":
      return "An admin can clear the invoice number after Shannon approves it.";
    case "unparseable_date":
      return "Open the project and replace the date that could not be read.";
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}

export type AttentionFixPlan =
  | { ok: true; field: "dateClosed"; value: Date; action: "edit" }
  | { ok: true; field: "invoiceNumber"; value: null; action: "financial" }
  | { ok: false; status: number; error: string };

export function planAttentionFix(input: {
  code: ProblemCode;
  role: string;
  approval: unknown;
  projectStartDate: Date | null;
  consultDate: Date | null;
}): AttentionFixPlan {
  if (input.code === "closed_missing_date") {
    const value = input.projectStartDate ?? input.consultDate;
    if (!value) {
      return { ok: false, status: 400, error: "There is no project date to copy. Open the project and add an end date." };
    }
    return { ok: true, field: "dateClosed", value, action: "edit" };
  }
  if (input.code === "died_with_invoice") {
    const blocked = financialEditError({ role: input.role, approval: input.approval, changing: true });
    if (blocked) return { ok: false, status: blocked.status, error: blocked.error };
    return { ok: true, field: "invoiceNumber", value: null, action: "financial" };
  }
  return { ok: false, status: 400, error: "Open the project to fix this." };
}
