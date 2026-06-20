// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

/** Display a challenge rating, rendering fractional CRs as fractions. */
export function formatCr(cr: number | undefined): string {
  if (cr == null) return '—'
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}
