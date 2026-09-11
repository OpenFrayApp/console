#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Nicola Mustone

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/backup-integrity.sh
source "$SCRIPT_DIR/lib/backup-integrity.sh"

backup_need R2_BUCKET
backup_need R2_ENDPOINT
backup_need AWS_ACCESS_KEY_ID
backup_need AWS_SECRET_ACCESS_KEY
backup_have aws
read -r object_key modified size < <(aws s3api list-objects-v2 \
  --bucket "$R2_BUCKET" \
  --prefix daily/ \
  --endpoint-url "$R2_ENDPOINT" \
  --query 'sort_by(Contents,&LastModified)[-1].[Key,LastModified,Size]' \
  --output text)
[[ "$object_key" =~ ^daily/openfray-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}Z-[A-Za-z0-9._-]+\.sql\.gz\.age$ ]] ||
  backup_die "no valid encrypted recovery point exists"
[[ "$size" =~ ^[1-9][0-9]*$ ]] || backup_die "latest encrypted recovery point is empty"
now="$(date -u +%s)"
created="$(timestamp_seconds "$modified")" || backup_die "recovery-point freshness is unreadable"
age_seconds=$((now - created))
[[ "$age_seconds" -ge -300 && "$age_seconds" -le 86400 ]] ||
  backup_die "latest encrypted recovery point is outside the 24-hour window"
echo "backup: latest encrypted recovery point is within 24 hours"
