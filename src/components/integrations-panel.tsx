"use client";

import { useState } from "react";
import type { IntegrationStatus } from "@/lib/integrations";

export function IntegrationsPanel({
  sheets,
  slack,
  calendar,
  backupLabel,
  slackLead,
  slackStage,
}: {
  sheets: IntegrationStatus;
  slack: IntegrationStatus;
  calendar: IntegrationStatus;
  backupLabel: string;
  slackLead: boolean;
  slackStage: boolean;
}) {
  const [feed, setFeed] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lead, setLead] = useState(slackLead);
  const [stage, setStage] = useState(slackStage);

  async function backup() {
    const res = await fetch("/api/integrations/backup", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Backup finished." : data.error ?? "Backup did not run.");
  }

  async function saveSlack(next: { slackNotifyLead?: boolean; slackNotifyStage?: boolean; test?: boolean }) {
    const res = await fetch("/api/integrations/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? (next.test ? "Test message sent." : "Saved.") : data.error ?? data.reason ?? "Slack is not configured.");
  }

  async function feedLink(revoke = false) {
    const res = await fetch("/api/calendar/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoke }),
    });
    const data = await res.json().catch(() => ({}));
    setFeed(revoke ? null : data.url ?? null);
    setMessage(revoke ? "Feed link revoked." : "Feed link created. Copy it now.");
  }

  async function importDrive() {
    const res = await fetch("/api/drive/import-links", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? `Copied ${data.updated ?? 0} Drive links onto clients.` : data.error ?? "Could not import links.");
  }

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-sm font-semibold text-neutral-900">Integrations</h2>
      <article className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <h3 className="font-medium">Google Sheets backup</h3>
        <p className="mt-1 text-neutral-600">{sheets.detail}</p>
        <p className="mt-1 text-xs text-neutral-500">Last run: {backupLabel}</p>
        <button type="button" className="mt-3 min-h-10 rounded-md bg-neutral-900 px-3 text-white" onClick={backup}>
          Back up now
        </button>
      </article>
      <article className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <h3 className="font-medium">Slack</h3>
        <p className="mt-1 text-neutral-600">{slack.detail}</p>
        <label className="mt-2 flex min-h-10 items-center gap-2">
          <input type="checkbox" checked={lead} onChange={(event) => { setLead(event.target.checked); saveSlack({ slackNotifyLead: event.target.checked }); }} />
          New lead
        </label>
        <label className="flex min-h-10 items-center gap-2">
          <input type="checkbox" checked={stage} onChange={(event) => { setStage(event.target.checked); saveSlack({ slackNotifyStage: event.target.checked }); }} />
          Stage change
        </label>
        <button type="button" className="mt-2 min-h-10 rounded-md border px-3" onClick={() => saveSlack({ test: true })}>
          Send test message
        </button>
      </article>
      <article className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <h3 className="font-medium">Calendar feed</h3>
        <p className="mt-1 text-neutral-600">{calendar.detail}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="min-h-10 rounded-md bg-neutral-900 px-3 text-white" onClick={() => feedLink(false)}>
            Create feed link
          </button>
          <button type="button" className="min-h-10 rounded-md border px-3" onClick={() => feedLink(true)}>
            Revoke
          </button>
        </div>
        {feed && <p className="mt-2 break-all text-xs">{feed}</p>}
      </article>
      <article className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <h3 className="font-medium">Drive links</h3>
        <p className="mt-1 text-neutral-600">No Drive API. Copy existing project Drive links onto clients that do not have one.</p>
        <button type="button" className="mt-3 min-h-10 rounded-md border px-3" onClick={importDrive}>
          Copy project Drive links
        </button>
      </article>
      {message && <p className="text-sm text-neutral-700">{message}</p>}
    </section>
  );
}
