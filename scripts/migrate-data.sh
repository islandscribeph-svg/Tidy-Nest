#!/usr/bin/env bash
# Copy rows from the current Postgres database into a new one.
# Does not write a dump into the repo. Requires pg_dump, pg_restore, and psql.
#
# Usage:
#   SOURCE_DATABASE_URL="postgres://..." TARGET_DATABASE_URL="postgres://..." ./scripts/migrate-data.sh
#
# The target should be an empty database. This script applies Prisma migrations
# there, then loads data only. Run it from your own machine, not inside the Worker.
set -euo pipefail

if [[ -z "${SOURCE_DATABASE_URL:-}" || -z "${TARGET_DATABASE_URL:-}" ]]; then
  echo "Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL."
  echo "Example: SOURCE_DATABASE_URL=postgres://old TARGET_DATABASE_URL=postgres://new ./scripts/migrate-data.sh"
  exit 1
fi

if ! command -v pg_dump >/dev/null || ! command -v pg_restore >/dev/null; then
  echo "Install the Postgres client tools (pg_dump and pg_restore) and run this again."
  exit 1
fi

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

echo "Applying migrations on the target..."
DATABASE_URL="$TARGET_DATABASE_URL" DIRECT_URL="$TARGET_DATABASE_URL" npx prisma migrate deploy

echo "Dumping data from the source (not saved in the repo)..."
pg_dump --data-only --no-owner --no-acl --format=custom --file="$tmpdir/data.dump" "$SOURCE_DATABASE_URL"

echo "Loading data into the target..."
pg_restore --data-only --no-owner --no-acl --dbname="$TARGET_DATABASE_URL" "$tmpdir/data.dump"

echo "Done. Sign in and confirm a project, a contact, and Needs attention before you point the Worker at this database."
