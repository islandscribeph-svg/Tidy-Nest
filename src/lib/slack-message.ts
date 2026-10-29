import type { AliasRule } from "@/lib/alias";
import { getAliasRules } from "@/lib/alias";
import { formatEasternDateTime } from "@/lib/eastern-time";
import { presentDeal } from "@/lib/present";
import { STAGE_LABELS } from "@/lib/pipeline";

export function slackStageMessage(
  deal: { stage: keyof typeof STAGE_LABELS; title?: string | null; contact: { firstName?: string | null; lastName?: string | null; company?: string | null } },
  kind: "lead" | "stage",
  rules: AliasRule[] = getAliasRules(),
) {
  const shown = presentDeal(deal, rules);
  const when = formatEasternDateTime(new Date()) ?? "";
  const verb = kind === "lead" ? "New lead" : "Stage changed";
  return `${verb}: ${shown.displayName} is ${STAGE_LABELS[shown.stage]}. ${when}.`;
}
