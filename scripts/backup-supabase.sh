#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 OpenFray contributors
#
# Daily backup of the Supabase database to S3-compatible object storage (Cloudflare
# R2). The free tier takes no automatic backups, and a signed-in Game Master's
# creatures, spells, characters, campaigns and in-progress fight live nowhere else —
# so this is the only restore path there is.
#
# Shell rather than the repo's usual .mjs because the whole job is three CLIs in a row
# (pg_dump, age, aws s3) and Node would only be shelling out to them anyway.
# Operational tooling, like print-check.mjs; run it by hand before a risky migration.
#
#   scripts/backup-supabase.sh              # dump, verify, upload, prune
#   scripts/backup-supabase.sh --dry-run    # dump and verify only, upload nothing
#
# Environment (the workflow passes these from repository secrets):
#   SUPABASE_DB_URL        session-pooler URI — see local/deploy.md for which one
#   R2_BUCKET              destination bucket
#   R2_ENDPOINT            https://<account>.r2.cloudflarestorage.com
#   AWS_ACCESS_KEY_ID      R2 token id      (read by aws-cli itself)
#   AWS_SECRET_ACCESS_KEY  R2 token secret  (read by aws-cli itself)
#   BACKUP_AGE_RECIPIENT   optional age public key; set it and the dump is encrypted
#   BACKUP_KEEP_DAYS       optional, default 30
#   PG_DUMP                optional path to a specific pg_dump — see the note below

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"

# On Debian and Ubuntu, `pg_dump` is not the binary — it is pg_wrapper, which picks a
# version from the *local* cluster listening on the port you connect to. The session
# pooler is on 5432, the runner has its own PostgreSQL there, and so the wrapper hands
# over that cluster's pg_dump however new a client is installed alongside it. It then
# refuses the newer Supabase server. Point PG_DUMP at a real binary to settle it.
PG_DUMP="${PG_DUMP:-pg_dump}"
STAMP="$(date -u +%Y-%m-%d)"
WORK="$(mktemp -d)"
DUMP="$WORK/openfray-$STAMP.sql.gz"
trap 'rm -rf "$WORK"' EXIT

# Every table the app writes. A dump missing one of these is a broken backup rather
# than a small one, so the check below is fatal.
TABLES=(campaigns creatures effects encounters players spells)

# An *uncompressed* dump smaller than this is empty or truncated, whatever pg_dump's
# exit code said. Measured after decompression on purpose: SQL compresses so well that
# a compressed floor would be a test of the compression ratio, not of the contents.
MIN_BYTES=1024

# Fail with a message on stderr.
die() {
  echo "backup: $*" >&2
  exit 1
}

# Require an environment variable to be set and non-empty.
need() {
  [[ -n "${!1:-}" ]] || die "missing \$$1"
}

# Require a command to be on PATH.
have() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is not installed"
}

# The date KEEP_DAYS ago, as YYYY-MM-DD. GNU and BSD date disagree on the flag, and
# this runs on both (ubuntu-latest in CI, macOS by hand).
cutoff_date() {
  date -u -d "$KEEP_DAYS days ago" +%Y-%m-%d 2>/dev/null ||
    date -u -v-"${KEEP_DAYS}"d +%Y-%m-%d
}

# Refuse a dump that is empty, corrupt, missing a table the app writes, or carrying no
# data at all. Without this the job would happily upload zero bytes every night and look
# healthy. The row counts are printed rather than asserted, because a table can be
# legitimately empty — but *every* table empty is a schema-only dump, which is the shape
# a lost permission or a stray --schema-only takes, and that is fatal.
verify() {
  local body size counts total missing=()
  gzip -t "$DUMP" || die "dump is not a valid gzip stream"
  body=$(gzip -dc "$DUMP")
  size=${#body}
  [[ "$size" -ge "$MIN_BYTES" ]] || die "dump is $size bytes uncompressed — nothing was written"
  for t in "${TABLES[@]}"; do
    grep -q "\"public\".\"$t\"" <<<"$body" || missing+=("$t")
  done
  grep -q '"auth"."users"' <<<"$body" || missing+=("auth.users")
  [[ ${#missing[@]} -eq 0 ]] || die "dump is missing: ${missing[*]}"

  # One line per COPY block: the qualified table name and how many rows it carried.
  counts=$(awk '
    /^COPY /                  { t = $2; n = 0; inblk = 1; next }
    inblk && $0 == "\\."      { printf "%s %d\n", t, n; inblk = 0; next }
    inblk                     { n++ }
  ' <<<"$body")

  echo "backup: $size bytes uncompressed, $(wc -c <"$DUMP" | tr -d ' ') compressed"
  awk '$1 ~ /"public"|"auth"\."(users|identities)"/ { printf "backup:   %-32s %s rows\n", $1, $2 }' \
    <<<"$counts"

  total=$(awk '$1 ~ /"public"/ { s += $2 } END { print s + 0 }' <<<"$counts")
  [[ "$total" -gt 0 ]] || die "every table is empty — this is a schema-only dump, not a backup"
  echo "backup: verified — $total rows across ${#TABLES[@]} tables"
}

# Delete dailies older than the cutoff. Done here rather than by a bucket lifecycle
# rule so the retention is visible in the repo and behaves the same run by hand.
prune() {
  local cutoff name stamp
  cutoff="$(cutoff_date)"
  echo "backup: pruning dailies older than $cutoff"
  aws s3 ls "s3://$R2_BUCKET/daily/" --endpoint-url "$R2_ENDPOINT" |
    awk '{print $4}' |
    while read -r name; do
      [[ -n "$name" ]] || continue
      stamp="${name#openfray-}"
      stamp="${stamp:0:10}"
      [[ "$stamp" < "$cutoff" ]] || continue
      aws s3 rm "s3://$R2_BUCKET/daily/$name" --endpoint-url "$R2_ENDPOINT" --only-show-errors
      echo "backup: pruned $name"
    done
}

need SUPABASE_DB_URL
have "$PG_DUMP"
have gzip
if ! $DRY_RUN; then
  need R2_BUCKET
  need R2_ENDPOINT
  have aws
fi
[[ -n "${BACKUP_AGE_RECIPIENT:-}" ]] && have age

# `public` is the app's data; `auth` is who owns it. Without auth, the owner_id on
# every row points at a user a restored project has never heard of — the two schemas
# are only a backup together. It is also why encrypting this is worth the trouble:
# auth.users holds the email addresses people signed in with.
echo "backup: dumping public + auth with $("$PG_DUMP" --version) …"
"$PG_DUMP" "$SUPABASE_DB_URL" \
  --schema=public \
  --schema=auth \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  --no-owner \
  --no-privileges |
  gzip -9 >"$DUMP"

verify

if [[ -n "${BACKUP_AGE_RECIPIENT:-}" ]]; then
  age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$DUMP.age" "$DUMP"
  rm -f "$DUMP"
  DUMP="$DUMP.age"
  echo "backup: encrypted to $(basename "$DUMP")"
else
  echo "backup: WARNING — no \$BACKUP_AGE_RECIPIENT set, the upload is unencrypted" >&2
fi

if $DRY_RUN; then
  echo "backup: dry run — verified and discarded, nothing uploaded"
  exit 0
fi

KEY="daily/$(basename "$DUMP")"
aws s3 cp "$DUMP" "s3://$R2_BUCKET/$KEY" --endpoint-url "$R2_ENDPOINT" --only-show-errors
echo "backup: uploaded $KEY"

prune

echo "backup: done"
