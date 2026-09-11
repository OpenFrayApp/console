#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Nicola Mustone

set -euo pipefail

event="${1:-}"
case "$event" in
  backup_stale|restore_failed|restore_failure_exercise) ;;
  *) echo "recovery monitor: invalid event" >&2; exit 1 ;;
esac

[[ -n "${RECOVERY_MONITOR_WEBHOOK:-}" ]] || {
  echo "recovery monitor: missing webhook" >&2
  exit 1
}
command -v curl >/dev/null 2>&1 || {
  echo "recovery monitor: curl is unavailable" >&2
  exit 1
}

payload=$(printf '{"event":"%s","service":"openfray-recovery"}' "$event")
curl --fail --silent --show-error \
  --header 'content-type: application/json' \
  --data "$payload" \
  "$RECOVERY_MONITOR_WEBHOOK" >/dev/null
echo "recovery monitor: $event delivered"
