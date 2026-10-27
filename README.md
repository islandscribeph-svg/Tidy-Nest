# Tidy Nest CRM / PM

Custom lead pipeline and light project-management tool for Tidy Nest, replacing the "Main Nest" Monday.com board.

Stack: Next.js (App Router, TypeScript) + Prisma + Postgres, Tailwind. See `/root/.claude/plans` (or ask for `PLAN.md`) for the full design rationale — in short, the old board conflated pipeline **stage** with lead **status** (a "Dead" lead and a "Closed" client both lived in a group called "Closed"), and had no real separation between a *Contact* (a person) and a *Deal* (one pipeline item/engagement). This app fixes both.

## Dashboard

The default landing page (`/dashboard`, both after login and at `/`). A filter bar (Year, Month, Client, Address/City/State, Project Title — defaults to the current month) scopes four stat cards (Win Rate, Total Filtered Deals, Active Pipeline Value, Closed Won Revenue) plus a set of charts, all computed client-side from the full deal set: a "Deals Over Time" line chart (monthly volume for the selected year, or seasonality-by-month across all years when "All Years" is picked), a donut chart for Deals by Service Type, and color-coded breakdown bars for Deals by Stage and Deals by Lead Source. "Export CSV" downloads exactly the filtered set via `/api/reports/export?...` (same query params as the on-screen filters, via `matchesDashboardFilters()` in `src/lib/pipeline.ts` so the two never disagree). Chart colors follow a deliberate categorical/sequential palette in `src/lib/chart-colors.ts` (see "Design notes" below).

Year/Month filtering (and the line chart's x-axis) use each deal's own **project date** — `dateClosed ?? projectStartDate ?? consultDate`, via `projectDate()` in `src/lib/pipeline.ts` — not `createdAt`, since the legacy import gave every record the same `createdAt` (the import timestamp).

## Pipeline

Each pipeline item is a **project** (e.g. "Fall Relocation") belonging to a contact, who may have several projects over time. Within each stage column, projects render as plain color-coded text rows ("Client - Project Name", with the project date on the right) rather than cards — each stage has its own color (see `STAGE_COLORS` in `src/lib/pipeline.ts`), reused consistently on the column header, the row's accent bar, and everywhere else in the app a stage is shown (Dashboard, Calendar).

Stages: **New Leads → Contacted → Consultation → In Progress → Closed**, with **Unqualified** and **Dead** as exit lanes reachable from any stage. Drag a row between columns to change its stage.

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

A separate section (`/employees`) for staff and contractors: name, type, and an hourly rate — independent of whatever rate a project bills the client. Pay periods are semi-monthly (1st–15th, 16th–end of month); each employee's page shows a period selector and that period's hours from two sources merged into one table:
- **Manual entries** — added directly on the timesheet.
- **Project hours** — any Services Worksheet row attributed to that person, pulled in automatically and valued at *their* hourly rate (not the project's billing rate), labeled with which project it came from. Editing those rows happens on the project's Worksheet tab (same row, not a copy) so the two stay in sync.

### Save Contact flow

A new lead isn't a full contact until required fields (name + email-or-phone + service type) are confirmed. Cards missing that show a **Needs info** badge. The **Save Contact** button opens a pre-filled modal; if the email/phone matches an existing contact, you're offered a chance to link to the existing person instead of creating a duplicate (important since many clients are repeat customers across years).

## Local setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Database.** Any Postgres works, including a free [Supabase](https://supabase.com) project — use its "Connect" dialog → **ORM** tab (Prisma) to get both connection strings it expects. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (pooled, port 6543), `DIRECT_URL` (direct, port 5432 — used only for running migrations), `SESSION_SECRET` (`openssl rand -base64 32`), and `LEAD_INTAKE_SECRET`.

3. **Run migrations**
   ```bash
   npm run db:migrate
   ```

4. **Create your first login.** Set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`, then:
   ```bash
   npm run db:seed
   ```

5. **(Optional) Import the legacy Monday export.** Point it at the exported `.xlsx`:
   ```bash
   npm run import:monday -- "/path/to/Main_Nest.xlsx" --dry-run   # preview counts first
   npm run import:monday -- "/path/to/Main_Nest.xlsx"             # actually import
   ```
   The script maps Monday's group + status columns onto the new `Stage` enum (e.g. status `Died` → `DEAD`, `Client - Start`/`Client - Post Project` → `IN_PROGRESS`), normalizes the `Source` free text, and de-dupes contacts by email/phone. It's re-run-safe for contacts (matches existing ones by email/phone) but will create duplicate *deals* if run twice against the same file — only run it once per export.

6. **Run the app**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000, sign in with the admin login from step 4.

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

Top nav bar is olive green (`#5c6b3f`) with the white Tidy Nest wordmark (`public/brand/`) — `src/proxy.ts` (this app's auth guard, Next 16 renamed `middleware.ts` to `proxy.ts`) whitelists `/brand` so the logo loads without a session. Chart colors (Dashboard) follow a deliberate categorical/sequential palette validated for colorblind-safe contrast — see `src/lib/chart-colors.ts` and don't hand-pick new chart colors without the same reasoning (categorical = identity, fixed hue order; sequential = one hue, magnitude; never more than ~6 pie slices).

## Forgot password

The login page's "Forgot password?" link emails a reset link via [Resend](https://resend.com):

1. Sign up at resend.com (free tier: 3,000 emails/month, no card needed) and create an API key.
2. Set `RESEND_API_KEY` in your env vars.
3. **Recipient limits matter here.** Without a verified sending domain, Resend only delivers to the email address you signed up with — reset emails to your actual staff addresses won't arrive. To send to anyone, verify a domain (e.g. `tidynest.com`, or a subdomain like `mail.tidynest.com`) under Resend's Domains settings, which means adding a few DNS records there, then set `EMAIL_FROM` to an address on that domain (e.g. `"Tidy Nest <noreply@tidynest.com>"`).
4. Locally, if `RESEND_API_KEY` is unset the reset link is just logged to the console instead of emailed, so the flow is testable without setting any of this up.

Reset links expire after 1 hour and are single-use; requesting a new one invalidates any still-outstanding link.

## What's deliberately deferred

Per the build plan, these are scoped for later phases rather than this initial build (the schema already has the relevant fields so they can be wired up without a data model change):

- **Email intake** — parsing inbound emails into New Leads (Phase 2).
- **QuickBooks sync** — `invoiceNumber`, `qbDepositPaymentLink`, `qbFinalPaymentLink` fields exist on `Deal` but aren't synced with QuickBooks yet; usage in the legacy board was under 2%.
- **Slack / Google Drive auto-provisioning** — per-client channel/folder creation. Also under 2% usage historically.

## Deploying

Deploy to Vercel and set `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) to your Supabase (or other) Postgres instance, plus `SESSION_SECRET` and `LEAD_INTAKE_SECRET`. The build (`npm run build`) runs `prisma migrate deploy` before `next build`, so every deploy automatically applies any pending schema migrations — nothing extra to run for that part.

### First-time bootstrap on a fresh deploy

Right after the first deploy, the database has tables but no admin login and no data. A few endpoints handle that one-time setup, all gated by an `x-setup-key` header that must match your `SESSION_SECRET` (they self-disable — return 409 — once a user/deal/employee already exists, so they're safe to leave deployed rather than needing removal):

```bash
# 1. Create the first admin login
curl -X POST https://<your-deploy>.vercel.app/api/setup/admin \
  -H "x-setup-key: $SESSION_SECRET" -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"you@tidynest.com","password":"choose-a-real-password"}'

# 2. Import the legacy Monday export (optional, one-time)
curl -X POST https://<your-deploy>.vercel.app/api/setup/import \
  -H "x-setup-key: $SESSION_SECRET" \
  -F "file=@/path/to/Main_Nest.xlsx"

# 3. Seed the 5 named employees/contractors (optional, one-time — rates default
# to $0 and need to be set on the Employees page afterward)
curl -X POST https://<your-deploy>.vercel.app/api/setup/seed-employees \
  -H "x-setup-key: $SESSION_SECRET"

# Check current state at any time (includes each user's email, for #4 below)
curl https://<your-deploy>.vercel.app/api/setup/status -H "x-setup-key: $SESSION_SECRET"
```

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

Local dev can still use `npm run db:seed` / `npm run import:monday` directly against a local or dev database if you prefer — the `/api/setup/*` routes exist specifically so a fresh Vercel+Supabase deploy can be bootstrapped without shell access to the production database.
