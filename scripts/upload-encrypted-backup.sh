#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Nicola Mustone

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/backup-integrity.sh
source "$SCRIPT_DIR/lib/backup-integrity.sh"

backup_need BACKUP_CIPHERTEXT_PATH
backup_need BACKUP_CIPHERTEXT_SHA256
backup_need R2_BUCKET
backup_need R2_ENDPOINT
backup_need AWS_ACCESS_KEY_ID
backup_need AWS_SECRET_ACCESS_KEY
backup_have aws
backup_have gzip
[[ -z "${BACKUP_AGE_IDENTITY:-}" ]] ||
  backup_die "decryption material must not be available to the upload job"
[[ -z "${SUPABASE_DB_URL:-}" ]] ||
  backup_die "database credentials must not be available to the upload job"
[[ -s "$BACKUP_CIPHERTEXT_PATH" ]] || backup_die "ciphertext is missing"
[[ "$(file_sha256 "$BACKUP_CIPHERTEXT_PATH")" == "$BACKUP_CIPHERTEXT_SHA256" ]] ||
  backup_die "ciphertext changed before upload"
if gzip -t "$BACKUP_CIPHERTEXT_PATH" >/dev/null 2>&1; then
  backup_die "refusing to upload a plaintext gzip dump"
fi

STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
UNIQUE="${GITHUB_RUN_ID:-manual}-${GITHUB_RUN_ATTEMPT:-1}-$$"
KEY="daily/openfray-$STAMP-$UNIQUE.sql.gz.age"
LOCAL_BYTES="$(wc -c <"$BACKUP_CIPHERTEXT_PATH" | tr -d ' ')"
aws s3 cp "$BACKUP_CIPHERTEXT_PATH" "s3://$R2_BUCKET/$KEY" \
  --endpoint-url "$R2_ENDPOINT" --only-show-errors
REMOTE_BYTES="$(aws s3api head-object --bucket "$R2_BUCKET" --key "$KEY" \
  --endpoint-url "$R2_ENDPOINT" --query ContentLength --output text)"
[[ "$REMOTE_BYTES" == "$LOCAL_BYTES" ]] || backup_die "uploaded ciphertext size does not match"
rm -f "$BACKUP_CIPHERTEXT_PATH"
echo "backup: uploaded immutable ciphertext $KEY"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  printf 'object_key=%s\n' "$KEY" >>"$GITHUB_OUTPUT"
fi
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  cat >>"$GITHUB_STEP_SUMMARY" <<'EOF'
## Encrypted backup upload

- Immutable ciphertext upload: passed
- Ciphertext size check: passed
- Ciphertext SHA-256 recorded: passed
- Decryption identity absent from upload: passed
EOF
fi
