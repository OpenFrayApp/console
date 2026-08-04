// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  buildPreset,
  draftEffects,
  emptyDraft,
  emptyModifier,
  presetToDraft,
  type DurChoice,
  type EffectDraft,
} from '../../src/components/effectPreset.ts'
import type { EffectPreset, PresetPart } from '../../src/schema/preset.ts'
import { BROOD_AND_BLOOM_PRESETS } from '../../src/combat/presets/broodAndBloom.ts'
import { STRONG_WATERS_PRESETS } from '../../src/combat/presets/strongWaters.ts'
import { libraryPresets } from '../../src/combat/presets/index.ts'

/** The parts of one kind, since most assertions care about a single shape. */
function partsOf<K extends PresetPart['kind']>(
  preset: EffectPreset,
  kind: K,
): Extract<PresetPart, { kind: K }>[] {
  return preset.parts.filter((p): p is Extract<PresetPart, { kind: K }> => p.kind === kind)
}

/** A draft with everything staged, so a round-trip has something to lose. */
function fullDraft(): EffectDraft {
  return {
    ...emptyDraft(),
    duration: '1h',
    bundleName: 'Drunk',
    conditions: ['Poisoned', 'Prone'],
    modifiers: [
      {
        label: 'Drunk',
        mode: 'disadvantage',
        applies: 'abilityChecks',
        direction: 'outgoing',
        amount: '',
        abilities: ['wis'],
      },
    ],
    notes: ['Hungover in the morning'],
    counters: [{ name: 'Craving', gmOnly: true }],
  }
}

describe('draftEffects', () => {
  it('commits the conditions, the modifiers, the reminders and the counters at once', () => {
    const effects = draftEffects(fullDraft())
    expect(effects.map((e) => e.name)).toEqual([
      'Poisoned',
      'Prone',
      'Drunk',
      'Hungover in the morning',
      'Craving',
    ])
    for (const e of effects) {
      if (e.duration.type === 'counter') continue
      expect(e.duration).toEqual({ type: 'rounds', rounds: 600 })
    }
  })

  it('stamps one bundle on the timed parts, and never on a counter', () => {
    const effects = draftEffects(fullDraft())
    const bundles = new Set(
      effects.filter((e) => e.duration.type !== 'counter').map((e) => e.bundle?.id),
    )
    expect(bundles.size).toBe(1)
    expect([...bundles][0]).toBeTruthy()
    for (const e of effects) {
      if (e.duration.type !== 'counter') expect(e.bundle?.name).toBe('Drunk')
      else expect(e.bundle).toBeUndefined()
    }
  })

  it('mints a fresh bundle per application, so two Drunk creatures never share one', () => {
    const a = draftEffects(fullDraft())[0].bundle?.id
    const b = draftEffects(fullDraft())[0].bundle?.id
    expect(a).not.toBe(b)
  })

  it('applies loose effects with no bundle when the name is blank', () => {
    const effects = draftEffects({ ...fullDraft(), bundleName: '' })
    for (const e of effects) expect(e.bundle).toBeUndefined()
  })

  it('carries a modifier narrowed to its abilities', () => {
    const effects = draftEffects(fullDraft())
    const drunk = effects.find((e) => e.name === 'Drunk')!
    expect(drunk.modifier?.abilities).toEqual(['wis'])
  })

  it('keeps a counter gmOnly and the rest visible', () => {
    const effects = draftEffects(fullDraft())
    expect(effects.find((e) => e.name === 'Craving')?.gmOnly).toBe(true)
    expect(effects.find((e) => e.name === 'Poisoned')?.gmOnly).toBeUndefined()
  })

  it('leaves out a modifier that was never finished', () => {
    const draft = { ...fullDraft(), modifiers: [{ ...emptyModifier(), label: '' }] }
    expect(draftEffects(draft).map((e) => e.name)).not.toContain('Drunk')
  })

  it('skips blank reminders and unnamed counters — staged UI state, not parts', () => {
    const draft: EffectDraft = {
      ...emptyDraft(),
      notes: ['', '  '],
      counters: [{ name: '', gmOnly: false }],
    }
    expect(draftEffects(draft)).toHaveLength(0)
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
    const choices: DurChoice[] = ['manual', 'consume', 'save', '1r', '1m', '10m', '1h', '8h', '24h']
    for (const duration of choices) {
      const draft: EffectDraft = { ...emptyDraft(), duration, saveDc: '15', notes: ['x'] }
      const back = presetToDraft(buildPreset(draft, 'n'))
      expect(back.duration, duration).toBe(duration)
      // The DC only survives on the duration that carries one.
      if (duration === 'save') expect(back.saveDc).toBe('15')
    }
  })

  it('applies the same effects before and after a round-trip', () => {
    const draft = fullDraft()
    // Ids and bundle ids are minted per application, so compare everything but them.
    const strip = (e: { id: string; bundle?: { id: string; name: string } }) => ({
      ...e,
      id: '',
      bundle: e.bundle ? { ...e.bundle, id: '' } : undefined,
    })
    const direct = draftEffects(draft).map(strip)
    const viaPreset = draftEffects(presetToDraft(buildPreset(draft, 'Drunk'))).map(strip)
    expect(viaPreset).toEqual(direct)
  })

  it('names the staged bundle after the preset', () => {
    const preset = buildPreset(fullDraft(), 'Hexed')
    expect(presetToDraft(preset).bundleName).toBe('Hexed')
  })

  it('gives each saved preset its own id', () => {
    const draft = fullDraft()
    expect(buildPreset(draft, 'a').id).not.toBe(buildPreset(draft, 'b').id)
  })
})

describe('the Custom duration', () => {
  it('turns an amount and unit into rounds — 3 hours is 1800', () => {
    const draft: EffectDraft = {
      ...emptyDraft(),
      duration: 'custom',
      customAmount: '3',
      customUnit: 'hours',
      conditions: ['Poisoned'],
    }
    expect(draftEffects(draft)[0].duration).toEqual({ type: 'rounds', rounds: 1800 })
  })

  it('counts in every unit the picker offers', () => {
    const rounds = (amount: string, unit: EffectDraft['customUnit']): unknown =>
      draftEffects({
        ...emptyDraft(),
        duration: 'custom',
        customAmount: amount,
        customUnit: unit,
        conditions: ['Prone'],
      })[0].duration
    expect(rounds('7', 'rounds')).toEqual({ type: 'rounds', rounds: 7 })
    expect(rounds('5', 'minutes')).toEqual({ type: 'rounds', rounds: 50 })
    expect(rounds('2', 'days')).toEqual({ type: 'rounds', rounds: 28800 })
  })

  it('falls back to until-removed when the amount is blank or nonsense', () => {
    for (const customAmount of ['', '0', '-2', 'abc']) {
      const draft: EffectDraft = {
        ...emptyDraft(),
        duration: 'custom',
        customAmount,
        conditions: ['Prone'],
      }
      expect(draftEffects(draft)[0].duration, customAmount).toEqual({ type: 'manual' })
    }
  })

  it('round-trips through a preset, keeping the amount in its own unit', () => {
    const draft: EffectDraft = {
      ...emptyDraft(),
      duration: 'custom',
      customAmount: '3',
      customUnit: 'hours',
      notes: ['x'],
    }
    const back = presetToDraft(buildPreset(draft, 'n'))
    expect(back.duration).toBe('custom')
    expect(back.customAmount).toBe('3')
    expect(back.customUnit).toBe('hours')
  })

  it('reads an odd round count back as rounds rather than rounding it', () => {
    const back = presetToDraft({
      id: 'custom:x',
      name: 'n',
      duration: { type: 'rounds', rounds: 17 },
      parts: [{ kind: 'condition', condition: 'Prone' }],
    })
    expect(back.duration).toBe('custom')
    expect(back.customAmount).toBe('17')
    expect(back.customUnit).toBe('rounds')
  })
})

describe('the Brood & Bloom presets', () => {
  const byName = (n: string) => BROOD_AND_BLOOM_PRESETS.find((p) => p.name === n)!

  it('ships four stages for each of the seven diseases, plus the two counters', () => {
    expect(BROOD_AND_BLOOM_PRESETS).toHaveLength(30)
    const counterOnly = BROOD_AND_BLOOM_PRESETS.filter((p) =>
      p.parts.every((x) => x.kind === 'counter'),
    )
    expect(counterOnly.map((p) => p.name)).toEqual(['Depth', 'Spore Load'])
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
    const conditions = (n: string) => partsOf(byName(n), 'condition').map((p) => p.condition)
    expect(conditions('Chantry Drought 4')).toEqual(['Incapacitated', 'Unconscious'])
    expect(conditions('Mortification 3')).toEqual(['Poisoned'])
    expect(conditions('Ankylosis 4')).toEqual(['Incapacitated'])
    expect(conditions('Sallow Rot 1')).toEqual([])
  })

  it('carries every stage`s brood counter, hidden from the player view', () => {
    for (const p of BROOD_AND_BLOOM_PRESETS) {
      const counters = partsOf(p, 'counter')
      expect(counters, p.name).toHaveLength(1)
      expect(counters[0].gmOnly, p.name).toBe(true)
    }
    // Inquiline diseases ride with Depth; Sporophore diseases with Spore Load.
    expect(partsOf(byName('Sallow Rot 2'), 'counter')[0].name).toBe('Depth')
    expect(partsOf(byName('The Forgetting 1'), 'counter')[0].name).toBe('Depth')
    expect(partsOf(byName('Mortification 2'), 'counter')[0].name).toBe('Spore Load')
    expect(partsOf(byName('Metaplasia 4'), 'counter')[0].name).toBe('Spore Load')
  })

  it('turns the book`s ability-scoped Disadvantage into real modifiers', () => {
    const mods = (n: string) => partsOf(byName(n), 'modifier').map((p) => p.modifier)
    expect(mods('Mortification 2')).toEqual([
      {
        name: 'Mortification',
        mode: 'disadvantage',
        direction: 'outgoing',
        applies: 'savingThrows',
        abilities: ['con'],
      },
      {
        name: 'Mortification',
        mode: 'flatBonus',
        direction: 'outgoing',
        applies: 'maxHp',
        value: -10,
      },
    ])
    expect(mods('Ankylosis 2')[0].abilities).toEqual(['dex'])
    // Stage effects last until the disease ends, so stage 3 still carries stage 2's.
    expect(mods('Mortification 3')[0].abilities).toEqual(['con'])
    expect(mods('Ankylosis 3')[0].abilities).toEqual(['dex'])
  })

  it('turns the stage`s Speed, HP-maximum, and AC numbers into stat modifiers', () => {
    const stat = (n: string, applies: string) =>
      partsOf(byName(n), 'modifier').find((p) => p.modifier.applies === applies)?.modifier
    // Each stage states its whole toll, so the values are absolute, not increments.
    expect(stat('Sallow Rot 1', 'speed')?.value).toBe(-5)
    expect(stat('Sallow Rot 2', 'speed')?.value).toBe(-10)
    expect(stat('Sallow Rot 2', 'maxHp')?.value).toBe(-10)
    expect(stat('Sallow Rot 3', 'maxHp')?.value).toBe(-30)
    expect(stat('Calcination 3', 'speed')?.value).toBe('half')
    expect(stat('Ankylosis 3', 'speed')?.value).toBe(-15)
    expect(stat('Ankylosis 3', 'ac')?.value).toBe(2)
    expect(stat('Ankylosis 4', 'speed')?.value).toBe('zero')
    // What has no shape stays a reminder: a Vulnerability, a rest rule.
    expect(partsOf(byName('Calcination 2'), 'reminder')[0].note).toBe('Vulnerable to Fire')
  })

  it('follows the library, not the account', () => {
    expect(libraryPresets([])).toEqual([])
    expect(libraryPresets(['srd-5.2'])).toEqual([])
    expect(libraryPresets(['openfray-brood-and-bloom'])).toEqual(BROOD_AND_BLOOM_PRESETS)
  })
})

describe('every shipped preset', () => {
  // Board text, not book text: a reminder is drawn on rows and in the log, so it is
  // written telegraphically and the prose stays in the chapters.
  it('keeps each reminder short enough for the board', () => {
    for (const p of [...BROOD_AND_BLOOM_PRESETS, ...STRONG_WATERS_PRESETS]) {
      for (const part of partsOf(p, 'reminder')) {
        expect(part.note.length, `${p.name}: "${part.note}"`).toBeLessThanOrEqual(90)
      }
    }
  })
})

describe('the Strong Waters presets', () => {
  const byName = (n: string) => STRONG_WATERS_PRESETS.find((p) => p.name === n)!

  it('ships the four Intoxication levels, the three degrees, and Craving as the one counter', () => {
    expect(STRONG_WATERS_PRESETS).toHaveLength(8)
    const counterOnly = STRONG_WATERS_PRESETS.filter((p) =>
      p.parts.every((x) => x.kind === 'counter'),
    )
    expect(counterOnly.map((p) => p.name)).toEqual(['Craving'])
    expect(STRONG_WATERS_PRESETS.filter((p) => p.name.startsWith('Intoxication'))).toHaveLength(4)
    expect(STRONG_WATERS_PRESETS.filter((p) => p.name.startsWith('Addicted'))).toHaveLength(3)
  })

  it("gives every preset a unique id under the library's source", () => {
    const ids = STRONG_WATERS_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of STRONG_WATERS_PRESETS) {
      expect(p.source).toBe('openfray-strong-waters')
      expect(p.id.startsWith('openfray-strong-waters:')).toBe(true)
    }
  })

  it('applies something for every preset — a reminder at least', () => {
    for (const p of STRONG_WATERS_PRESETS) {
      expect(draftEffects(presetToDraft(p)).length, p.name).toBeGreaterThan(0)
    }
  })

  it('carries only the two conditions the levels actually name', () => {
    const conditions = (n: string) => partsOf(byName(n), 'condition').map((p) => p.condition)
    expect(conditions('Intoxication 3')).toEqual(['Poisoned'])
    expect(conditions('Intoxication 4')).toEqual(['Unconscious'])
    expect(conditions('Intoxication 1')).toEqual([])
    expect(conditions('Intoxication 2')).toEqual([])
  })

  it('makes each level whole — its effects include those of the levels below it', () => {
    // Chapter 4: a creature holds one level at a time, so each bundle carries the
    // full ladder up to itself. Level 2's save Disadvantage must still be at level 4.
    const saves = (n: string) =>
      partsOf(byName(n), 'modifier').find((p) => p.modifier.applies === 'savingThrows')
    expect(saves('Intoxication 2')?.modifier.abilities).toEqual(['dex', 'wis'])
    expect(saves('Intoxication 3')?.modifier.abilities).toEqual(['dex', 'wis'])
    expect(saves('Intoxication 4')?.modifier.abilities).toEqual(['dex', 'wis'])
    expect(saves('Intoxication 1')).toBeUndefined()
  })

  it('scopes the check Disadvantage to Wisdom at level 1, and Dexterity from level 2', () => {
    const checks = (n: string) =>
      partsOf(byName(n), 'modifier').find((p) => p.modifier.applies === 'abilityChecks')
    expect(checks('Intoxication 1')?.modifier.abilities).toEqual(['wis'])
    expect(checks('Intoxication 2')?.modifier.abilities).toEqual(['wis', 'dex'])
  })

  it('keeps what has no Effect shape as a reminder, and moves the Speed to a modifier', () => {
    const notes = (n: string) => partsOf(byName(n), 'reminder').map((p) => p.note)
    expect(notes('Intoxication 1').join(' ')).toMatch(/Frightened/)
    const speed = (n: string) =>
      partsOf(byName(n), 'modifier').find((p) => p.modifier.applies === 'speed')?.modifier
    expect(speed('Intoxication 3')?.value).toBe(-10)
    expect(speed('Intoxication 4')?.value).toBe(-10)
    expect(speed('Intoxication 2')).toBeUndefined()
  })

  it('hides Craving from the player view', () => {
    const craving = partsOf(byName('Craving'), 'counter')[0]
    expect(craving.gmOnly).toBe(true)
  })

  it('leaves a degree free of conditions and modifiers — its rules describe a day gone without', () => {
    for (const n of [1, 2, 3]) {
      const p = byName(`Addicted ${n}`)
      expect(partsOf(p, 'condition'), p.name).toEqual([])
      expect(partsOf(p, 'modifier'), p.name).toEqual([])
    }
    expect(
      partsOf(byName('Addicted 2'), 'reminder')
        .map((p) => p.note)
        .join(' '),
    ).toMatch(/Exhaustion/)
  })

  it('makes each degree whole — the ladder is cumulative', () => {
    const count = (n: string) => partsOf(byName(n), 'reminder').length
    expect(count('Addicted 1')).toBeLessThan(count('Addicted 2'))
    expect(count('Addicted 2')).toBeLessThan(count('Addicted 3'))
  })

  it('rides its own library, alongside the other one', () => {
    expect(libraryPresets(['openfray-strong-waters'])).toEqual(STRONG_WATERS_PRESETS)
    expect(libraryPresets(['openfray-brood-and-bloom', 'openfray-strong-waters'])).toEqual([
      ...BROOD_AND_BLOOM_PRESETS,
      ...STRONG_WATERS_PRESETS,
    ])
  })
})

describe('an Exhaustion part', () => {
  it('saves the change the staged level would make, not the level', () => {
    // Staged at 3 on a creature already carrying 1 — the preset is worth two levels.
    const draft: EffectDraft = { ...emptyDraft(), exhaustion: 3, exhaustionBase: 1 }
    expect(buildPreset(draft, 'A night in the cold').parts).toEqual([
      { kind: 'exhaustion', levels: 2 },
    ])
  })

  it('saves nothing when the level was not moved', () => {
    const draft: EffectDraft = { ...emptyDraft(), exhaustion: 2, exhaustionBase: 2 }
    expect(buildPreset(draft, 'Nothing doing').parts).toEqual([])
  })

  it('saves a negative change for a preset that relieves it', () => {
    const draft: EffectDraft = { ...emptyDraft(), exhaustion: 0, exhaustionBase: 2 }
    expect(buildPreset(draft, 'Greater Restoration').parts).toEqual([
      { kind: 'exhaustion', levels: -2 },
    ])
  })

  it('stages against the level the creature already carries — it is cumulative', () => {
    const preset: EffectPreset = {
      id: 'custom:cold',
      name: 'A night in the cold',
      duration: { type: 'manual' },
      parts: [{ kind: 'exhaustion', levels: 1 }],
    }
    expect(presetToDraft(preset, 0).exhaustion).toBe(1)
    expect(presetToDraft(preset, 2).exhaustion).toBe(3)
    // And it never stages past the level that kills.
    expect(presetToDraft(preset, 6).exhaustion).toBe(6)
  })

  it('round-trips the change through a save and a stage', () => {
    const draft: EffectDraft = { ...emptyDraft(), exhaustion: 3, exhaustionBase: 1 }
    const saved = buildPreset(draft, 'A night in the cold')
    expect(presetToDraft(saved, 1).exhaustion).toBe(3)
    expect(presetToDraft(saved, 1).exhaustionBase).toBe(1)
  })

  it('mints no Effect of its own — the level lands through its own action', () => {
    const draft: EffectDraft = { ...emptyDraft(), exhaustion: 3, exhaustionBase: 0 }
    expect(draftEffects(draft)).toEqual([])
  })
})
