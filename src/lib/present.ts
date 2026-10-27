import { getAliasRules, redactText, type AliasRule } from "@/lib/alias";
import { buildDisplayName } from "@/lib/display-name";
import { toPlain } from "@/lib/serialize";

type ContactLike = {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  cityState?: string | null;
};

function redactMaybe(value: string | null | undefined, rules: AliasRule[]): string | null | undefined {
  if (value == null) return value;
  return redactText(value, rules);
}

export function presentContact<T extends ContactLike>(contact: T, rules: AliasRule[] = getAliasRules()): T {
  return {
    ...contact,
    firstName: redactText(contact.firstName, rules),
    lastName: redactMaybe(contact.lastName, rules),
    company: redactMaybe(contact.company, rules),
    email: redactMaybe(contact.email, rules),
    streetAddress: redactMaybe(contact.streetAddress, rules),
    notes: redactMaybe(contact.notes, rules),
    cityState: redactMaybe(contact.cityState, rules),
  };
}

export function presentDeal<T extends { contact: ContactLike; title?: string | null }>(
  deal: T,
  rules: AliasRule[] = getAliasRules(),
): T & { displayName: string } {
  const plain = toPlain(deal) as T & {
    worksheetFileName?: string | null;
    projectNotes?: string | null;
    projectDateTimeText?: string | null;
    detailsOfProject?: string | null;
    sourceDetail?: string | null;
    invoiceFileName?: string | null;
    dateParseIssues?: string | null;
    worksheetNotes?: string | null;
    notes?: { body?: string }[];
  };
  const contact = presentContact(plain.contact, rules);
  const title = redactMaybe(plain.title, rules) ?? null;
  const worksheetFileName = redactMaybe(plain.worksheetFileName, rules) ?? null;
  const projectNotes = redactMaybe(plain.projectNotes, rules) ?? null;
  const projectDateTimeText = redactMaybe(plain.projectDateTimeText, rules) ?? null;
  const displayName = buildDisplayName({
    firstName: contact.firstName,
    lastName: contact.lastName,
    company: contact.company,
    title,
    worksheetFileName,
    projectNotes,
    projectDateTimeText,
  });
  const notes = Array.isArray(plain.notes)
    ? plain.notes.map((note) => ({ ...note, body: note.body ? redactText(note.body, rules) : note.body }))
    : plain.notes;

  return {
    ...plain,
    contact,
    title,
    displayName,
    worksheetFileName,
    projectNotes,
    projectDateTimeText,
    detailsOfProject: redactMaybe(plain.detailsOfProject, rules),
    sourceDetail: redactMaybe(plain.sourceDetail, rules),
    invoiceFileName: redactMaybe(plain.invoiceFileName, rules),
    dateParseIssues: redactMaybe(plain.dateParseIssues, rules),
    worksheetNotes: redactMaybe(plain.worksheetNotes, rules),
    notes,
  };
}
