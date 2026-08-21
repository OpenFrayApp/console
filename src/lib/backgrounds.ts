// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/**
 * The bundled player-view backdrops. A campaign stores one of these ids — never a
 * URL — so a player's browser only ever fetches art the app ships itself: the same
 * no-third-party-resources rule the shared pages follow. Files live in
 * `public/backgrounds/`, pre-darkened for text to sit on, with their provenance
 * recorded in CREDITS.md.
 */
export interface CampaignBackground {
  id: string
  /** The picker's label for it. */
  label: string
  /** The dark-theme file under the app's base URL, pre-darkened for rows to sit on. */
  file: string
  /** The light-theme treatment of the same scene, pre-lifted instead of veiled. */
  fileLight: string
}

export const CAMPAIGN_BACKGROUNDS: CampaignBackground[] = [
  {
    id: 'mountain-fortress',
    label: 'Mountain fortress',
    file: 'backgrounds/mountain-fortress.webp',
    fileLight: 'backgrounds/mountain-fortress-light.webp',
  },
  {
    id: 'magical-forest',
    label: 'Magical forest',
    file: 'backgrounds/magical-forest.webp',
    fileLight: 'backgrounds/magical-forest-light.webp',
  },
]

/** The bundled backdrop for an id, or undefined for none and for ids we don't ship. */
export function backgroundEntry(id: string | undefined): CampaignBackground | undefined {
  return CAMPAIGN_BACKGROUNDS.find((b) => b.id === id)
}
