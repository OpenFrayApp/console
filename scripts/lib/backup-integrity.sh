#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Nicola Mustone

BACKUP_TABLES=(campaigns creatures effects encounters players recovery_deletions shares spells)
BACKUP_MIN_BYTES=1024

# Stop backup work with a diagnostic.
backup_die() {
  echo "backup: $*" >&2
  exit 1
}

# Require an environment variable to be set and non-empty.
backup_need() {
  [[ -n "${!1:-}" ]] || backup_die "missing \$$1"
}

# Require a command to be on PATH.
backup_have() {
  command -v "$1" >/dev/null 2>&1 || backup_die "$1 is not installed"
}

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

# Return a portable SHA-256 digest for a file.
file_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

# Return the number of rows in one COPY block from a verified dump.
backup_dump_count() {
  local dump="$1" relation="$2" quoted
  quoted="\"${relation/./\".\"}\""
  gzip -dc "$dump" | awk -v relation="$quoted" '
    /^COPY / { inblock = index($0, relation) > 0; count = 0; next }
    inblock && $0 == "\\." { print count; found = 1; exit }
    inblock { count++ }
    END { if (!found) exit 1 }
  '
}

# Refuse a dump that is empty, corrupt, incomplete, or carrying no application data.
verify_backup_dump() {
  local dump="$1" body size counts total missing=()
  gzip -t "$dump" || backup_die "dump is not a valid gzip stream"
  body=$(gzip -dc "$dump")
  size=${#body}
  [[ "$size" -ge "$BACKUP_MIN_BYTES" ]] ||
    backup_die "dump is $size bytes uncompressed — nothing was written"
  for table in "${BACKUP_TABLES[@]}"; do
    grep -q "\"public\".\"$table\"" <<<"$body" || missing+=("$table")
  done
  grep -q '"auth"."users"' <<<"$body" || missing+=("auth.users")
  [[ ${#missing[@]} -eq 0 ]] || backup_die "dump is missing: ${missing[*]}"

  counts=$(awk '
    /^COPY /                  { t = $2; n = 0; inblk = 1; next }
    inblk && $0 == "\\."      { printf "%s %d\n", t, n; inblk = 0; next }
    inblk                     { n++ }
  ' <<<"$body")

  echo "backup: $size bytes uncompressed, $(wc -c <"$dump" | tr -d ' ') compressed"
  awk '$1 ~ /"public"|"auth"\."(users|identities)"/ { printf "backup:   %-32s %s rows\n", $1, $2 }' \
    <<<"$counts"

  total=$(awk '$1 ~ /"public"/ { s += $2 } END { print s + 0 }' <<<"$counts")
  [[ "$total" -gt 0 ]] ||
    backup_die "every table is empty — this is a schema-only dump, not a backup"
  echo "backup: verified — $total rows across ${#BACKUP_TABLES[@]} tables"
}
