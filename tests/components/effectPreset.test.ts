// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  buildPreset,
  draftEffects,
  emptyDraft,
  presetToDraft,
  type DurChoice,
  type EffectDraft,
} from '../../src/components/effectPreset.ts'
import { BROOD_AND_BLOOM_PRESETS } from '../../src/combat/presets/broodAndBloom.ts'
import { libraryPresets } from '../../src/combat/presets/index.ts'

/** A draft with everything staged, so a round-trip has something to lose. */
function fullDraft(): EffectDraft {
  return {
    ...emptyDraft(),
    duration: '1h',
    conditions: ['Poisoned', 'Prone'],
    hasModifier: true,
    modifier: {
      label: 'Drunk',
      mode: 'disadvantage',
      applies: 'abilityChecks',
      direction: 'outgoing',
      amount: '',
    },
    note: 'Hungover in the morning',
  }
}

describe('draftEffects', () => {
  it('commits the conditions, the modifier and the reminder under one duration', () => {
    const effects = draftEffects(fullDraft())
    expect(effects.map((e) => e.name)).toEqual([
      'Poisoned',
      'Prone',
      'Drunk',
      'Hungover in the morning',
    ])
    for (const e of effects) expect(e.duration).toEqual({ type: 'rounds', rounds: 600 })
  })

  it('leaves out a modifier that was never finished', () => {
    const draft = { ...fullDraft(), modifier: { ...fullDraft().modifier, label: '' } }
    expect(draftEffects(draft).map((e) => e.name)).not.toContain('Drunk')
  })

  it('turns the reminder into a tally under the Counter duration, and nothing else', () => {
    const effects = draftEffects({ ...emptyDraft(), duration: 'counter', note: 'Depth' })
    expect(effects).toHaveLength(1)
    expect(effects[0].duration).toEqual({ type: 'counter', count: 0 })
  })

  // A tally has no timer, so a condition staged beside it has none to inherit.
  it('leaves a condition staged with a counter lasting until removed', () => {
    const effects = draftEffects({
      ...emptyDraft(),
      duration: 'counter',
      conditions: ['Poisoned'],
      note: 'Spore Load',
    })
    expect(effects.find((e) => e.name === 'Poisoned')!.duration).toEqual({ type: 'manual' })
  })

  it('mints a fresh id for every effect, so applying twice never collides', () => {
    const a = draftEffects(fullDraft())
    const b = draftEffects(fullDraft())
    expect(new Set([...a, ...b].map((e) => e.id)).size).toBe(a.length + b.length)
  })
})

describe('buildPreset / presetToDraft', () => {
  it('round-trips a full draft through a preset', () => {
    const draft = fullDraft()
    const back = presetToDraft(buildPreset(draft, 'Drunk'))
    expect(back).toEqual(draft)
  })

  it('round-trips every duration the modal offers', () => {
    const choices: DurChoice[] = [
      'manual',
      'consume',
      'save',
      'counter',
      '1r',
      '1m',
      '10m',
      '1h',
      '8h',
      '24h',
    ]
    for (const duration of choices) {
      const draft: EffectDraft = { ...emptyDraft(), duration, saveDc: '15', note: 'x' }
      const back = presetToDraft(buildPreset(draft, 'n'))
      expect(back.duration, duration).toBe(duration)
      // The DC only survives on the duration that carries one.
      if (duration === 'save') expect(back.saveDc).toBe('15')
    }
  })

  it('applies the same effects before and after a round-trip', () => {
    const draft = fullDraft()
    // Ids are minted per application, so compare everything but them.
    const withoutId = (e: { id: string }) => ({ ...e, id: '' })
    const direct = draftEffects(draft).map(withoutId)
    const viaPreset = draftEffects(presetToDraft(buildPreset(draft, 'Drunk'))).map(withoutId)
    expect(viaPreset).toEqual(direct)
  })

  it('gives each saved preset its own id', () => {
    const draft = fullDraft()
    expect(buildPreset(draft, 'a').id).not.toBe(buildPreset(draft, 'b').id)
  })
})

describe('the Brood & Bloom presets', () => {
  it('ships four stages for each of the seven diseases, plus the two counters', () => {
    expect(BROOD_AND_BLOOM_PRESETS).toHaveLength(30)
    const counters = BROOD_AND_BLOOM_PRESETS.filter((p) => p.counter)
    expect(counters.map((p) => p.name)).toEqual(['Depth', 'Spore Load'])
  })

  it("gives every preset a unique id under the library's source", () => {
    const ids = BROOD_AND_BLOOM_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of BROOD_AND_BLOOM_PRESETS) {
      expect(p.source).toBe('openfray-brood-and-bloom')
      expect(p.id.startsWith('openfray-brood-and-bloom:')).toBe(true)
    }
  })

  it('applies something for every stage — a reminder at least', () => {
    for (const p of BROOD_AND_BLOOM_PRESETS) {
      expect(draftEffects(presetToDraft(p)).length, p.name).toBeGreaterThan(0)
    }
  })

  it('carries the conditions the stages actually name', () => {
    const byName = (n: string) => BROOD_AND_BLOOM_PRESETS.find((p) => p.name === n)!
    expect(byName('Chantry Drought 4').conditions).toEqual(['Incapacitated', 'Unconscious'])
    expect(byName('Mortification 3').conditions).toEqual(['Poisoned'])
    expect(byName('Ankylosis 4').conditions).toEqual(['Incapacitated'])
    // Stage 1 of every disease is a reminder only — nothing it does has an Effect shape.
    expect(byName('Sallow Rot 1').conditions).toEqual([])
    expect(byName('Sallow Rot 1').modifier).toBeNull()
  })

  it('follows the library, not the account', () => {
    expect(libraryPresets([])).toEqual([])
    expect(libraryPresets(['srd-5.2'])).toEqual([])
    expect(libraryPresets(['openfray-brood-and-bloom'])).toEqual(BROOD_AND_BLOOM_PRESETS)
  })
})
