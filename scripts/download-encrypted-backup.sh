#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Nicola Mustone

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/backup-integrity.sh
source "$SCRIPT_DIR/lib/backup-integrity.sh"

# Return an ISO-8601 timestamp as Unix seconds on GNU or BSD date.
timestamp_seconds() {
  local timestamp="$1"
  date -u -d "$timestamp" +%s 2>/dev/null || {
    timestamp="${timestamp%+00:00}"
    timestamp="${timestamp%Z}"
    timestamp="${timestamp%%.*}Z"
    date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$timestamp" +%s
  }
}

# Prove that the recovery credential cannot create or delete objects.
verify_read_permissions() {
  local key
  key="permission-probe/recovery-$(date -u +%s)-$$"
  if aws s3api delete-object --bucket "$R2_BUCKET" --key "$key" \
    --endpoint-url "$R2_ENDPOINT" >/dev/null 2>&1; then
    backup_die "recovery credential can delete backup objects"
  fi
  if aws s3api put-object --bucket "$R2_BUCKET" --key "$key" --body /dev/null \
    --endpoint-url "$R2_ENDPOINT" >/dev/null 2>&1; then
    backup_die "recovery credential can upload backup objects"
  fi
  echo "backup: recovery credential is read-only"
}

backup_need BACKUP_OBJECT_KEY
backup_need BACKUP_CIPHERTEXT_SHA256
backup_need BACKUP_CIPHERTEXT_PATH
backup_need R2_BUCKET
backup_need R2_ENDPOINT
backup_need AWS_ACCESS_KEY_ID
backup_need AWS_SECRET_ACCESS_KEY
backup_have aws
backup_have gzip
[[ -z "${BACKUP_AGE_IDENTITY:-}" ]] ||
  backup_die "decryption material must not be available to the download job"
[[ "$BACKUP_OBJECT_KEY" =~ ^daily/openfray-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}Z-[A-Za-z0-9._-]+\.sql\.gz\.age$ ]] ||
  backup_die "backup object key is invalid"
[[ ! -e "$BACKUP_CIPHERTEXT_PATH" ]] || backup_die "download path already exists"

verify_read_permissions
read -r LAST_MODIFIED CONTENT_LENGTH < <(aws s3api head-object \
  --bucket "$R2_BUCKET" \
  --key "$BACKUP_OBJECT_KEY" \
  --endpoint-url "$R2_ENDPOINT" \
  --query '[LastModified,ContentLength]' \
  --output text)
[[ "$CONTENT_LENGTH" =~ ^[1-9][0-9]*$ ]] || backup_die "encrypted object is empty"
NOW="$(date -u +%s)"
MODIFIED="$(timestamp_seconds "$LAST_MODIFIED")" || backup_die "object freshness is unreadable"
AGE_SECONDS=$((NOW - MODIFIED))
[[ "$AGE_SECONDS" -ge -300 && "$AGE_SECONDS" -le 86400 ]] ||
  backup_die "encrypted object is outside the 24-hour freshness window"

aws s3 cp "s3://$R2_BUCKET/$BACKUP_OBJECT_KEY" "$BACKUP_CIPHERTEXT_PATH" \
  --endpoint-url "$R2_ENDPOINT" --only-show-errors
[[ "$(file_sha256 "$BACKUP_CIPHERTEXT_PATH")" == "$BACKUP_CIPHERTEXT_SHA256" ]] ||
  backup_die "downloaded ciphertext failed its SHA-256 integrity check"
if gzip -t "$BACKUP_CIPHERTEXT_PATH" >/dev/null 2>&1; then
  backup_die "stored object is a plaintext gzip dump"
fi

echo "backup: ciphertext is fresh and intact"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  cat >>"$GITHUB_STEP_SUMMARY" <<'EOF'
## Encrypted backup object recovery

- Object Read-only credential behavior: passed
- Ciphertext freshness (24 hours): passed
- Ciphertext SHA-256 integrity: passed
- Plaintext rejection: passed
EOF
fi
