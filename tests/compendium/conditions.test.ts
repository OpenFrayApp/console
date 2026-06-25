// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { CONDITION_TEXT, linkifyConditions, resolveCondition } from '../../src/compendium/conditions.ts'

describe('resolveCondition', () => {
  it('resolves a known condition to its reference text', () => {
    const c = resolveCondition('Grappled')
    expect(c?.name).toBe('Grappled')
    expect(c?.text).toBe(CONDITION_TEXT.Grappled)
  })

  it('returns undefined for an unknown name', () => {
    expect(resolveCondition('Dazzled')).toBeUndefined()
  })
})

describe('linkifyConditions', () => {
  it('wraps a bare condition name in a condition: link', () => {
    expect(linkifyConditions('the target has the Grappled condition (escape DC 14)')).toBe(
      'the target has the [Grappled](condition:Grappled) condition (escape DC 14)',
    )
  })

  it('links multiple distinct conditions', () => {
    const out = linkifyConditions('It is Poisoned and Prone.')
    expect(out).toBe('It is [Poisoned](condition:Poisoned) and [Prone](condition:Prone).')
  })

  it('is case-sensitive so lowercase words are left alone', () => {
    expect(linkifyConditions('it lies prone in the grass')).toBe('it lies prone in the grass')
  })

  it('matches whole words only', () => {
    expect(linkifyConditions('a Poisoning gas')).toBe('a Poisoning gas')
  })

  it('does not rewrite inside an existing markdown link', () => {
    const input = 'casts [Invisibility](spell:srd-5.2:invisibility) then turns Invisible'
    expect(linkifyConditions(input)).toBe(
      'casts [Invisibility](spell:srd-5.2:invisibility) then turns [Invisible](condition:Invisible)',
    )
  })
})
