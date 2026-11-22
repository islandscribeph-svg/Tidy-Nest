import nextWorker from "../.open-next/worker.js";

// Daily Sheets backup. Stays idle until GOOGLE_SHEETS_BACKUP_ENABLED is exactly "1".
// 11:00 UTC is 6:00 AM Eastern during standard time and 7:00 AM Eastern during daylight time.
export default {
  fetch(request, env, ctx) {
    return nextWorker.fetch(request, env, ctx);
  },
  scheduled(_event, env, ctx) {
    if (env.GOOGLE_SHEETS_BACKUP_ENABLED !== "1") return;
    const request = new Request("https://tidy-nest.internal/api/integrations/backup", {
      method: "POST",
      headers: { "x-backup-key": env.BACKUP_CRON_SECRET ?? "" },
    });
    ctx.waitUntil(Promise.resolve(nextWorker.fetch(request, env, ctx)));
  },
};
