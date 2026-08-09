# Tidy Nest CRM / PM

Custom lead pipeline and light project-management tool for Tidy Nest, replacing the "Main Nest" Monday.com board.

Stack: Next.js (App Router, TypeScript) + Prisma + Postgres, Tailwind. See `/root/.claude/plans` (or ask for `PLAN.md`) for the full design rationale — in short, the old board conflated pipeline **stage** with lead **status** (a "Dead" lead and a "Closed" client both lived in a group called "Closed"), and had no real separation between a *Contact* (a person) and a *Deal* (one pipeline item/engagement). This app fixes both.

## Pipeline

Stages: **New Leads → Contacted → Consultation → In Progress → Closed**, with **Unqualified** and **Dead** as exit lanes reachable from any stage. Drag a card between columns to change its stage.

Clicking a card opens the deal detail drawer: stage/service/source fields, an activity/notes timeline, and (once a deal reaches In Progress) its linked project/tasks.

### Save Contact flow

A new lead isn't a full contact until required fields (name + email-or-phone + service type) are confirmed. Cards missing that show a **Needs info** badge. The **Save Contact** button opens a pre-filled modal; if the email/phone matches an existing contact, you're offered a chance to link to the existing person instead of creating a duplicate (important since many clients are repeat customers across years).

## Local setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Database.** Any Postgres works, including a free [Supabase](https://supabase.com) project (Project Settings → Database → Connection string). Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `SESSION_SECRET` (`openssl rand -base64 32`), and `LEAD_INTAKE_SECRET`.

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
  "subject": "Kitchen declutter",
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

Deploy to Vercel and point `DATABASE_URL` at your Supabase (or other) Postgres instance. Run `npm run db:deploy` (uses `prisma migrate deploy`, safe for production) as part of your deploy step, and `npm run db:seed` once to create the first login.
