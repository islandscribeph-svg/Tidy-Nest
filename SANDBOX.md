# Private sandbox

Two staff accounts, a local Postgres database, and a read-only Monday snapshot file. Nothing in this app calls Monday, and the app stores no Monday token.

Requirements: Linux, Node.js 20 or newer, and Postgres installed on the machine (no Docker).

## 1. Database

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo service postgresql start
sudo -u postgres createuser --superuser "$USER" || true
createdb tidynest
```

If `createdb` is not on your user, create the database as the postgres user and use that user in `DATABASE_URL`.

## 2. Environment

```bash
cp .env.example .env
```

Set these in `.env`. Use real passwords only in this file. Do not commit `.env`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Runtime Postgres URL, for example `postgresql://USER@localhost:5432/tidynest` |
| `DIRECT_URL` | Same database, used by Prisma migrations |
| `SESSION_SECRET` | Signs login cookies and gates `/api/setup/*`. `openssl rand -base64 32` |
| `LEAD_INTAKE_SECRET` | `x-intake-key` for `POST /api/leads/intake` |
| `ALLOWED_USER_EMAILS` | Exactly two emails, comma-separated |
| `SANDBOX_USER_1_NAME` / `SANDBOX_USER_1_EMAIL` / `SANDBOX_USER_1_PASSWORD` | First staff account |
| `SANDBOX_USER_2_NAME` / `SANDBOX_USER_2_EMAIL` / `SANDBOX_USER_2_PASSWORD` | Second staff account |
| `CLIENT_ALIAS_MAP` | JSON object of names to display names. Example uses the fake key Harborlane. Put a real surname only here. |
| `MONDAY_SNAPSHOT_PATH` | Absolute path to a local items_page JSON file. Not a URL. |

Do not set a Monday API token, key, or read-only token. `npm run sandbox:setup` exits if any `MONDAY_*` variable other than `MONDAY_SNAPSHOT_PATH` is set.

`NEXT_PUBLIC_BRAND_COLOR` and `NEXT_PUBLIC_BRAND_LOGO_PATH` are optional. Defaults are `#5c6b3f` and `/brand/tidynest-logo-white.webp` (the white wordmark, used on the olive header and the login card). The full wordmark is also at `/brand/tidynest-logo.png`. The favicon is `src/app/favicon.ico`.

## 3. Snapshot file

Pull the board yourself, outside this app, and save Monday's native `items_page` JSON:

```json
{
  "board": { "id": "7506018580", "name": "Main Nest" },
  "pulledAt": "2026-10-26T22:15:00.000Z",
  "items": []
}
```

Point `MONDAY_SNAPSHOT_PATH` at that file. Keep it outside the repository. `monday-snapshot*.json` and `*.snapshot.json` are gitignored. The file `src/lib/monday/fixtures/sample-board.json` is fake data for tests. Setup does not load it unless you set `SANDBOX_ALLOW_FIXTURE=1`, which is only for a smoke test.

## 4. Install, migrate, sign in

```bash
npm install
npm run sandbox:setup
npm run sandbox:start
```

`sandbox:setup` applies migrations, creates the two admin accounts from the env vars above, and, when `MONDAY_SNAPSHOT_PATH` is set, replaces projects and contacts from that file. It prints the two emails and does not print passwords. It does not contact Monday.

Open http://localhost:3000/login and sign in with either sandbox email and its password. There is no registration page. Any other email gets the same invalid-login message.

After `npm run build`, the production server is:

```bash
npm run sandbox:start:prod
```

That runs `next start` on 127.0.0.1 port 3000.

The header and footer show `Data as of <pulledAt> ET · read-only snapshot` after a successful load, or `No snapshot loaded · read-only · Monday is not connected` before one.

## 5. Refresh the snapshot

Replace the JSON file, then either:

```bash
npm run import:snapshot -- /absolute/path/to/your-snapshot.json
```

or, while signed in as either admin, open Settings, type `REPLACE`, and choose **Load snapshot** (reads `MONDAY_SNAPSHOT_PATH`) or upload the JSON file.

That replace-all is idempotent. Manual hours remain, with their project link cleared, because the projects are recreated. Dragging a card on the pipeline changes the local stage until the next snapshot load overwrites it.

## 6. What stays local

- Dates and times are America/New_York. Date-only values are stored at 12:00 UTC.
- Hours are entered on the Hours page. They are not read from Slack, workbooks, or Monday subitems.
- The spreadsheet import on Settings is still available and also maps stage from the Status column.
- Client Drive and Finances folders are links only. The app does not change Drive.
- Display, search, CSV export, and the client report apply `CLIENT_ALIAS_MAP` after import. The database keeps the name from the snapshot. The browser and exports show the display name.
- A contact name on Contacts, a pipeline card, or a deal opens `/clients/[id]`. That page is read-only. Closed deal value is totaled on its own. In progress, consultation, and died projects are listed separately and are not in the total. Missing amounts show as a dash. Download CSV from that page.
