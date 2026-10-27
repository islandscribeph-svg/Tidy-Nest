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

const UNREDACTED_KEYS = new Set(["stage", "source", "serviceType", "role", "type", "status", "fileType"]);

function keepKey(key: string | undefined): boolean {
  if (!key) return false;
  return key === "id" || key.endsWith("Id") || UNREDACTED_KEYS.has(key);
}

function walk(value: unknown, rules: AliasRule[], key?: string): unknown {
  if (typeof value === "string") {
    if (keepKey(key)) return value;
    return redactText(value, rules);
  }
  if (Array.isArray(value)) return value.map((item) => walk(item, rules));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [childKey, child] of Object.entries(value as Record<string, unknown>)) {
      out[childKey] = walk(child, rules, childKey);
    }
    return out;
  }
  return value;
}

// Every string that can reach the browser, except ids and enum codes.
// Names, emails, notes, checklist labels, file names, and free text are included.
export function presentClientJson<T>(value: T, rules: AliasRule[] = getAliasRules()): T {
  return walk(toPlain(value), rules) as T;
}

export function presentContact<T extends ContactLike>(contact: T, rules: AliasRule[] = getAliasRules()): T {
  return presentClientJson(contact, rules);
}

export function presentDeal<T extends { contact: ContactLike; title?: string | null }>(
  deal: T,
  rules: AliasRule[] = getAliasRules(),
): T & { displayName: string } {
  const redacted = presentClientJson(deal, rules) as T & {
    contact: ContactLike;
    title?: string | null;
    worksheetFileName?: string | null;
    projectNotes?: string | null;
    projectDateTimeText?: string | null;
  };
  const displayName = buildDisplayName({
    firstName: redacted.contact?.firstName,
    lastName: redacted.contact?.lastName,
    company: redacted.contact?.company,
    title: redacted.title,
    worksheetFileName: redacted.worksheetFileName,
    projectNotes: redacted.projectNotes,
    projectDateTimeText: redacted.projectDateTimeText,
  });
  return { ...redacted, displayName };
}
