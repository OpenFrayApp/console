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
   * The theme treatments this art actually works in, file per theme. Both keys keep
   * the viewer's own toggle; a single key forces that theme on the player view while
   * the backdrop shows, because not every scene survives both a lift and a dim.
   */
  themes: { dark?: string; light?: string }
}

export const CAMPAIGN_BACKGROUNDS: CampaignBackground[] = [
  {
    id: 'mountain-fortress',
    label: 'Mountain fortress',
    themes: {
      dark: 'backgrounds/mountain-fortress.webp',
      light: 'backgrounds/mountain-fortress-light.webp',
    },
  },
  {
    id: 'magical-forest',
    label: 'Magical forest',
    themes: { dark: 'backgrounds/magical-forest.webp' },
  },
]

/** The bundled backdrop for an id, or undefined for none and for ids we don't ship. */
export function backgroundEntry(id: string | undefined): CampaignBackground | undefined {
  return CAMPAIGN_BACKGROUNDS.find((b) => b.id === id)
}

/** The theme a one-theme backdrop imposes while it shows, or null when both work. */
export function forcedTheme(entry: CampaignBackground): 'dark' | 'light' | null {
  if (entry.themes.dark && entry.themes.light) return null
  return entry.themes.dark ? 'dark' : 'light'
}
