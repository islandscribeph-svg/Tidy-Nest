# Tidy Nest CRM / PM

Custom lead pipeline and light project-management tool for Tidy Nest. Monday stays the system of record. This app reads a local JSON snapshot of that board and never calls Monday.

Stack: Next.js (App Router, TypeScript) + Prisma + Postgres, Tailwind. Pipeline stage comes from the Monday Status column, not the board group. A contact (a person) can have more than one deal (one engagement).

For a private two-person sandbox on plain Linux, follow [SANDBOX.md](SANDBOX.md).

## Dashboard

The default landing page (`/dashboard`, both after login and at `/`). A filter bar (Year, Month, Client, Address/City/State, Project Title — defaults to the current month) scopes four stat cards (Win Rate, Total Filtered Deals, Active Pipeline Value, Closed Won Revenue) plus a set of charts, all computed client-side from the full deal set: a "Deals Over Time" line chart (monthly volume for the selected year, or seasonality-by-month across all years when "All Years" is picked), a donut chart for Deals by Service Type, and color-coded breakdown bars for Deals by Stage and Deals by Lead Source. "Export CSV" downloads exactly the filtered set via `/api/reports/export?...` (same query params as the on-screen filters, via `matchesDashboardFilters()` in `src/lib/pipeline.ts` so the two never disagree). Chart colors follow a deliberate categorical/sequential palette in `src/lib/chart-colors.ts` (see "Design notes" below).

Year/Month filtering (and the line chart's x-axis) use each deal's own **project date** — `dateClosed ?? projectStartDate ?? consultDate`, via `projectDate()` in `src/lib/pipeline.ts` — not `createdAt`, since the legacy import gave every record the same `createdAt` (the import timestamp).

## Pipeline

Each pipeline item is a **project** (e.g. "Fall Relocation") belonging to a contact, who may have several projects over time. Within each stage column, projects render as plain color-coded text rows ("Client - Project Name", with the project date on the right) rather than cards — each stage has its own color (see `STAGE_COLORS` in `src/lib/pipeline.ts`), reused consistently on the column header, the row's accent bar, and everywhere else in the app a stage is shown (Dashboard, Calendar).

Stages: **New Leads → Contacted → Consultation → In Progress → Closed**, with **Unqualified** and **Died** as exit lanes reachable from any stage. Stage is taken from the Status column (`New Lead`, `Initial Email Sent`, `Client - Start`, `Closed`, `Died`, and the other values mapped in `src/lib/status-map.ts`). The board group is stored and shown, and it does not set the stage. Dragging a row updates the local stage until the next snapshot replace.

Clicking a row opens the project detail modal (centered, not a side drawer), with tabs that appear as the project matures:
- **Details** (always shown): stage/service/source/value fields and the activity/notes timeline. Stage/Service/Source/Assigned-to are `SelectButton` components (`src/components/ui/select-button.tsx`) — a styled button that opens a floating option list on click, used in place of native `<select>` dropdowns throughout the app's popups/modals.
- **Consultation** (once the project reaches Consultation): a checklist, the consultation date, and a "Create Consult Invoice on QuickBooks" button — currently a manual bridge (opens QuickBooks in a new tab; paste the resulting invoice number/link back into the two fields below it) until real QuickBooks API integration is built.
- **Services Worksheet** (once In Progress): billable time entries — Person / Date / Description / Hours / Rate, with a computed total — and a notes field. `Rate` here is what the *client* is billed; if a row is attributed to someone, those hours also land on that person's timesheet (see Employees below), valued at *their own* hourly rate instead.
- **Reimbursements** (once In Progress): per-vendor expense tracking (Item Details/Qty/Unit Price, computed subtotal, fillable shipping fee + sales tax, computed grand total per vendor), with a combined overview once there's more than one vendor.
- **Total Billables** (once In Progress): Service Hours Total + Reimbursements Total + itemized additional charges = Invoice Total, and a "Create Project Invoice on QuickBooks" button (same manual-bridge pattern as the Consultation tab's invoice button).

Tab visibility is based on the project's current stage reaching that point, not a full history — Unqualified/Dead are treated as having reached the maximum tab set so already-entered data is never hidden, even if that means an empty tab shows for a project that exited very early.

## Calendar

`/calendar` plots every project on its project date (same `projectDate()` field the Dashboard uses) in a month-grid view, color-coded by stage like the Pipeline. Clicking an entry opens the same project detail modal as the Pipeline.

## Employees & Contractors

A separate section (`/employees`) for staff and contractors: name, type, and an hourly rate — independent of whatever rate a project bills the client. Pay periods are semi-monthly (1st–15th, 16th–end of month) in Eastern time. Each employee's page shows that period's hours from:

- **Hours log** (`/hours`) — date, person, client/project, start, end, break, and notes, stored only in this app. New time is entered there. It is not read from Slack, workbooks, or Monday subitems.
- **Older timesheet rows** — already saved on the employee record. They can still be edited; new ones are not added from this page.
- **Project hours** — any Services Worksheet row attributed to that person, valued at *their* hourly rate (not the project's billing rate). Editing those rows happens on the project's Worksheet tab.

`/data-problems` lists hygiene flags (duplicate invoices, closed items missing value, date, or a Drive link, missing or mismatched worksheet and PDF names, Died items that still have an invoice number, and free-text dates that could not be parsed). It does not change the underlying rows.

### Save Contact flow

A new lead isn't a full contact until required fields (name + email-or-phone + service type) are confirmed. Cards missing that show a **Needs info** badge. The **Save Contact** button opens a pre-filled modal; if the email/phone matches an existing contact, you're offered a chance to link to the existing person instead of creating a duplicate (important since many clients are repeat customers across years).

## Local setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Database.** Any Postgres works, including a local database (see [SANDBOX.md](SANDBOX.md)) or a hosted Postgres project. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `DIRECT_URL` (used by Prisma migrations), `SESSION_SECRET` (`openssl rand -base64 32`), `LEAD_INTAKE_SECRET`, and `ALLOWED_USER_EMAILS` (exactly two staff emails).

3. **Run migrations and create the two logins.** Prefer the sandbox command, which also loads `MONDAY_SNAPSHOT_PATH` when it is set:

   ```bash
   npm run sandbox:setup
   ```

   On a hosted deploy without that command, create each account once with `POST /api/setup/admin` (see below). The route stops accepting new users once two exist.

4. **Load a Monday snapshot** (optional until you have a file). The app does not call Monday.

   ```bash
   npm run import:snapshot -- "/absolute/path/to/snapshot.json"
   ```

   An admin can also load `MONDAY_SNAPSHOT_PATH`, or upload the same JSON, from Settings after typing `REPLACE`. Re-running replaces projects and contacts and is safe to repeat. The in-repo sample file is for tests and is not loaded unless you pass it explicitly or set `SANDBOX_ALLOW_FIXTURE=1`.

5. **(Optional) Import a spreadsheet export** instead of, or before, a snapshot. Stage still comes from the Status column, not the group:

   ```bash
   npm run import:monday -- "/path/to/Main_Nest.xlsx" --dry-run
   npm run import:monday -- "/path/to/Main_Nest.xlsx"
   ```

   Contacts are matched by email or phone. Running it twice creates duplicate deals. Settings → Replace all data is the in-app version (type `WIPE`).

6. **Run the app**
   ```bash
   npm run sandbox:start
   ```
   Visit http://localhost:3000 and sign in with one of the two staff emails. Dates and times are shown in Eastern time. The header and footer show when the snapshot was pulled.

## Website form intake

`POST /api/leads/intake` accepts new leads from the Tidy Nest website form (or any external source). Requires an `x-intake-key` header matching `LEAD_INTAKE_SECRET`. Body:

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "555-0100",
  "serviceType": "ORGANIZING",
  "title": "Kitchen declutter",
  "detailsOfProject": "...",
  "source": "Instagram"
}
```
Creates a draft Contact + a `NEW_LEAD` Deal. Wire this into whatever handles the current website form submission.

## Design notes

Top nav bar uses `NEXT_PUBLIC_BRAND_COLOR` (default `#5c6b3f`) and `NEXT_PUBLIC_BRAND_LOGO_PATH` (default `/brand/tidynest-logo-white.webp`). `src/proxy.ts` (this app's auth guard; Next 16 uses `proxy.ts` rather than `middleware.ts`) allows `/brand` so the logo loads without a session. Every other page and API route requires a staff session, except login, password reset, `/api/leads/intake` (header `x-intake-key`), and `/api/setup/*` (header `x-setup-key`). Chart colors (Dashboard) follow a deliberate categorical/sequential palette validated for colorblind-safe contrast — see `src/lib/chart-colors.ts`.

Names in `CLIENT_ALIAS_MAP` are replaced at display, search, and CSV export. The example key Harborlane is not a client. A real surname belongs only in that env value.

Invoice files are labeled `Tidy Nest Invoice NNNN_Client_Description`. Workbooks are labeled `LastName_Project_MonYYYY_Invoice_Workbook`. The client part of a display name uses the alias when one is configured.

## Forgot password

The login page's "Forgot password?" link emails a reset link via [Resend](https://resend.com):

1. Sign up at resend.com (free tier: 3,000 emails/month, no card needed) and create an API key.
2. Set `RESEND_API_KEY` in your env vars.
3. **Recipient limits matter here.** Without a verified sending domain, Resend only delivers to the email address you signed up with — reset emails to your actual staff addresses won't arrive. To send to anyone, verify a domain (e.g. `tidynest.com`, or a subdomain like `mail.tidynest.com`) under Resend's Domains settings, which means adding a few DNS records there, then set `EMAIL_FROM` to an address on that domain (e.g. `"Tidy Nest <noreply@tidynest.com>"`).
4. Locally, if `RESEND_API_KEY` is unset the reset link is just logged to the console instead of emailed, so the flow is testable without setting any of this up.

Reset links expire after 1 hour and are single-use; requesting a new one invalidates any still-outstanding link.

## What's deliberately deferred

These stay manual. The schema already has fields for them:

- **Email intake** — parsing inbound emails into New Leads.
- **QuickBooks sync** — invoice and payment links are pasted or opened in a tab. There is no QuickBooks API client.
- **Slack / Google Drive auto-provisioning** — the app links to a Slack channel, a worksheet, an invoice PDF, and a Client Drive folder. It does not create channels, read Slack for hours, or change anything in Drive, including Finances folders.
- **Google Calendar sync** — the in-app calendar is the project-date grid only.

## Deploying

Deploy to Vercel and set `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) to your Supabase (or other) Postgres instance, plus `SESSION_SECRET` and `LEAD_INTAKE_SECRET`. The build (`npm run build`) runs `prisma migrate deploy` before `next build`, so every deploy automatically applies any pending schema migrations — nothing extra to run for that part.

### First-time bootstrap on a fresh deploy

Right after the first deploy, the database has tables but no logins and no data. Setup routes are gated by an `x-setup-key` header that must match `SESSION_SECRET`. Set `ALLOWED_USER_EMAILS` to the same two addresses before creating them. Both accounts are admins so either person can open Settings. The admin route returns 409 once two users exist. Passwords are not written into the repo.

```bash
# 1. Create the two staff logins (repeat with the second email)
curl -X POST https://<your-host>/api/setup/admin \
  -H "x-setup-key: $SESSION_SECRET" -H "Content-Type: application/json" \
  -d '{"name":"Owner One","email":"owner.one@example.com","password":"choose-a-real-password"}'

# 2. Import a spreadsheet export (optional)
curl -X POST https://<your-host>/api/setup/import \
  -H "x-setup-key: $SESSION_SECRET" \
  -F "file=@/path/to/Main_Nest.xlsx"

# 3. Seed employees by name (optional). Rates default to $0.
#    Send {"names":["Alex Example","Blake Example"]} or set SEED_EMPLOYEE_NAMES.
curl -X POST https://<your-host>/api/setup/seed-employees \
  -H "x-setup-key: $SESSION_SECRET" -H "Content-Type: application/json" \
  -d '{"names":["Alex Example","Blake Example"]}'

curl https://<your-host>/api/setup/status -H "x-setup-key: $SESSION_SECRET"
```

Load Monday data from a snapshot file on the server (`npm run import:snapshot` or Settings → Load snapshot), not from a live Monday connection. `npm run build` runs `prisma migrate deploy` before `next build`.

### Forgot a login password?

`/api/setup/reset-password` resets any user's password by email — unlike the others it does **not** self-disable, since resetting a password should stay possible indefinitely, not just on a fresh deploy:

```bash
curl -X POST https://<your-deploy>.vercel.app/api/setup/reset-password \
  -H "x-setup-key: $SESSION_SECRET" -H "Content-Type: application/json" \
  -d '{"email":"you@tidynest.com","newPassword":"choose-a-new-real-password"}'
```

This doesn't widen access beyond what `SESSION_SECRET` already grants: it's the same key that signs session cookies, so anyone holding it could forge a valid login directly without this endpoint.

### Replacing all data with a fresh spreadsheet export

Any logged-in Admin can do this from inside the app: **Settings** page → **Replace all data** → choose the new `.xlsx`, type `WIPE`, click the button. This is the same operation as `/api/setup/reimport` below, just gated by a normal Admin session instead of `SESSION_SECRET`, so day-to-day resyncs don't need Vercel access at all.

The underlying `/api/setup/reimport` route (used for first-time bootstrap, or scripting) **deletes every Deal and Contact** (and everything hanging off a Deal — notes, checklist items, worksheet entries, reimbursements, additional charges) and reloads from a new `.xlsx` export, using the same mapping as `/api/setup/import`. Employee and User (login) records are untouched. Unlike the other setup routes this doesn't self-disable — re-syncing from a fresh export is meant to be repeatable — so on top of the `x-setup-key` gate it also requires a literal `confirm=WIPE` field as a second safety check against firing it by accident:

```bash
curl -X POST https://<your-deploy>.vercel.app/api/setup/reimport \
  -H "x-setup-key: $SESSION_SECRET" \
  -F "confirm=WIPE" \
  -F "file=@/path/to/Main_Nest.xlsx"
```

**This is destructive and not undoable** — anything entered directly in the live app since the last import (stage moves, notes, worksheet/reimbursement line items, saved contacts) that isn't reflected in the spreadsheet is gone once this runs. Only use it when the spreadsheet should fully replace what's live, not to pull in a few new leads on top of existing work.

Local dev can use `npm run sandbox:setup`, `npm run db:seed`, or `npm run import:monday` directly. The `/api/setup/*` routes exist so a fresh deploy can be bootstrapped without a shell on the database host. There is no Monday credential to configure.

## Settings and integrations

Every integration is off until the flag is `1` and the secrets below are set in the environment. Settings shows “Not configured” until then. Secrets are not stored in the database or the repo.

| Integration | What works with no credentials | Env vars to turn it on |
| --- | --- | --- |
| Google Sheets backup | Nothing is written. Settings shows the last run once a backup has succeeded. | `GOOGLE_SHEETS_BACKUP_ENABLED=1`, `GOOGLE_SHEETS_BACKUP_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`. Cron: `POST /api/integrations/backup` with header `x-backup-key: $BACKUP_CRON_SECRET`. The sheet needs tabs named Deals, Projects, Contacts, Data problems, Partners, and Activity, shared with the service account. |
| Slack | No messages are sent. Toggles can be saved. | `SLACK_NOTIFICATIONS_ENABLED=1` and `SLACK_WEBHOOK_URL` (incoming webhook). |
| Calendar | `/calendar` and a private iCal feed (`/api/calendar/feed?token=…`, created and revoked in Settings) work with no Google account. | Two-way Google Calendar sync is not built. `GOOGLE_CALENDAR_SYNC_ENABLED`, `GOOGLE_CALENDAR_ID`, and the same service account would be required before that can be added. |
| Drive | Staff can paste and open a Drive or Docs URL on a client or project. Settings can copy existing project links onto clients. Missing links stay on the data-problems list. | No Drive API. Auto-creating folders would need a Drive scope on the service account and a parent folder id. That is not built. |
| Alias | `CLIENT_ALIAS_MAP` JSON, for example `{"Harborlane":"Market Street"}`. A real surname belongs only in that env value. |
