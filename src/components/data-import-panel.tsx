"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const CONFIRM_TEXT = "WIPE";

export function DataImportPanel({ initialCounts }: { initialCounts: { deals: number; contacts: number } }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmText, setConfirmText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [counts, setCounts] = useState(initialCounts);

  const canSubmit = !!fileName && confirmText === CONFIRM_TEXT && !submitting;

  async function handleSubmit() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || confirmText !== CONFIRM_TEXT) return;

    const proceed = window.confirm(
      `This will permanently delete all ${counts.deals} projects and ${counts.contacts} contacts currently in the app, and replace them with what's in "${file.name}". This cannot be undone. Continue?`,
    );
    if (!proceed) return;

    setSubmitting(true);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    form.append("confirm", confirmText);

    try {
      const res = await fetch("/api/admin/data-import", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        setCounts({ deals: data.result.dealsCreated, contacts: data.result.contactsUsed });
        setResult({
          ok: true,
          message: `Wiped ${data.wiped.dealsWiped} projects / ${data.wiped.contactsWiped} contacts. Imported ${data.result.dealsCreated} projects across ${data.result.contactsUsed} contacts.`,
        });
        setConfirmText("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFileName(null);
        router.refresh();
      } else {
        setResult({ ok: false, message: data.error || `Request failed (${res.status})` });
      }
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-red-200 bg-red-50/40 p-5">
      <h2 className="text-sm font-semibold text-red-900">Replace all data</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Currently: <strong>{counts.deals}</strong> projects, <strong>{counts.contacts}</strong> contacts.
      </p>
      <p className="mt-2 text-xs text-red-800">
        ⚠️ Uploading a spreadsheet here deletes every project and contact currently in the app (and their notes,
        worksheet entries, reimbursements, and checklists) and reloads from the file. Employee and login accounts
        are not affected. This cannot be undone.
      </p>

      <label className="mt-4 block text-xs font-medium text-neutral-700">Spreadsheet (.xlsx)</label>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        className="mt-1 block w-full text-sm"
      />

      <label className="mt-3 block text-xs font-medium text-neutral-700">
        Type {CONFIRM_TEXT} to confirm
      </label>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={CONFIRM_TEXT}
        className="mt-1 w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
      />

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="mt-4 rounded-md bg-red-700 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-default disabled:opacity-40"
      >
        {submitting ? "Wiping and reimporting…" : "Wipe and reimport"}
      </button>
      {fileName && !submitting && <span className="ml-3 text-xs text-neutral-500">{fileName}</span>}

      {result && (
        <div
          className={`mt-3 whitespace-pre-wrap rounded-md border px-3 py-2 text-xs ${
            result.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {result.message}
        </div>
      )}
    </section>
  );
}
