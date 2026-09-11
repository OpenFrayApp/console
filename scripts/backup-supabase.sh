#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Nicola Mustone

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/backup-integrity.sh
source "$SCRIPT_DIR/lib/backup-integrity.sh"

MODE="${1:-}"
OUTPUT="${2:-}"
if [[ "$MODE" == "--dry-run" && $# -eq 1 ]]; then
  OUTPUT=""
elif [[ "$MODE" == "--output" && $# -eq 2 && "$OUTPUT" == *.age ]]; then
  [[ ! -e "$OUTPUT" ]] || backup_die "encrypted output already exists"
else
  backup_die "usage: backup-supabase.sh --dry-run | --output FILE.age"
fi

PG_DUMP="${PG_DUMP:-pg_dump}"
CREATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STAMP="${CREATED_AT//:/-}"
WORK="$(mktemp -d)"
DUMP="$WORK/openfray-$STAMP.sql.gz"
CIPHERTEXT="$DUMP.age"
SNAPSHOT_PID=""

# Close the exported snapshot and remove every plaintext work file.
cleanup() {
  if [[ -n "$SNAPSHOT_PID" ]]; then
    kill "$SNAPSHOT_PID" >/dev/null 2>&1 || true
    wait "$SNAPSHOT_PID" >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

# Encryption is the first data-boundary preflight. No database command runs before it.
backup_need BACKUP_AGE_RECIPIENT
backup_have age
[[ -z "${BACKUP_AGE_IDENTITY:-}" ]] ||
  backup_die "\$BACKUP_AGE_IDENTITY must not be available to the export job"
if ! age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" \
  --output "$WORK/encryption-preflight.age" /dev/null; then
  backup_die "\$BACKUP_AGE_RECIPIENT is invalid"
fi
rm -f "$WORK/encryption-preflight.age"
echo "backup: encryption configuration verified before export"

backup_need SUPABASE_DB_URL
backup_have "$PG_DUMP"
backup_have gzip
backup_have psql
[[ -z "${AWS_ACCESS_KEY_ID:-}" && -z "${AWS_SECRET_ACCESS_KEY:-}" ]] ||
  backup_die "object-storage credentials must not be available to the export job"

SNAPSHOT_CONTROL="$WORK/snapshot-control"
SNAPSHOT_OUTPUT="$WORK/snapshot-output"
mkfifo "$SNAPSHOT_CONTROL"
psql "$SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align --quiet \
  <"$SNAPSHOT_CONTROL" >"$SNAPSHOT_OUTPUT" &
SNAPSHOT_PID=$!
exec 9>"$SNAPSHOT_CONTROL"
printf '%s\n' 'begin isolation level repeatable read read only;' 'select pg_export_snapshot();' >&9
for _ in {1..100}; do
  [[ -s "$SNAPSHOT_OUTPUT" ]] && break
  kill -0 "$SNAPSHOT_PID" >/dev/null 2>&1 || backup_die "could not export a backup snapshot"
  sleep 0.1
done
SNAPSHOT="$(tr -d '[:space:]' <"$SNAPSHOT_OUTPUT")"
[[ "$SNAPSHOT" =~ ^[0-9A-F]+-[0-9A-F]+-[0-9]+$ ]] || backup_die "exported backup snapshot is invalid"

echo "backup: dumping public + auth with $("$PG_DUMP" --version) …"
# The isolated target owns provider-role defaults; only the tracked postgres defaults travel.
{
  printf '%s\n' "-- openfray-backup-created-at: $CREATED_AT"
  "$PG_DUMP" "$SUPABASE_DB_URL" \
    --snapshot="$SNAPSHOT" \
    --data-only \
    --table=auth.users \
    --table=auth.identities \
    --quote-all-identifiers \
    --no-owner \
    --no-privileges
  "$PG_DUMP" "$SUPABASE_DB_URL" \
    --snapshot="$SNAPSHOT" \
    --schema=public \
    --clean \
    --if-exists \
    --quote-all-identifiers \
    --no-owner
} | awk '/^ALTER DEFAULT PRIVILEGES FOR ROLE / && $6 != "\"postgres\"" { next } { print }' |
  gzip -9 >"$DUMP"
printf '%s\n' 'rollback;' '\q' >&9
exec 9>&-
wait "$SNAPSHOT_PID"
SNAPSHOT_PID=""

verify_backup_dump "$DUMP"
age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$CIPHERTEXT" "$DUMP"
rm -f "$DUMP"
if [[ ! -s "$CIPHERTEXT" ]] || gzip -t "$CIPHERTEXT" >/dev/null 2>&1; then
  backup_die "encrypted output is missing or still a readable gzip dump"
fi
CIPHERTEXT_SHA256="$(file_sha256 "$CIPHERTEXT")"
echo "backup: encrypted $(basename "$CIPHERTEXT") (sha256 $CIPHERTEXT_SHA256)"

if [[ "$MODE" == "--dry-run" ]]; then
  echo "backup: dry run — encrypted backup verified and discarded, nothing uploaded"
  exit 0
fi

mv "$CIPHERTEXT" "$OUTPUT"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  printf 'ciphertext_path=%s\nciphertext_sha256=%s\nbackup_created_at=%s\n' \
    "$OUTPUT" "$CIPHERTEXT_SHA256" "$CREATED_AT" >>"$GITHUB_OUTPUT"
fi
echo "backup: ciphertext ready for isolated upload"
