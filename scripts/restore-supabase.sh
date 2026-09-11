#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Nicola Mustone

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=scripts/lib/backup-integrity.sh
source "$SCRIPT_DIR/lib/backup-integrity.sh"

backup_need BACKUP_CIPHERTEXT_PATH
backup_need BACKUP_AGE_IDENTITY
backup_need BACKUP_AGE_SECONDS
backup_need BACKUP_CREATED_AT
backup_need RECOVERY_SOURCE_DB_URL
backup_need RECOVERY_TARGET_DB_URL
backup_need RECOVERY_OPERATOR
backup_need RECOVERY_CHECKS_PATH
backup_have age
backup_have gzip
backup_have psql
[[ "$RECOVERY_TARGET_DB_URL" != "$RECOVERY_SOURCE_DB_URL" ]] ||
  backup_die "recovery source and target must differ"
[[ "${RECOVERY_TARGET_KIND:-}" == "local" ]] ||
  backup_die "restore target must be the ephemeral local environment"
[[ "$RECOVERY_TARGET_DB_URL" =~ @(127\.0\.0\.1|localhost): ]] ||
  backup_die "restore target is not local"
[[ "$BACKUP_AGE_SECONDS" =~ ^[0-9]+$ ]] || backup_die "backup age is invalid"
[[ "$BACKUP_CREATED_AT" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] ||
  backup_die "backup creation time is invalid"
[[ -z "${AWS_ACCESS_KEY_ID:-}" && -z "${AWS_SECRET_ACCESS_KEY:-}" ]] ||
  backup_die "object-storage credentials must not be available to the restore job"
[[ -s "$BACKUP_CIPHERTEXT_PATH" ]] || backup_die "downloaded ciphertext is missing"

STARTED_AT="${RECOVERY_STARTED_AT:-$(date -u +%s)}"
[[ "$STARTED_AT" =~ ^[0-9]+$ ]] || backup_die "recovery start time is invalid"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"; rm -f "${BACKUP_CIPHERTEXT_PATH:-}"' EXIT
IDENTITY="$WORK/identity.txt"
DUMP="$WORK/recovery.sql.gz"
LEDGER="$WORK/recovery-deletions.csv"
printf '%s\n' "$BACKUP_AGE_IDENTITY" >"$IDENTITY"
age --decrypt --identity "$IDENTITY" --output "$DUMP" "$BACKUP_CIPHERTEXT_PATH"
verify_backup_dump "$DUMP"
DUMP_CREATED_AT="$(backup_dump_created_at "$DUMP")"
[[ "$DUMP_CREATED_AT" == "$BACKUP_CREATED_AT" ]] ||
  backup_die "encrypted creation time does not match the selected object"
created_seconds="$(timestamp_seconds "$DUMP_CREATED_AT")" || backup_die "backup creation time is unreadable"
BACKUP_AGE_SECONDS=$(($(date -u +%s) - created_seconds))
[[ "$BACKUP_AGE_SECONDS" -ge -300 && "$BACKUP_AGE_SECONDS" -le 86400 ]] ||
  backup_die "backup is outside the 24-hour recovery point"

target_users="$(psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on \
  --tuples-only --no-align --command 'select count(*) from auth.users')"
[[ "$target_users" == "0" ]] || backup_die "ephemeral restore target is not empty"
psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on --quiet \
  --command 'select public.reconcile_recovery_dependencies(false)' >/dev/null
echo "recovery: restoring encrypted recovery point into ephemeral isolation"
gzip -dc "$DUMP" | psql "$RECOVERY_TARGET_DB_URL" \
  --no-psqlrc --set ON_ERROR_STOP=on --single-transaction --quiet
psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on --quiet \
  --command 'select public.reconcile_recovery_dependencies(true)' >/dev/null

for table in "${BACKUP_TABLES[@]}"; do
  expected="$(backup_dump_count "$DUMP" "public.$table")" ||
    backup_die "could not read the backed-up $table row count"
  actual="$(psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on --tuples-only --no-align \
    --command "select count(*) from public.$table")"
  [[ "$actual" == "$expected" ]] || backup_die "$table row count differs after restore"
done
expected_users="$(backup_dump_count "$DUMP" "auth.users")" ||
  backup_die "could not read the backed-up auth.users row count"
actual_users="$(psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on \
  --tuples-only --no-align --command 'select count(*) from auth.users')"
[[ "$actual_users" == "$expected_users" ]] || backup_die "auth.users row count differs after restore"
restored_encounters="$(backup_dump_count "$DUMP" "public.encounters")"
restored_shares="$(backup_dump_count "$DUMP" "public.shares")"

psql "$RECOVERY_SOURCE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on --quiet \
  --command "\copy (select kind, subject, deleted_at from public.recovery_deletions) to '$LEDGER' with (format csv)"
source_accounts="$(awk -F, '$1 == "account" { count++ } END { print count + 0 }' "$LEDGER")"
source_shares="$(awk -F, '$1 == "share" { count++ } END { print count + 0 }' "$LEDGER")"
cat >"$WORK/replay.sql" <<EOF
create temporary table recovery_replay (
  kind text not null,
  subject text not null,
  deleted_at timestamptz not null
);
\copy recovery_replay (kind, subject, deleted_at) from '$LEDGER' with (format csv)
insert into public.recovery_deletions (kind, subject, deleted_at)
  select kind, subject, deleted_at from recovery_replay
  on conflict (kind, subject) do update
    set deleted_at = greatest(public.recovery_deletions.deleted_at, excluded.deleted_at);
select public.apply_recovery_deletions();
do \$fixture\$
declare
  fixture_owner constant uuid := 'f4000000-0000-4000-8000-000000000039';
  fixture_code constant text := 'rc4-deleted-share-fixture';
begin
  insert into auth.users (id) values (fixture_owner);
  insert into public.shares (owner_id, code, kind, data)
    values (fixture_owner, fixture_code, 'encounter', '{}'::jsonb);
  insert into public.recovery_deletions (kind, subject) values
    ('account', fixture_owner::text),
    ('share', fixture_code);
  perform public.apply_recovery_deletions();
  if exists (select 1 from auth.users where id = fixture_owner)
    or exists (select 1 from public.shares where code = fixture_code)
  then raise exception 'RC-4: deletion replay restored a deleted fixture';
  end if;
end
\$fixture\$;
EOF
psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on \
  --single-transaction --quiet --file "$WORK/replay.sql" >/dev/null

psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on --quiet \
  --file "$ROOT/supabase/tests/recovery-restore.sql" >/dev/null
psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on --quiet \
  --file "$ROOT/supabase/tests/database-boundary.sql" >/dev/null

finished_at="$(date -u +%s)"
elapsed_seconds=$((finished_at - STARTED_AT))
[[ "$elapsed_seconds" -le 28800 ]] || backup_die "restore exceeded the eight-hour recovery target"
mkdir -p "$(dirname "$RECOVERY_CHECKS_PATH")"
cat >"$RECOVERY_CHECKS_PATH" <<EOF
{
  "backupAgeSeconds": $BACKUP_AGE_SECONDS,
  "elapsedSeconds": $elapsed_seconds,
  "restoredRows": {
    "encounters": $restored_encounters,
    "shares": $restored_shares,
    "users": $actual_users
  },
  "replayed": {
    "accounts": $((source_accounts + 1)),
    "shares": $((source_shares + 1))
  },
  "databaseVerification": "passed"
}
EOF
echo "recovery: isolated restore and deletion replay passed"
