#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Nicola Mustone

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/backup-integrity.sh
source "$SCRIPT_DIR/lib/backup-integrity.sh"

KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
[[ "$KEEP_DAYS" =~ ^[1-9][0-9]*$ ]] || backup_die "\$BACKUP_KEEP_DAYS must be a positive integer"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Return the retention cutoff in UTC on GNU or BSD date.
cutoff_date() {
  date -u -d "$KEEP_DAYS days ago" +%Y-%m-%d 2>/dev/null ||
    date -u -v-"${KEEP_DAYS}"d +%Y-%m-%d
}

# Return the current encrypted daily listing.
list_dailies() {
  aws s3 ls "s3://$R2_BUCKET/daily/" --endpoint-url "$R2_ENDPOINT"
}

backup_need BACKUP_OBJECT_KEY
backup_need BACKUP_AGE_RECIPIENT
backup_need R2_BUCKET
backup_need R2_ENDPOINT
backup_need AWS_ACCESS_KEY_ID
backup_need AWS_SECRET_ACCESS_KEY
backup_have age
backup_have aws
[[ -z "${BACKUP_AGE_IDENTITY:-}" ]] ||
  backup_die "decryption material must not be available to the retention job"
[[ -z "${SUPABASE_DB_URL:-}" ]] ||
  backup_die "database credentials must not be available to the retention job"

PROBE="$WORK/deletion-probe.age"
PROBE_KEY="permission-probe/retention-$(date -u +%s)-$$.age"
age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$PROBE" /dev/null
aws s3 cp "$PROBE" "s3://$R2_BUCKET/$PROBE_KEY" \
  --endpoint-url "$R2_ENDPOINT" --only-show-errors
aws s3 rm "s3://$R2_BUCKET/$PROBE_KEY" --endpoint-url "$R2_ENDPOINT" --only-show-errors
echo "backup: encrypted deletion probe passed"

CUTOFF="$(cutoff_date)"
LISTING="$(list_dailies)"
VERIFIED_NAME="${BACKUP_OBJECT_KEY#daily/}"
awk '{print $4}' <<<"$LISTING" | grep -Fxq "$VERIFIED_NAME" ||
  backup_die "verified backup disappeared before retention"

echo "backup: pruning encrypted dailies older than $CUTOFF"
while read -r name; do
  [[ -n "$name" ]] || continue
  [[ "$name" == *.age ]] || backup_die "unencrypted object found in daily retention path: $name"
  OBJECT_STAMP="${name#openfray-}"
  OBJECT_STAMP="${OBJECT_STAMP:0:10}"
  [[ "$OBJECT_STAMP" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] ||
    backup_die "backup object has no retention date: $name"
  [[ "$OBJECT_STAMP" < "$CUTOFF" ]] || continue
  aws s3 rm "s3://$R2_BUCKET/daily/$name" --endpoint-url "$R2_ENDPOINT" --only-show-errors
  echo "backup: pruned $name"
done < <(awk '{print $4}' <<<"$LISTING")

REMAINING="$(list_dailies)"
awk '{print $4}' <<<"$REMAINING" | grep -Fxq "$VERIFIED_NAME" ||
  backup_die "verified backup was removed during retention"
while read -r name; do
  [[ -n "$name" ]] || continue
  OBJECT_STAMP="${name#openfray-}"
  OBJECT_STAMP="${OBJECT_STAMP:0:10}"
  [[ "$OBJECT_STAMP" < "$CUTOFF" ]] && backup_die "expired backup remains after retention: $name"
done < <(awk '{print $4}' <<<"$REMAINING")

echo "backup: retention and deletion permissions verified"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  cat >>"$GITHUB_STEP_SUMMARY" <<'EOF'
## Encrypted backup retention

- Encrypted deletion probe: passed
- Retention cutoff: passed
- Newly recovered object preserved: passed
- Decryption identity absent from retention: passed
EOF
fi
