// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { abilityMod } from '../../src/schema/primitives.ts'

describe('abilityMod', () => {
  it('floors (score - 10) / 2', () => {
    expect(abilityMod(16)).toBe(3)
    expect(abilityMod(14)).toBe(2)
    expect(abilityMod(11)).toBe(0)
    expect(abilityMod(10)).toBe(0)
    expect(abilityMod(8)).toBe(-1)
    expect(abilityMod(7)).toBe(-2)
  })
})
