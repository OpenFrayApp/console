// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { EffectPreset } from '../../schema/preset.ts'
import { BROOD_AND_BLOOM_PRESETS } from './broodAndBloom.ts'

/**
 * Effect presets a library ships. They follow the library rather than the account:
 * enabling _Brood & Bloom_ in Settings puts its disease stages in the Apply effect
 * modal, for an anonymous Game Master as much as a signed-in one — the same rule its
 * creatures and spells already follow. Only the Game Master's own presets need an
 * account, because only those need saving.
 *
 * A library with no presets simply has no entry.
 */
const BY_LIBRARY: Record<string, EffectPreset[]> = {
  'openfray-brood-and-bloom': BROOD_AND_BLOOM_PRESETS,
}

/** The presets shipped by the enabled libraries, in the order the libraries list them. */
export function libraryPresets(enabled: readonly string[]): EffectPreset[] {
  return enabled.flatMap((id) => BY_LIBRARY[id] ?? [])
}

/** The library that ships a preset, or undefined for one the Game Master wrote. */
export function presetLibrary(preset: EffectPreset): string | undefined {
  return preset.source
}
