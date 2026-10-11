// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const credits = readFileSync(new URL('../../CREDITS.md', import.meta.url), 'utf8')
const section = credits.split('### Warlock Grimoire spell selection (Kobold Press)\n')[1]
const chains = [
  {
    title: 'Warlock Grimoire',
    count: 19,
    hash: '54236628d021dfb38c2853e7308c22dd11bdb00adcdbfd69d40461b6998aeab2',
  },
  {
    title: 'Warlock Grimoire 2',
    count: 17,
    hash: '16aea9793f0106fbd9ee9ff035482f2899c858b9b04b87192d37fb13b54cea08',
  },
  {
    title: 'Warlock Grimoire 3',
    count: 25,
    hash: '994bae9205c54971cfc1caa7882bbe828f3e122828dcb1f84df9abe3f76bb4e5',
  },
  {
    title: 'Warlock Guide to Liminal Magic',
    count: 3,
    hash: 'afb0ab0f207925d4b54d09426254e7b304e8e5de4793503013de125c058eb918',
  },
] as const

describe('Warlock attribution preparation', () => {
  it('includes the complete OGL, the content designation, and the no-distribution status', () => {
    expect(section).toBeDefined()
    expect(section).toContain('No cards from this selection are distributed yet.')
    expect(section).toContain('**Open Game Content designation:**')
    expect(section).toContain(
      'OpenFray Warlock Grimoire spell reference cards. Copyright 2026 Nicola Mustone.',
    )
    for (let clause = 1; clause <= 15; clause++)
      expect(section).toMatch(new RegExp('^' + clause + '\\. ', 'm'))
    const canonicalLicense = credits
      .split('#### OPEN GAME LICENSE Version 1.0a\n')[1]
      .split('15. COPYRIGHT NOTICE')[0]
      .trim()
    const warlockLicense = section
      .split('#### OPEN GAME LICENSE Version 1.0a\n')[1]
      .split('15. COPYRIGHT NOTICE')[0]
      .trim()
    expect(warlockLicense).toBe(canonicalLicense)
  })

  it.each(chains)(
    'preserves the complete $title copyright chain without rewriting it',
    ({ title, count, hash }) => {
      const chain = section
        .split('#### ' + title + '\n')[1]
        .split('\n#### ')[0]
        .trim()
      const paragraphs = chain.split(/\n\s*\n/).filter(Boolean)
      expect(paragraphs).toHaveLength(count)
      const normalized = chain.replace(/\s+/g, ' ').trim()
      expect(createHash('sha256').update(normalized).digest('hex')).toBe(hash)
    },
  )

  it('does not introduce the unused fourth volume or unsupplied source credits', () => {
    expect(section).not.toContain('#### Warlock Grimoire 4')
    expect(section).not.toContain('#### Warlock Guide to the Shadow Realms')
    expect(section).not.toContain('#### Warlock Lair 24')
    expect(section).toContain('Mechanically essential reserved references are withheld')
    expect(section).toContain('no subclass, ley-line subsystem, or creature stat block is imported')
  })
})
