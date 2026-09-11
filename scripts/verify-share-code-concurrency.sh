#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Nicola Mustone

set -euo pipefail

[[ -n "${RECOVERY_TARGET_DB_URL:-}" ]] || {
  echo "recovery concurrency: missing target" >&2
  exit 1
}
[[ "$RECOVERY_TARGET_DB_URL" =~ @(127\.0\.0\.1|localhost): ]] || {
  echo "recovery concurrency: target is not local" >&2
  exit 1
}
command -v psql >/dev/null 2>&1 || {
  echo "recovery concurrency: psql is unavailable" >&2
  exit 1
}

owner="$(psql "$RECOVERY_TARGET_DB_URL" -Atc 'select gen_random_uuid()')"
code="rc4-concurrency-$(date -u +%s)-$$"
work="$(mktemp -d)"
marker="$work/delete-started"

# Remove the synthetic rows and permanent identity after either outcome.
cleanup() {
  wait "${delete_pid:-}" >/dev/null 2>&1 || true
  psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on --quiet <<SQL >/dev/null 2>&1 || true
delete from auth.users where id = '$owner';
delete from public.recovery_deletions where subject in ('$owner', '$code');
delete from public.share_identities where code = '$code';
SQL
  rm -rf "$work"
}
trap cleanup EXIT

psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on --quiet <<SQL >/dev/null
insert into auth.users (id) values ('$owner');
insert into public.shares (owner_id, code, kind, data)
  values ('$owner', '$code', 'encounter', '{}'::jsonb);
SQL

psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on --quiet <<SQL >/dev/null &
begin;
delete from public.shares where code = '$code';
\! touch "$marker"
select pg_sleep(2);
commit;
SQL
delete_pid=$!
for _ in {1..50}; do
  [[ -e "$marker" ]] && break
  kill -0 "$delete_pid" >/dev/null 2>&1 || {
    echo "recovery concurrency: deletion transaction failed" >&2
    exit 1
  }
  sleep 0.1
done
[[ -e "$marker" ]] || {
  echo "recovery concurrency: deletion transaction did not start" >&2
  exit 1
}

if psql "$RECOVERY_TARGET_DB_URL" --no-psqlrc --set ON_ERROR_STOP=on --quiet \
  --command "insert into public.shares (owner_id, code, kind, data) values ('$owner', '$code', 'encounter', '{}'::jsonb)" \
  >/dev/null 2>&1; then
  echo "recovery concurrency: a revoked share code was reused" >&2
  exit 1
fi
wait "$delete_pid"
delete_pid=""
echo "recovery concurrency: revoked share code remained unavailable"
