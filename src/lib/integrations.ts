export type IntegrationStatus = {
  configured: boolean;
  enabled: boolean;
  detail: string;
};

export function sheetsBackupStatus(): IntegrationStatus {
  const configured = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_SHEETS_BACKUP_ID,
  );
  const enabled = configured && process.env.GOOGLE_SHEETS_BACKUP_ENABLED === "1";
  return {
    configured,
    enabled,
    detail: enabled ? "Backup is on." : configured ? "Credentials are set. Turn on GOOGLE_SHEETS_BACKUP_ENABLED=1." : "Not configured.",
  };
}

export function slackStatus(): IntegrationStatus {
  const configured = Boolean(process.env.SLACK_WEBHOOK_URL);
  const enabled = configured && process.env.SLACK_NOTIFICATIONS_ENABLED === "1";
  return {
    configured,
    enabled,
    detail: enabled ? "Slack notifications are on." : configured ? "Webhook is set. Turn on SLACK_NOTIFICATIONS_ENABLED=1." : "Not configured.",
  };
}

export function calendarSyncStatus(): IntegrationStatus {
  const configured = Boolean(process.env.GOOGLE_CALENDAR_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  const enabled = configured && process.env.GOOGLE_CALENDAR_SYNC_ENABLED === "1";
  return {
    configured,
    enabled,
    detail: enabled
      ? "Google Calendar API sync is marked on. Two-way updates are not built yet."
      : "Not configured. The in-app calendar and the private iCal feed work without Google credentials.",
  };
}
