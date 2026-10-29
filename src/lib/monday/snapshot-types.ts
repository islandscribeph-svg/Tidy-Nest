export type SnapshotColumn = {
  id: string;
  type?: string;
  text: string | null;
  value: unknown;
};

export type SnapshotSubitem = {
  id: string;
  name: string;
  column_values: SnapshotColumn[];
};

export type SnapshotItem = {
  id: string;
  name: string;
  url: string | null;
  created_at: string | null;
  updated_at: string | null;
  group: { id: string; title: string } | null;
  column_values: SnapshotColumn[];
  subitems: SnapshotSubitem[];
};

export type MondaySnapshot = {
  board: { id: string; name: string };
  pulledAt: string | null;
  items: SnapshotItem[];
  skipped: number;
};
