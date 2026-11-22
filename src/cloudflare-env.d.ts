interface Hyperdrive {
  connectionString: string;
}

interface CloudflareEnv {
  HYPERDRIVE?: Hyperdrive;
  BACKUP_CRON_SECRET?: string;
  GOOGLE_SHEETS_BACKUP_ENABLED?: string;
  SLACK_NOTIFICATIONS_ENABLED?: string;
  APP_ORIGIN?: string;
  PASSWORD_LOGIN_ENABLED?: string;
}
