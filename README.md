# Tidy Nest CRM / PM

Custom lead pipeline and light project-management tool for Tidy Nest, replacing the "Main Nest" Monday.com board.

Stack: Next.js (App Router, TypeScript) + Prisma + Postgres, Tailwind. See `/root/.claude/plans` (or ask for `PLAN.md`) for the full design rationale — in short, the old board conflated pipeline **stage** with lead **status** (a "Dead" lead and a "Closed" client both lived in a group called "Closed"), and had no real separation between a *Contact* (a person) and a *Deal* (one pipeline item/engagement). This app fixes both.

## Pipeline

Each pipeline item is a **project** (e.g. "Fall Relocation") belonging to a contact, who may have several projects over time. Cards show the project title, the contact's name, and the service type.

Stages: **New Leads → Contacted → Consultation → In Progress → Closed**, with **Unqualified** and **Dead** as exit lanes reachable from any stage. Drag a card between columns to change its stage.

Clicking a card opens the project detail drawer, with tabs that appear as the project matures:
- **Details** (always shown): stage/service/source/value fields and the activity/notes timeline.
- **Consultation** (once the project reaches Consultation): a checklist, the consultation date, and a "Create Consult Invoice on QuickBooks" button — currently a manual bridge (opens QuickBooks in a new tab; paste the resulting invoice number/link back into the two fields below it) until real QuickBooks API integration is built.
- **Services Worksheet** (once In Progress): billable time entries — Person / Date / Description / Hours / Rate, with a computed total — and a notes field. `Rate` here is what the *client* is billed; if a row is attributed to someone, those hours also land on that person's timesheet (see Employees below), valued at *their own* hourly rate instead.
- **Reimbursements** (once In Progress): per-vendor expense tracking (Item Details/Qty/Unit Price, computed subtotal, fillable shipping fee + sales tax, computed grand total per vendor), with a combined overview once there's more than one vendor.
- **Total Billables** (once In Progress): Service Hours Total + Reimbursements Total + itemized additional charges = Invoice Total, and a "Create Project Invoice on QuickBooks" button (same manual-bridge pattern as the Consultation tab's invoice button).

Tab visibility is based on the project's current stage reaching that point, not a full history — Unqualified/Dead are treated as having reached the maximum tab set so already-entered data is never hidden, even if that means an empty tab shows for a project that exited very early.

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

## Reports

`/reports` shows deal counts by stage/service/source and win rate, with a CSV export button (`/api/reports/export`) for spreadsheet-style sharing — one-way export, not a live Google Sheets sync.

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

Local dev can still use `npm run db:seed` / `npm run import:monday` directly against a local or dev database if you prefer — the `/api/setup/*` routes exist specifically so a fresh Vercel+Supabase deploy can be bootstrapped without shell access to the production database.
