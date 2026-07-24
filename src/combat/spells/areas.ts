// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { reminder } from '../effects.ts'
import { timedDuration, type SpellEffectTable } from './shared.ts'

/**
 * Zones whose consequence lands on the creatures standing in them. The zone itself
 * isn't board state we track — the badge goes on whoever is inside, and the GM clears
 * it when they walk out. Walls and terrain that only shape the map aren't modelled.
 *
 * Targeting is `enemy` for zones a caster drops on foes and `ally` for the ones that
 * cover their own side; the GM re-picks either way, since a zone doesn't choose sides.
 */

export const AREA_SPELLS: SpellEffectTable = {
  'fog cloud': {
    summary: 'Heavily Obscured inside the fog',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      reminder('Fog Cloud', 'Heavily Obscured', { source, duration: timedDuration(spell) }),
    ],
  },
  darkness: {
    summary: 'Magical darkness that Darkvision cannot see through',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      reminder('Darkness', 'Magical darkness', { source, duration: timedDuration(spell) }),
    ],
  },
  silence: {
    summary: 'No sound: Deafened, and no verbal components',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      reminder('Silence', 'Silenced: no V spells', { source, duration: timedDuration(spell) }),
    ],
  },
  'spike growth': {
    summary: 'Difficult Terrain that deals 2d4 piercing per 5 feet moved',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      reminder('Spike Growth', 'Spikes: 2d4 per 5 ft', { source, duration: timedDuration(spell) }),
    ],
  },
  cloudkill: {
    summary: 'Heavily Obscured, with poison damage each turn inside',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      reminder('Cloudkill', 'Heavily Obscured', { source, duration: timedDuration(spell) }),
    ],
  },
  'insect plague': {
    summary: 'Lightly Obscured and Difficult Terrain inside the swarm',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      reminder('Insect Plague', 'Lightly Obscured', { source, duration: timedDuration(spell) }),
    ],
  },
  'incendiary cloud': {
    summary: 'Heavily Obscured, with fire damage each turn inside',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      reminder('Incendiary Cloud', 'Heavily Obscured', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
}
