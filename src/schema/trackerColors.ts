// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import * as v from 'valibot'

const markerColor = v.pipe(v.string(), v.regex(/^#[0-9a-f]{6}$/i))

/** Opaque marker colors; null uses the inherited color or the theme default. */
export const trackerColorsSchema = v.strictObject({
  creature: v.nullable(markerColor),
  ally: v.nullable(markerColor),
})

export type TrackerColors = v.InferOutput<typeof trackerColorsSchema>
export const DEFAULT_TRACKER_COLORS: TrackerColors = { creature: null, ally: null }

/** Restore each marker independently when stored preferences are missing or invalid. */
export function readTrackerColors(value: unknown): TrackerColors {
  const data = (value ?? {}) as Record<string, unknown>
  const creature = v.safeParse(markerColor, data.creature)
  const ally = v.safeParse(markerColor, data.ally)
  return {
    creature: creature.success ? creature.output : null,
    ally: ally.success ? ally.output : null,
  }
}

/** Resolve each player-view override against its corresponding tracker color. */
export function resolveTrackerColors(
  overrides: TrackerColors,
  tracker: TrackerColors,
): TrackerColors {
  return {
    creature: overrides.creature ?? tracker.creature,
    ally: overrides.ally ?? tracker.ally,
  }
}
