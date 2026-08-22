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
  /**
   * The theme this art was treated for, imposed on the player view while it shows.
   * A backdrop decides the mode: the same scene in another mood is its own entry,
   * because not every scene survives both a lift and a dim.
   */
  theme: 'dark' | 'light'
  /** The file under the app's base URL. */
  file: string
}

export const CAMPAIGN_BACKGROUNDS: CampaignBackground[] = [
  {
    id: 'mountain-fortress',
    label: 'Mountain fortress',
    theme: 'dark',
    file: 'backgrounds/mountain-fortress.webp',
  },
  {
    id: 'hell-fortress',
    label: 'Hell fortress',
    theme: 'dark',
    file: 'backgrounds/hell-fortress.webp',
  },
  {
    id: 'marsh',
    label: 'Marsh',
    theme: 'dark',
    file: 'backgrounds/marsh.webp',
  },
  {
    id: 'sea',
    label: 'Sea',
    theme: 'dark',
    file: 'backgrounds/sea.webp',
  },
  {
    id: 'magical-forest',
    label: 'Magical forest',
    theme: 'dark',
    file: 'backgrounds/magical-forest.webp',
  },
]

/** The bundled backdrop for an id, or undefined for none and for ids we don't ship. */
export function backgroundEntry(id: string | undefined): CampaignBackground | undefined {
  return CAMPAIGN_BACKGROUNDS.find((b) => b.id === id)
}
