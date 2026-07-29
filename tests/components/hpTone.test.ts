// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { HpTier } from '../../src/combat/resources.ts'
import { hpToneFor } from '../../src/components/hpTone.ts'

const TIERS: HpTier[] = ['healthy', 'hurt', 'bloodied', 'critical']

describe('hpToneFor', () => {
  it('gives each tier its own colour family', () => {
    expect(hpToneFor('healthy')).toMatch(/emerald/)
    expect(hpToneFor('hurt')).toMatch(/amber/)
    expect(hpToneFor('bloodied')).toMatch(/rose/)
    expect(hpToneFor('critical')).toMatch(/red/)
  })

  it('adds weight as the wound worsens — semibold at bloodied, bold at critical', () => {
    expect(hpToneFor('healthy')).not.toMatch(/font-/)
    expect(hpToneFor('hurt')).not.toMatch(/font-/)
    expect(hpToneFor('bloodied')).toMatch(/font-semibold/)
    expect(hpToneFor('critical')).toMatch(/font-bold/)
  })

  it('carries a dark-theme variant for every tier', () => {
    for (const tier of TIERS) expect(hpToneFor(tier)).toMatch(/dark:/)
  })

  it('keeps the four tiers distinct from each other', () => {
    expect(new Set(TIERS.map(hpToneFor)).size).toBe(TIERS.length)
  })
})
