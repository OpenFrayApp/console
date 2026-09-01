#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Nicola Mustone

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/backup-integrity.sh
source "$SCRIPT_DIR/lib/backup-integrity.sh"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"; rm -f "${BACKUP_CIPHERTEXT_PATH:-}"' EXIT
DUMP="$WORK/backup.sql.gz"
IDENTITY="$WORK/identity.txt"

backup_need BACKUP_CIPHERTEXT_PATH
backup_need BACKUP_AGE_IDENTITY
backup_have age
backup_have gzip
[[ -z "${AWS_ACCESS_KEY_ID:-}" && -z "${AWS_SECRET_ACCESS_KEY:-}" ]] ||
  backup_die "object-storage credentials must not be available to the decrypt job"
[[ -s "$BACKUP_CIPHERTEXT_PATH" ]] || backup_die "downloaded ciphertext is missing"

echo "$BACKUP_AGE_IDENTITY" >"$IDENTITY"
age --decrypt --identity "$IDENTITY" --output "$DUMP" "$BACKUP_CIPHERTEXT_PATH"
verify_backup_dump "$DUMP"

echo "backup: ciphertext is decryptable and recoverable"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  cat >>"$GITHUB_STEP_SUMMARY" <<'EOF'
## Encrypted backup recovery

- Decryptability: passed
- Gzip integrity: passed
- Required schemas and tables: passed
- Application row recovery: passed
EOF
fi
