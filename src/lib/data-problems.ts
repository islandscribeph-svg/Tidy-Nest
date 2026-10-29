import type { Stage } from "@prisma/client";
import { redactText, type AliasRule, getAliasRules } from "@/lib/alias";
import { buildDisplayName } from "@/lib/display-name";
import { stageFromMondayStatus } from "@/lib/status-map";

export type ProblemCode =
  | "duplicate_invoice"
  | "closed_missing_value"
  | "closed_missing_date"
  | "closed_missing_drive"
  | "missing_worksheet"
  | "worksheet_name_mismatch"
  | "pdf_name_mismatch"
  | "died_with_invoice"
  | "unparseable_date";

export type ProblemSubject = {
  id: string;
  stage: Stage;
  subStatus: string | null;
  invoiceNumber: string | null;
  consultInvoiceNumber?: string | null;
  closedDealValue: unknown;
  dateClosed: Date | string | null;
  driveFolderUrl?: string | null;
  worksheetUrl?: string | null;
  worksheetFileName?: string | null;
  invoiceFileName?: string | null;
  dateParseIssues?: string | null;
  title?: string | null;
  projectNotes?: string | null;
  projectDateTimeText?: string | null;
  contact: { firstName?: string | null; lastName?: string | null; company?: string | null };
};

export type DataProblem = {
  id: string;
  code: ProblemCode;
  dealId: string;
  displayName: string;
  detail: string;
};

export function problemLabel(code: ProblemCode): string {
  switch (code) {
    case "duplicate_invoice":
      return "Duplicate invoice number";
    case "closed_missing_value":
      return "Closed item missing a value";
    case "closed_missing_date":
      return "Closed item missing a date";
    case "closed_missing_drive":
      return "Closed item missing a Drive link";
    case "missing_worksheet":
      return "Missing worksheet";
    case "worksheet_name_mismatch":
      return "Worksheet name does not match the client";
    case "pdf_name_mismatch":
      return "Invoice PDF name does not match the client";
    case "died_with_invoice":
      return "Died item has an invoice number";
    case "unparseable_date":
      return "Date could not be read";
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}

function tokens(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function identityTokens(deal: ProblemSubject, rules: AliasRule[]): Set<string> {
  const contact = deal.contact;
  const raw = [contact.firstName, contact.lastName, contact.company].flatMap((part) => tokens(part));
  const blob = `${contact.firstName ?? ""} ${contact.lastName ?? ""} ${contact.company ?? ""}`.toLowerCase();
  const extra = rules.flatMap((rule) => (blob.includes(rule.match.toLowerCase()) ? tokens(rule.display) : []));
  return new Set([...raw, ...extra]);
}

function sharesToken(left: string[], identity: Set<string>): boolean {
  return left.some((token) => identity.has(token));
}

function worksheetClientTokens(fileName: string): string[] {
  const base = fileName.split("/").pop()?.replace(/\.(xlsx|xls|csv|gsheet)$/i, "") ?? fileName;
  const match = /^(.+?)_.+_([A-Za-z]{3}\d{4})_Invoice_Workbook$/i.exec(base.trim());
  const client = match?.[1] ?? base.split("_")[0] ?? base;
  return tokens(client);
}

function pdfClientTokens(fileName: string): string[] {
  const base = fileName.replace(/\.pdf$/i, "");
  let rest = base;
  const tidy = rest.match(/^Tidy Nest Invoice\s+\d+[_\s-]+(.*)$/i);
  if (tidy) rest = tidy[1];
  else {
    const numbered = rest.match(/^\d+[_\s-]+(.*)$/);
    if (numbered) rest = numbered[1];
  }
  const beforeDate = rest.split(
    /[_\s]+(?=(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s_]*\d{4})/i,
  )[0];
  return tokens(beforeDate);
}

function missingMoney(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  return false;
}

function invoiceKey(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function shownName(deal: ProblemSubject, rules: AliasRule[]): string {
  return buildDisplayName({
    firstName: redactText(deal.contact.firstName, rules),
    lastName: deal.contact.lastName ? redactText(deal.contact.lastName, rules) : null,
    company: deal.contact.company ? redactText(deal.contact.company, rules) : null,
    title: deal.title ? redactText(deal.title, rules) : null,
    worksheetFileName: deal.worksheetFileName ? redactText(deal.worksheetFileName, rules) : null,
    projectNotes: deal.projectNotes ? redactText(deal.projectNotes, rules) : null,
    projectDateTimeText: deal.projectDateTimeText ? redactText(deal.projectDateTimeText, rules) : null,
  });
}

export function findDataProblems(deals: ProblemSubject[], rules: AliasRule[] = getAliasRules()): DataProblem[] {
  const problems: DataProblem[] = [];
  const byInvoice = new Map<string, ProblemSubject[]>();

  for (const deal of deals) {
    const key = invoiceKey(deal.invoiceNumber);
    if (!key) continue;
    const group = byInvoice.get(key) ?? [];
    group.push(deal);
    byInvoice.set(key, group);
  }

  for (const [key, group] of byInvoice) {
    if (group.length < 2) continue;
    for (const deal of group) {
      problems.push({
        id: `duplicate_invoice:${deal.id}:${key}`,
        code: "duplicate_invoice",
        dealId: deal.id,
        displayName: shownName(deal, rules),
        detail: redactText(`Invoice ${deal.invoiceNumber} is on ${group.length} items.`, rules),
      });
    }
  }

  for (const deal of deals) {
    const name = shownName(deal, rules);
    const died = deal.stage === "DEAD" || stageFromMondayStatus(deal.subStatus) === "DEAD";
    const closed = deal.stage === "CLOSED" || stageFromMondayStatus(deal.subStatus) === "CLOSED";
    const inProgress = deal.stage === "IN_PROGRESS" || stageFromMondayStatus(deal.subStatus) === "IN_PROGRESS";

    if (closed && missingMoney(deal.closedDealValue)) {
      problems.push({
        id: `closed_missing_value:${deal.id}`,
        code: "closed_missing_value",
        dealId: deal.id,
        displayName: name,
        detail: "Closed item has no closed deal value.",
      });
    }
    if (closed && !deal.dateClosed) {
      problems.push({
        id: `closed_missing_date:${deal.id}`,
        code: "closed_missing_date",
        dealId: deal.id,
        displayName: name,
        detail: "Closed item has no date closed.",
      });
    }
    if (closed && !deal.driveFolderUrl?.trim()) {
      problems.push({
        id: `closed_missing_drive:${deal.id}`,
        code: "closed_missing_drive",
        dealId: deal.id,
        displayName: name,
        detail: "Closed item has no Client Drive link.",
      });
    }
    if ((closed || inProgress) && !deal.worksheetUrl?.trim() && !deal.worksheetFileName?.trim()) {
      problems.push({
        id: `missing_worksheet:${deal.id}`,
        code: "missing_worksheet",
        dealId: deal.id,
        displayName: name,
        detail: closed ? "Closed item has no worksheet." : "In progress item has no worksheet.",
      });
    }
    if (died && (invoiceKey(deal.invoiceNumber) || invoiceKey(deal.consultInvoiceNumber))) {
      problems.push({
        id: `died_with_invoice:${deal.id}`,
        code: "died_with_invoice",
        dealId: deal.id,
        displayName: name,
        detail: redactText(`Died item still has invoice ${deal.invoiceNumber || deal.consultInvoiceNumber}.`, rules),
      });
    }
    if (deal.dateParseIssues?.trim()) {
      problems.push({
        id: `unparseable_date:${deal.id}`,
        code: "unparseable_date",
        dealId: deal.id,
        displayName: name,
        detail: redactText(deal.dateParseIssues, rules),
      });
    }

    const identity = identityTokens(deal, rules);
    if (identity.size > 0 && deal.worksheetFileName) {
      const worksheetTokens = worksheetClientTokens(deal.worksheetFileName);
      if (worksheetTokens.length > 0 && !sharesToken(worksheetTokens, identity)) {
        problems.push({
          id: `worksheet_name_mismatch:${deal.id}`,
          code: "worksheet_name_mismatch",
          dealId: deal.id,
          displayName: name,
          detail: redactText(`Worksheet file “${deal.worksheetFileName}” does not match this client.`, rules),
        });
      }
    }
    if (identity.size > 0 && deal.invoiceFileName) {
      const pdfTokens = pdfClientTokens(deal.invoiceFileName);
      if (pdfTokens.length > 0 && !sharesToken(pdfTokens, identity)) {
        problems.push({
          id: `pdf_name_mismatch:${deal.id}`,
          code: "pdf_name_mismatch",
          dealId: deal.id,
          displayName: name,
          detail: redactText(`Invoice file “${deal.invoiceFileName}” does not match this client.`, rules),
        });
      }
    }
  }

  return problems;
}
