<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Tidy Nest and Growthub both run in this environment against local PostgreSQL 16. Supabase and Resend credentials are not required.

- Tidy Nest: http://localhost:3000 (tmux session `tidy-nest`, log `/tmp/tidy-nest.log`).
- Growthub: http://localhost:3001 (tmux session `growthub`, log `/tmp/growthub.log`).
- Open those apps at `localhost`. Next.js 16 blocks dev JavaScript when the page is opened at `127.0.0.1`, so the login form reloads without signing in.
- Databases `tidy_nest` and `growthub` are local. Each repo's `.env` is created on boot when missing, and the database role is the `ubuntu` OS user over the Postgres socket.
- Seeded admin emails are `admin@tidynest.local` and `admin@growthub.local`. The password for each is `SEED_ADMIN_PASSWORD` in that repo's `.env`.
- Apply existing migrations with `npx prisma migrate deploy`. `npm run db:migrate` is interactive `prisma migrate dev`.
- Lint with `npm run lint`. Neither app has a unit-test script.
- Growthub's `CALLS_CALENDAR_ICS_URL` points at a local two-event fixture, http://127.0.0.1:8090/calendar.ics (tmux session `calendar-fixture`). **Sync from calendar** imports those events. Replace the URL in Growthub's `.env` and restart the `growthub` tmux session to use a real Google Calendar feed.
- Leave `RESEND_API_KEY` unset locally. Password-reset links are printed in the Tidy Nest dev-server log.
