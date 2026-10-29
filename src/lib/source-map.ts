import type { Source } from "@prisma/client";

export function normalizeSource(raw: string | undefined | null, heardAbout: string | undefined | null): {
  source: Source;
  detail?: string;
} {
  const text = raw?.trim() || heardAbout?.trim();
  if (!text) return { source: "UNKNOWN" };
  const low = text.toLowerCase();
  let source: Source = "OTHER";
  if (low.includes("social")) source = "SOCIAL_MEDIA";
  else if (low.includes("magazine")) source = "MAGAZINE";
  else if (low.includes("advertisement") || low.includes("online ad") || low.includes("article")) source = "ONLINE_AD";
  else if (low.includes("google")) source = "GOOGLE";
  else if (low.includes("referr") || low.includes("know each other")) source = "REFERRAL";
  else if (low === "friend" || low.includes("friend")) source = "FRIEND";
  else if (low.includes("website") || low.includes("web")) source = "WEBSITE";
  return { source, detail: text };
}
