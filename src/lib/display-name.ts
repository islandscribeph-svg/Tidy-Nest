const WORKBOOK_RE = /^(.+?)_(.+)_([A-Za-z]{3}\d{4})_Invoice_Workbook$/i;

export function projectFromWorkbookFileName(fileName: string | null | undefined): string | null {
  if (!fileName) return null;
  const base = fileName.split("/").pop()?.replace(/\.(xlsx|xls|csv|gsheet)$/i, "") ?? fileName;
  const match = WORKBOOK_RE.exec(base.trim());
  if (!match) return null;
  const project = match[2].replace(/_/g, " ").trim();
  return project || null;
}

export function projectFromDateTimeText(text: string | null | undefined): string | null {
  if (!text) return null;
  const parts = text.split(" - ");
  if (parts.length < 2) return null;
  const tail = parts.slice(1).join(" - ").trim();
  if (tail.length < 3 || tail.length > 80) return null;
  return tail;
}

export function projectFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const line = notes
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find((s) => s.length >= 3 && s.length <= 80);
  return line ?? null;
}

export function clientLabel(input: {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
}): string {
  return (input.company || input.lastName || input.firstName || "Unnamed").trim() || "Unnamed";
}

export function buildDisplayName(input: {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  title?: string | null;
  worksheetFileName?: string | null;
  projectNotes?: string | null;
  projectDateTimeText?: string | null;
}): string {
  const client = clientLabel(input);
  const project =
    projectFromWorkbookFileName(input.worksheetFileName) ||
    input.title?.trim() ||
    projectFromDateTimeText(input.projectDateTimeText) ||
    projectFromNotes(input.projectNotes) ||
    null;
  if (project && project.toLowerCase() !== client.toLowerCase()) return `${client} – ${project}`;
  return client;
}

export function formatInvoiceName(invoiceNumber: string, client: string, description: string): string {
  return `Tidy Nest Invoice ${invoiceNumber}_${client}_${description}`;
}

export function formatWorkbookName(lastName: string, project: string, monYear: string): string {
  return `${lastName}_${project}_${monYear}_Invoice_Workbook`;
}
