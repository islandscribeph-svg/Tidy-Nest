import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { easternDateInputValue, easternParts, formatCalendarDate } from "@/lib/eastern-time";
import { prisma } from "@/lib/prisma";
import { STAGE_LABELS } from "@/lib/pipeline";
import { presentDeal } from "@/lib/present";
import { buildToday, greetingForHour, type TodayItem } from "@/lib/today";

export const dynamic = "force-dynamic";

function Section({ title, hint, empty, items }: { title: string; hint: string; empty: string; items: TodayItem[] }) {
  return (
    <section className="rounded-2xl border border-[#e4dfd2] bg-white">
      <div className="flex items-baseline justify-between gap-3 border-b border-[#eeeae1] px-4 py-3">
        <h2 className="text-base font-semibold text-[#1c2116]">{title}</h2>
        <span className="text-sm text-neutral-500">{items.length}</span>
      </div>
      <p className="px-4 pt-3 text-sm text-neutral-500">{hint}</p>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-neutral-600">{empty}</p>
      ) : (
        <ul className="divide-y divide-[#f0ece3]">
          {items.slice(0, 8).map((deal) => (
            <li key={`${title}-${deal.id}`}>
              <Link href={`/pipeline?deal=${deal.id}`} prefetch={false} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-[#faf8f3]">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[#1c2116]">{deal.displayName}</span>
                  <span className="block truncate text-xs text-neutral-500">
                    {STAGE_LABELS[deal.stage as keyof typeof STAGE_LABELS] ?? deal.stage}
                    {deal.subStatus ? ` · ${deal.subStatus}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-neutral-500">
                  {formatCalendarDate(deal.consultDate) || formatCalendarDate(deal.projectStartDate) || "No date"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {items.length > 8 && (
        <p className="px-4 py-3 text-sm">
          <Link href="/pipeline" className="text-[#5c6b3f] underline">
            See all {items.length} in the pipeline
          </Link>
        </p>
      )}
    </section>
  );
}

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const deals = await prisma.deal.findMany({
    include: { contact: true, assignedTo: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const now = new Date();
  const parts = easternParts(now);
  const todayKey = easternDateInputValue(now);
  const shown = deals.map((deal) => presentDeal(deal));
  const buckets = buildToday(
    shown.map((deal) => ({
      id: deal.id,
      stage: deal.stage,
      displayName: deal.displayName,
      title: deal.title ?? null,
      subStatus: deal.subStatus ?? null,
      consultDate: deal.consultDate,
      projectStartDate: deal.projectStartDate,
      assignedToId: deal.assignedTo?.id ?? null,
    })),
    user.id,
    todayKey,
  );
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  const counts = [
    { label: "Overdue", value: buckets.overdue.length },
    { label: "Your follow-ups", value: buckets.followUps.length },
    { label: "New leads", value: buckets.newLeads.length },
    { label: "Consults", value: buckets.consultations.length },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5">
      <div>
        <p className="text-sm text-neutral-500">{dateLabel} · Eastern Time</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#1c2116]">
          {greetingForHour(parts.hour)}, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">What needs you today. Open a row to work on the project.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.map((count) => (
          <div key={count.label} className="rounded-2xl border border-[#e4dfd2] bg-white px-3 py-3">
            <p className="text-2xl font-semibold text-[#1c2116]">{count.value}</p>
            <p className="text-xs text-neutral-500">{count.label}</p>
          </div>
        ))}
      </div>
      <Section
        title="Overdue"
        hint="A consult or start date has passed, and the project is still a lead."
        empty="Nothing overdue. You are caught up."
        items={buckets.overdue}
      />
      <Section
        title="Your follow-ups"
        hint="Leads assigned to you that are not in progress yet."
        empty="Nothing is assigned to you. Open the pipeline and assign a project."
        items={buckets.followUps}
      />
      <Section
        title="New leads"
        hint="People who just came in."
        empty="No new leads right now."
        items={buckets.newLeads}
      />
      <Section
        title="Upcoming consultations"
        hint="Consult dates in the next two weeks, plus consultations that still need a date."
        empty="No consultations coming up."
        items={buckets.consultations}
      />
    </div>
  );
}
