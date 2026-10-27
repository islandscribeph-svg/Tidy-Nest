"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SnapshotPanel({
  snapshotLabel,
  boardId,
  boardName,
  itemCount,
  aliasDisplays,
  aliasError,
  snapshotPathConfigured,
}: {
  snapshotLabel: string;
  boardId: string | null;
  boardName: string | null;
  itemCount: number | null;
  aliasDisplays: string[];
  aliasError: string | null;
  snapshotPathConfigured: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"path" | "file" | null>(null);

  async function loadFromPath() {
    setLoading("path");
    setError(null);
    setMessage(null);
    const res = await fetch("/api/monday/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm, source: "env" }),
    });
    setLoading(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not load the snapshot.");
      return;
    }
    setMessage(`Loaded ${data.itemCount} items. Monday was not contacted.`);
    setConfirm("");
    router.refresh();
  }

  async function loadFile() {
    if (!file) {
      setError("Choose a snapshot JSON file.");
      return;
    }
    setLoading("file");
    setError(null);
    setMessage(null);
    const form = new FormData();
    form.set("confirm", confirm);
    form.set("file", file);
    const res = await fetch("/api/monday/snapshot", { method: "POST", body: form });
    setLoading(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not load the snapshot.");
      return;
    }
    setMessage(`Loaded ${data.itemCount} items. Monday was not contacted.`);
    setConfirm("");
    router.refresh();
  }

  return (
    <section className="mb-8 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Monday snapshot</h2>
      <p className="mt-1 text-sm text-neutral-600">{snapshotLabel}</p>
      <p className="mt-2 text-xs text-neutral-500">
        This app never calls Monday and holds no Monday credentials. Loading a snapshot replaces every project and contact
        already in this database. Hours stay, detached from the old projects. Type REPLACE to confirm.
      </p>
      {(boardId || itemCount != null) && (
        <p className="mt-2 text-xs text-neutral-500">
          Last load: {itemCount ?? "—"} items
          {boardName ? ` · ${boardName}` : ""}
          {boardId ? ` · board ${boardId}` : ""}
        </p>
      )}
      <p className="mt-2 text-xs text-neutral-500">
        Display names: {aliasDisplays.length === 0 ? "no alias configured" : aliasDisplays.join(", ")}
        {aliasError ? ` · ${aliasError}` : ""}
      </p>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Type REPLACE</span>
        <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={loadFromPath}
          disabled={loading !== null || !snapshotPathConfigured}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading === "path" ? "Loading..." : "Load snapshot"}
        </button>
        <span className="text-xs text-neutral-400">
          {snapshotPathConfigured ? "Uses the snapshot path configured on the server." : "MONDAY_SNAPSHOT_PATH is not set."}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          type="button"
          onClick={loadFile}
          disabled={loading !== null}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {loading === "file" ? "Loading..." : "Upload snapshot file"}
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
