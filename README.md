# Tidy Nest CRM / PM

Custom lead pipeline and light project-management tool for Tidy Nest, replacing the "Main Nest" Monday.com board.

Stack: Next.js (App Router, TypeScript) + Prisma + Postgres, Tailwind. See `/root/.claude/plans` (or ask for `PLAN.md`) for the full design rationale — in short, the old board conflated pipeline **stage** with lead **status** (a "Dead" lead and a "Closed" client both lived in a group called "Closed"), and had no real separation between a *Contact* (a person) and a *Deal* (one pipeline item/engagement). This app fixes both.

## Pipeline

Each pipeline item is a **project** (e.g. "Fall Relocation") belonging to a contact, who may have several projects over time. Cards show the project title, the contact's name, and the service type.

Stages: **New Leads → Contacted → Consultation → In Progress → Closed**, with **Unqualified** and **Dead** as exit lanes reachable from any stage. Drag a card between columns to change its stage.

Clicking a card opens the project detail drawer, with tabs that appear as the project matures:
- **Details** (always shown): stage/service/source/value fields and the activity/notes timeline.
- **Consultation** (once the project reaches Consultation): a checklist, the consultation date, and a "Create Consult Invoice on QuickBooks" button — currently a manual bridge (opens QuickBooks in a new tab; paste the resulting invoice number/link back into the two fields below it) until real QuickBooks API integration is built.
- **Services Worksheet** (once In Progress): billable time entries (Description/Hours/Rate, with a computed total) and a notes field.
- **Reimbursements** (once In Progress): per-vendor expense tracking (Item Details/Qty/Unit Price, computed subtotal, fillable shipping fee + sales tax, computed grand total per vendor), with a combined overview once there's more than one vendor.

Tab visibility is based on the project's current stage reaching that point, not a full history — Unqualified/Dead are treated as having reached the maximum tab set so already-entered data is never hidden, even if that means an empty tab shows for a project that exited very early.

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

## What's deliberately deferred

Per the build plan, these are scoped for later phases rather than this initial build (the schema already has the relevant fields so they can be wired up without a data model change):

- **Email intake** — parsing inbound emails into New Leads (Phase 2).
- **QuickBooks sync** — `invoiceNumber`, `qbDepositPaymentLink`, `qbFinalPaymentLink` fields exist on `Deal` but aren't synced with QuickBooks yet; usage in the legacy board was under 2%.
- **Slack / Google Drive auto-provisioning** — per-client channel/folder creation. Also under 2% usage historically.

## Deploying

Deploy to Vercel and set `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) to your Supabase (or other) Postgres instance, plus `SESSION_SECRET` and `LEAD_INTAKE_SECRET`. The build (`npm run build`) runs `prisma migrate deploy` before `next build`, so every deploy automatically applies any pending schema migrations — nothing extra to run for that part.

### First-time bootstrap on a fresh deploy

Right after the first deploy, the database has tables but no admin login and no data. Two endpoints handle that one-time setup, both gated by an `x-setup-key` header that must match your `SESSION_SECRET` (they self-disable — return 409 — once a user/deal already exists, so they're safe to leave deployed rather than needing removal):

```bash
# 1. Create the first admin login
curl -X POST https://<your-deploy>.vercel.app/api/setup/admin \
  -H "x-setup-key: $SESSION_SECRET" -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"you@tidynest.com","password":"choose-a-real-password"}'

# 2. Import the legacy Monday export (optional, one-time)
curl -X POST https://<your-deploy>.vercel.app/api/setup/import \
  -H "x-setup-key: $SESSION_SECRET" \
  -F "file=@/path/to/Main_Nest.xlsx"

# Check current state at any time
curl https://<your-deploy>.vercel.app/api/setup/status -H "x-setup-key: $SESSION_SECRET"
```

Local dev can still use `npm run db:seed` / `npm run import:monday` directly against a local or dev database if you prefer — the `/api/setup/*` routes exist specifically so a fresh Vercel+Supabase deploy can be bootstrapped without shell access to the production database.
