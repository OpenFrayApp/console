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

export interface SourceInfo {
  label: string
  /** Where the content came from; absent for user-authored content. */
  url?: string
}

/** Human label + link for a content source (see CREDITS.md for attribution). */
export function sourceInfo(source: string): SourceInfo {
  switch (source) {
    case 'srd-5.2':
      return { label: 'SRD 5.2 (CC-BY-4.0)', url: 'https://www.dndbeyond.com/srd' }
    case 'srd-5.1':
      return { label: 'SRD 5.1 (CC-BY-4.0)', url: 'https://www.dndbeyond.com/srd' }
    case 'custom':
      return { label: 'Custom (you)' }
    default:
      return { label: source }
  }
}
