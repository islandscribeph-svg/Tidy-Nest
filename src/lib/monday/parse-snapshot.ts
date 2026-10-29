import type { MondaySnapshot, SnapshotColumn, SnapshotItem, SnapshotSubitem } from "@/lib/monday/snapshot-types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function coerceColumn(value: unknown): SnapshotColumn | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string" || !row.id.trim()) return null;
  return {
    id: row.id,
    type: typeof row.type === "string" ? row.type : undefined,
    text: asString(row.text),
    value: row.value ?? null,
  };
}

function coerceSubitem(value: unknown): SnapshotSubitem | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string" || !row.id.trim()) return null;
  const columns = Array.isArray(row.column_values) ? row.column_values.map(coerceColumn).filter((c) => c !== null) : [];
  return {
    id: row.id,
    name: asString(row.name) ?? "Untitled task",
    column_values: columns,
  };
}

function coerceItem(value: unknown): SnapshotItem | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asString(row.id);
  if (!id) return null;
  const group = asRecord(row.group);
  const columns = Array.isArray(row.column_values) ? row.column_values.map(coerceColumn).filter((c) => c !== null) : [];
  const subitems = Array.isArray(row.subitems) ? row.subitems.map(coerceSubitem).filter((s) => s !== null) : [];
  return {
    id,
    name: asString(row.name) ?? "",
    url: asString(row.url),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
    group: group ? { id: asString(group.id) ?? "", title: asString(group.title) ?? "" } : null,
    column_values: columns,
    subitems,
  };
}

export function parseSnapshot(raw: unknown): MondaySnapshot {
  const root = asRecord(raw);
  if (!root) throw new Error("Snapshot must be a JSON object.");
  if (!Array.isArray(root.items)) throw new Error("Snapshot is missing an items array.");
  const board = asRecord(root.board) ?? {};
  const items: SnapshotItem[] = [];
  let skipped = 0;
  for (const row of root.items) {
    const item = coerceItem(row);
    if (!item) {
      skipped += 1;
      continue;
    }
    items.push(item);
  }
  return {
    board: { id: asString(board.id) ?? "", name: asString(board.name) ?? "" },
    pulledAt: asString(root.pulledAt),
    items,
    skipped,
  };
}
