export type AliasRule = { match: string; display: string };

export function parseAliasMap(raw: string | undefined | null): { rules: AliasRule[]; error: string | null } {
  if (!raw?.trim()) return { rules: [], error: null };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { rules: [], error: "CLIENT_ALIAS_MAP must be a JSON object of raw names to display names." };
    }
    const rules: AliasRule[] = [];
    for (const [match, display] of Object.entries(parsed)) {
      if (typeof display !== "string" || !match.trim() || !display.trim()) continue;
      rules.push({ match: match.trim(), display: display.trim() });
    }
    rules.sort((a, b) => b.match.length - a.match.length);
    return { rules, error: null };
  } catch {
    return { rules: [], error: "CLIENT_ALIAS_MAP is not valid JSON." };
  }
}

export function getAliasRules(): AliasRule[] {
  return parseAliasMap(process.env.CLIENT_ALIAS_MAP).rules;
}

export function getAliasMapError(): string | null {
  return parseAliasMap(process.env.CLIENT_ALIAS_MAP).error;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Replaces configured raw names with their display names. Longer keys win
// so a shorter key cannot partially rewrite a longer one first.
export function redactText(input: string | null | undefined, rules: AliasRule[] = getAliasRules()): string {
  if (!input) return "";
  let out = input;
  for (const rule of rules) {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(rule.match)})(?=$|[^\\p{L}\\p{N}])`, "giu");
    out = out.replace(pattern, `$1${rule.display}`);
  }
  return out;
}

// A form that was filled from a redacted response will submit the display
// text on blur. Keep the stored value when the submission is that display
// text, so the raw name stays in the database.
export function preserveStoredText(
  submitted: string | null | undefined,
  stored: string | null | undefined,
  rules: AliasRule[] = getAliasRules(),
): string | null | undefined {
  if (submitted == null) return submitted;
  if (stored != null && redactText(stored, rules) === submitted) return stored;
  return submitted;
}
