import type { AliasRule } from "@/lib/alias";
import { getAliasRules } from "@/lib/alias";
import { moneyAmount, type ReportDealInput } from "@/lib/client-report";
import { findDataProblems, problemLabel, type ProblemCode } from "@/lib/data-problems";
import { calendarKey } from "@/lib/eastern-time";
import { hoursBetween } from "@/lib/hours";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/pipeline";
import { presentDeal } from "@/lib/present";
import type { Sheet } from "@/lib/sheet";

function monthKey(value: Date | string | null | undefined): string | null {
  const key = calendarKey(value ?? null);
  return key ? key.slice(0, 7) : null;
}

export function buildReports(
  deals: ReportDealInput[],
  hours: { personName: string; clientLabel?: string | null; startTime: string; endTime: string; breakMinutes: number; deal?: { contact: { firstName?: string | null; lastName?: string | null; company?: string | null }; title?: string | null; worksheetFileName?: string | null; projectNotes?: string | null; projectDateTimeText?: string | null } | null }[] = [],
  rules: AliasRule[] = getAliasRules(),
) {
  const shown = deals.map((deal) =>
    presentDeal({ ...deal, contact: deal.contact ?? {}, subStatus: deal.subStatus ?? null }, rules),
  );
  const closed = shown.filter((deal) => deal.stage === "CLOSED");
  const byMonth = new Map<string, number>();
  for (const deal of closed) {
    const key = monthKey(deal.dateClosed);
    const amount = moneyAmount(deal.closedDealValue);
    if (!key || amount === null) continue;
    byMonth.set(key, (byMonth.get(key) ?? 0) + amount);
  }
  const byClient = new Map<string, number>();
  for (const deal of closed) {
    const name = deal.displayName.split(" – ")[0] || deal.displayName;
    const amount = moneyAmount(deal.closedDealValue);
    if (amount === null) continue;
    byClient.set(name, (byClient.get(name) ?? 0) + amount);
  }
  const clients = [...byClient.entries()].sort((a, b) => b[1] - a[1]);
  const stages = STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: shown.filter((deal) => deal.stage === stage).length,
  }));
  const hoursByPerson = new Map<string, number>();
  const hoursByProject = new Map<string, number>();
  for (const entry of hours) {
    const amount = hoursBetween(entry.startTime, entry.endTime, entry.breakMinutes) ?? 0;
    const person = presentDeal({ contact: { firstName: entry.personName }, title: null }, rules).contact.firstName || entry.personName;
    hoursByPerson.set(person, (hoursByPerson.get(person) ?? 0) + amount);
    const project = entry.deal ? presentDeal(entry.deal, rules).displayName : entry.clientLabel || "—";
    hoursByProject.set(project, (hoursByProject.get(project) ?? 0) + amount);
  }
  const problems = findDataProblems(deals as Parameters<typeof findDataProblems>[0], rules);
  const problemCounts = new Map<ProblemCode, number>();
  for (const problem of problems) problemCounts.set(problem.code, (problemCounts.get(problem.code) ?? 0) + 1);
  const open = shown.filter((deal) => deal.stage === "IN_PROGRESS" || deal.stage === "CONSULTATION");
  const died = shown.filter((deal) => deal.stage === "DEAD");
  return {
    revenueByMonth: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)),
    clients,
    topClients: clients.slice(0, 10),
    stages,
    hoursByPerson: [...hoursByPerson.entries()],
    hoursByProject: [...hoursByProject.entries()],
    problemCounts: [...problemCounts.entries()].map(([code, count]) => ({ code, label: problemLabel(code), count })),
    closedTotal: closed.reduce((sum, deal) => sum + (moneyAmount(deal.closedDealValue) ?? 0), 0),
    closedWithValue: closed.filter((deal) => moneyAmount(deal.closedDealValue) !== null).length,
    openCount: open.length,
    diedCount: died.length,
  };
}

export function reportSheets(report: ReturnType<typeof buildReports>): Sheet[] {
  return [
    {
      name: "Revenue by month",
      headers: ["Month", "Closed deal value"],
      rows: report.revenueByMonth.map(([month, total]) => [month, total]),
    },
    {
      name: "Revenue by client",
      headers: ["Client", "Closed deal value"],
      rows: report.clients.map(([name, total]) => [name, total]),
    },
    {
      name: "Stages",
      headers: ["Stage", "Count"],
      rows: report.stages.map((stage) => [stage.label, stage.count]),
    },
    {
      name: "Hours",
      headers: ["Group", "Name", "Hours"],
      rows: [
        ...report.hoursByPerson.map(([name, hours]) => ["Employee", name, hours]),
        ...report.hoursByProject.map(([name, hours]) => ["Project", name, hours]),
      ],
    },
    {
      name: "Data problems",
      headers: ["Problem", "Count"],
      rows: report.problemCounts.map((problem) => [problem.label, problem.count]),
    },
  ];
}
