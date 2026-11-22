# Deploy Tidy Nest on Cloudflare

The app runs as a Cloudflare Worker through the OpenNext Cloudflare adapter. The database stays Postgres. A Worker reaches it through Hyperdrive.

## Why Postgres, not D1

The schema is already Postgres: enums, decimals, JSON, string arrays, and relations across projects, contacts, hours, partners, and the activity log. D1 is SQLite. Moving would mean rewriting the schema and every query, and a lossy copy of money and list fields. The current database can be copied with `pg_dump` / `pg_restore`.

Hyperdrive is a connection pool in front of that Postgres (Neon, Supabase, or any other host). Prisma uses the `pg` driver adapter, and the client is generated with `engineType = "client"` so the Worker does not need a native query engine.

Excel exports, the private iCal feed, Slack, and the Sheets backup all run in the Worker. The Sheets backup is a Cron Trigger (`0 11 * * *`, which is 6:00 AM Eastern during standard time and 7:00 AM Eastern during daylight time). It does nothing until `GOOGLE_SHEETS_BACKUP_ENABLED=1`. Slack stays off until `SLACK_NOTIFICATIONS_ENABLED=1` and `SLACK_WEBHOOK_URL` are set. Nothing calls Monday.

## One-time Cloudflare setup

Use the Cloudflare account **islandscribeph@gmail.com**.

```bash
npx wrangler login
npx wrangler whoami
```

`whoami` should show that account. If it shows a different account, run `npx wrangler logout` and log in again.

Create a Postgres database if you do not already have one (Neon or Supabase are both fine). Copy the **direct** URL. Then:

```bash
npx wrangler hyperdrive create tidy-nest-db --connection-string "postgres://USER:PASSWORD@HOST:5432/DATABASE"
```

Put the printed Hyperdrive id in `wrangler.jsonc` in place of `00000000000000000000000000000000`.

Set the public origin after the first deploy (the `*.workers.dev` host, or your custom domain):

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put LEAD_INTAKE_SECRET
npx wrangler secret put ALLOWED_USER_EMAILS
npx wrangler secret put CLIENT_ALIAS_MAP
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

`ALLOWED_USER_EMAILS` is the two admin addresses, comma-separated, for example `peps@tidynest.com,shannon@tidynest.com`. Those accounts stay admins. `CLIENT_ALIAS_MAP` is JSON. Keep the real surname only in this secret.

Then set the var (not a secret):

```bash
npx wrangler secret put APP_ORIGIN
```

Use the full origin with no trailing slash, such as `https://tidy-nest.<account>.workers.dev`.

Optional, leave unset until you want them:

```bash
npx wrangler secret put BACKUP_CRON_SECRET
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
npx wrangler secret put GOOGLE_SHEETS_BACKUP_ID
npx wrangler secret put SLACK_WEBHOOK_URL
npx wrangler secret put RESEND_API_KEY
```

Turn a feature on by editing `vars` in `wrangler.jsonc` (or the dashboard): `GOOGLE_SHEETS_BACKUP_ENABLED=1`, `SLACK_NOTIFICATIONS_ENABLED=1`. `PASSWORD_LOGIN_ENABLED=0` hides the admin password form. Leave it as `1` until Google sign-in is confirmed.

Migrations do not run inside the Worker. From your machine, with the direct URL:

```bash
DATABASE_URL="postgres://..." DIRECT_URL="postgres://..." npm run db:deploy
```

## Copy the existing database

```bash
SOURCE_DATABASE_URL="postgres://old-host/db" \
TARGET_DATABASE_URL="postgres://new-host/db" \
./scripts/migrate-data.sh
```

The script applies migrations on the target, dumps **data only** to a temp file, restores it, and deletes the temp file. It does not commit client data. Install `pg_dump` and `pg_restore` first. Do not point this at a database that already has rows unless you mean to merge them.

## Deploy

```bash
npm run deploy
```

That runs `prisma migrate deploy`, builds the Worker, applies a small cookie-parser patch the OpenNext bundle needs, and runs `opennextjs-cloudflare deploy`. You need `DATABASE_URL` and `DIRECT_URL` in the environment for the migrate step, and `wrangler login` for the upload.

Local preview of the Worker build, without uploading:

```bash
cp .dev.vars.example .dev.vars
# fill .dev.vars, and point wrangler.jsonc localConnectionString at your local Postgres
npm run preview:cloudflare
```

`npm run dev` is still the Next.js dev server and uses `DATABASE_URL` directly. It does not need Wrangler.

## Google sign-in

In Google Cloud Console, for the same Google account that should own the OAuth client:

1. Create a project, then **APIs & Services > OAuth consent screen**. User type External is fine. Add the scope `openid`, `email`, and `profile` (the default sign-in scopes).
2. **APIs & Services > Credentials > Create credentials > OAuth client ID > Web application**.
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `http://localhost:8787/api/auth/google/callback`
   - `https://<your-worker-host>/api/auth/google/callback`
4. Copy the client id and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Do not commit them.
5. Set `APP_ORIGIN` to the same origin as the redirect you are using (`http://localhost:3000` locally, the Worker origin in production).

`hd=tidynest.com` is only sent as a hint so the Google account picker prefers that workspace. The server allows a sign-in only when the id token email is verified and the domain is exactly `tidynest.com`.

The first time someone with a new tidynest.com address signs in, the app creates a **member**. Members can view and edit projects and contacts. They cannot change financial fields or open Settings or Users. Peps and Shannon stay admins when their email is one of the two in `ALLOWED_USER_EMAILS` (create those users once with `npm run sandbox:setup` or `POST /api/setup/admin`, using the same email they will use with Google). Admins change roles on **Users**.

The admin password form stays available unless `PASSWORD_LOGIN_ENABLED=0`. It still accepts only the two allowlisted accounts.

## What you still have to provide

This repo does not contain Cloudflare credentials, a Google OAuth client, or a database password. Before `npm run deploy` can go live:

1. `wrangler login` as islandscribeph@gmail.com.
2. A Postgres database and a Hyperdrive id in `wrangler.jsonc`.
3. Secrets listed above, especially `SESSION_SECRET`, `ALLOWED_USER_EMAILS`, `CLIENT_ALIAS_MAP`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `APP_ORIGIN`.
4. Google redirect URIs for localhost and the Worker host.
5. A data copy with `scripts/migrate-data.sh` if the live data is still on the old dev database.
