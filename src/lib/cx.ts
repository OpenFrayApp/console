// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

/** Join class names, skipping false and undefined parts. */
export function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
