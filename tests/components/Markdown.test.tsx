// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Spell } from '../../src/schema/spell.ts'
import { Markdown } from '../../src/components/Markdown.tsx'
import { SpellLinkContext } from '../../src/components/spellLinkContext.ts'
import { makeSpellLinker } from '../../src/compendium/spelllinker.ts'

afterEach(cleanup)

const fireball: Spell = {
  id: 'srd-5.2:fireball',
  source: 'srd-5.2',
  name: 'Fireball',
  level: 3,
  school: 'Evocation',
  castingTime: 'action',
  range: '150 feet',
  components: { verbal: true, somatic: true, material: false },
  duration: 'instantaneous',
  concentration: false,
  ritual: false,
  text: 'A bright streak flashes…',
}

const resolveSpell = (ref: string) => (ref === 'srd-5.2:fireball' ? fireball : undefined)
const linker = makeSpellLinker([{ name: 'Fireball', ref: 'srd-5.2:fireball' }])

describe('Markdown spell linking via context', () => {
  it('turns a bare cast-spell name into a hover-link', () => {
    render(
      <SpellLinkContext.Provider value={linker}>
        <Markdown resolveSpell={resolveSpell}>The mage casts Fireball at the foes.</Markdown>
      </SpellLinkContext.Provider>,
    )
    expect(screen.getByText('Fireball')).toHaveClass('cursor-help') // the HoverSpell chrome
  })

  it('leaves the name plain when no linker is provided (SRD text is pre-baked)', () => {
    render(<Markdown resolveSpell={resolveSpell}>The mage casts Fireball at the foes.</Markdown>)
    expect(screen.getByText(/Fireball/)).not.toHaveClass('cursor-help')
  })
})
