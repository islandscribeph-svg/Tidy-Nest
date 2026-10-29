import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEasternDateTime } from "@/lib/eastern-time";
import { presentClientJson } from "@/lib/present";
import { ExportLinks } from "@/components/export-links";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; record?: string; type?: string; from?: string; to?: string; page?: string }>;
}) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const where = {
    userId: query.user || undefined,
    recordType: query.record || undefined,
    action: query.type || undefined,
    createdAt: {
      gte: query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined,
      lte: query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined,
    },
  };
  const [events, users, total] = await Promise.all([
    prisma.activityEvent.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.activityEvent.count({ where }),
  ]);
  const rows = presentClientJson(events);
  const staff = presentClientJson(users);
  const exportHref = `/api/exports/activity?${new URLSearchParams({
    user: query.user ?? "",
    record: query.record ?? "",
    type: query.type ?? "",
  }).toString()}`;

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Activity</h1>
          <p className="mt-1 text-sm text-neutral-500">Who changed what, in Eastern time. Passwords are not recorded.</p>
        </div>
        <ExportLinks href={exportHref} />
      </div>
      <form className="mb-4 flex flex-wrap items-end gap-2" method="get">
        <label className="text-xs text-neutral-600">
          User
          <select className="input mt-1 min-h-10" name="user" defaultValue={query.user ?? ""}>
            <option value="">Everyone</option>
            {staff.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-600">
          Record
          <input className="input mt-1 min-h-10" name="record" defaultValue={query.record ?? ""} placeholder="deal, contact, export" />
        </label>
        <label className="text-xs text-neutral-600">
          Type
          <input className="input mt-1 min-h-10" name="type" defaultValue={query.type ?? ""} placeholder="edit, stage, sign-in" />
        </label>
        <label className="text-xs text-neutral-600">
          From
          <input className="input mt-1 min-h-10" type="date" name="from" defaultValue={query.from ?? ""} />
        </label>
        <label className="text-xs text-neutral-600">
          To
          <input className="input mt-1 min-h-10" type="date" name="to" defaultValue={query.to ?? ""} />
        </label>
        <button className="min-h-10 rounded-md bg-neutral-900 px-3 text-sm text-white" type="submit">
          Filter
        </button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Who</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Record</th>
              <th className="px-4 py-2">Field</th>
              <th className="px-4 py-2">Old</th>
              <th className="px-4 py-2">New</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <tr key={event.id} className="border-b border-neutral-100">
                <td className="px-4 py-3">{formatEasternDateTime(event.createdAt)}</td>
                <td className="px-4 py-3">{event.user?.name ?? "—"}</td>
                <td className="px-4 py-3">{event.action}</td>
                <td className="px-4 py-3">
                  {event.recordType} {event.recordId}
                </td>
                <td className="px-4 py-3">{event.field ?? "—"}</td>
                <td className="px-4 py-3">{event.oldValue ?? "—"}</td>
                <td className="px-4 py-3">{event.newValue ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  No activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2 text-sm">
        {page > 1 && (
          <Link className="min-h-10 underline" href={`/activity?page=${page - 1}`}>
            Previous
          </Link>
        )}
        {page * PAGE_SIZE < total && (
          <Link className="min-h-10 underline" href={`/activity?page=${page + 1}`}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
