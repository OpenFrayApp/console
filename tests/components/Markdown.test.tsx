// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Spell } from '../../src/schema/spell.ts'
import { Markdown } from '../../src/components/Markdown.tsx'
import { SpellLinkContext } from '../../src/components/spellLinkContext.ts'
import { makeSpellLinker } from '../../src/compendium/spelllinker.ts'
import { spell } from '../fixtures.ts'

afterEach(cleanup)

const fireball: Spell = spell({ text: 'A bright streak flashes…' })

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

/**
 * The half of the renderer `SharedNote.test.tsx` doesn't cover. That test pins the note's
 * grammar; this pins the prose beside it — a stat block's, which on a shared encounter is a
 * stranger's too. Little point refusing a link in the note while a trait renders one four
 * inches away.
 *
 * This is also the test that fails the day someone adds `rehype-raw` to the shared renderer.
 */
describe('Markdown does not reach outside the app', () => {
  /** Every anchor href and image source the prose put in the document. */
  const rendered = (md: string, links = false) => {
    const { container } = render(<Markdown links={links}>{md}</Markdown>)
    return {
      anchors: [...container.querySelectorAll('a')].map((a) => a.getAttribute('href')),
      images: [...container.querySelectorAll('img')].map((i) => i.getAttribute('src')),
      text: container.textContent ?? '',
    }
  }

  it('renders a markdown link as the words it was written as', () => {
    const out = rendered('[Sign in to load this encounter](https://evil.example/login) now')
    expect(out.anchors).toEqual([])
    // The words survive; only the destination goes. Same answer the note's allowlist gives.
    expect(out.text).toContain('Sign in to load this encounter')
  })

  it('renders an image as its alt text, so nothing fetches a stranger’s server', () => {
    const out = rendered('Watch out ![a lurking horror](https://tracker.example/pixel.gif)')
    expect(out.images).toEqual([])
    expect(out.text).toContain('a lurking horror')
  })

  it('defuses the links markdown makes on its own, which no stripping would catch', () => {
    // remark-gfm autolinks all three of these from text that contains no markdown syntax at
    // all — which is why rewriting the prose on the way in could never have been the answer.
    for (const bare of [
      'Visit https://evil.example/login',
      'www.evil.example',
      'gm@evil.example',
    ]) {
      const out = rendered(bare)
      expect(out.anchors, `${bare} still linked`).toEqual([])
      expect(out.text).toContain(bare.split(' ').pop()!)
    }
  })

  it('renders raw HTML as text, including a script tag', () => {
    const { container } = render(
      <Markdown>{'<script>alert(1)</script><img src="x" onerror="alert(1)"><b>bold</b>'}</Markdown>,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toContain('<script>alert(1)</script>')
  })

  it('keeps our own spell and condition hover cards, which are ours and not the prose’s', () => {
    // These are added at render time from the compendium we shipped, so they are not the
    // thing being kept out — and blanket-disallowing `a` nodes would have taken them too.
    render(
      <SpellLinkContext.Provider value={linker}>
        <Markdown resolveSpell={resolveSpell}>The mage casts Fireball.</Markdown>
      </SpellLinkContext.Provider>,
    )
    expect(screen.getByText('Fireball')).toHaveClass('cursor-help')
    cleanup()
    render(<Markdown linkConditions>It leaves the target Prone.</Markdown>)
    expect(screen.getByText('Prone')).toHaveClass('cursor-help')
  })

  it('lets the Game Master’s own prose link out when it asks', () => {
    const out = rendered('[The map](https://drive.example/map.png) is here', true)
    expect(out.anchors).toEqual(['https://drive.example/map.png'])
  })

  it('says the link came out of somebody’s prose, and vouches for none of it', () => {
    const { container } = render(
      <Markdown links>{'[The map](https://drive.example/map.png) is here'}</Markdown>,
    )
    const rel = container.querySelector('a')?.getAttribute('rel') ?? ''
    expect(rel.split(' ').sort()).toEqual(['nofollow', 'noopener', 'noreferrer', 'ugc'])
  })

  /** Where one prose link goes, and whether it takes the tab with it. */
  const anchor = (md: string) => {
    const { container } = render(<Markdown links>{md}</Markdown>)
    return container.querySelector('a')
  }

  it('sends a link out of the app to its own tab, so the fight stays open', () => {
    expect(anchor('[map](https://drive.example/m.png)')?.getAttribute('target')).toBe('_blank')
  })

  it('keeps one of ours in the tab it was clicked in', () => {
    expect(anchor('[handbook](https://openfray.app/docs/)')?.getAttribute('target')).toBeNull()
    expect(anchor('[admin](https://admin.openfray.app/)')?.getAttribute('target')).toBeNull()
    expect(anchor('[here](/console/)')?.getAttribute('target')).toBeNull()
  })

  it('is not fooled by a host that merely contains our name', () => {
    // Parsed, never matched on the text: this is somebody else's host and it opens away
    // from the console like any other.
    const out = anchor('[real, honest](https://openfray.app.evil.example/login)')
    expect(out?.getAttribute('target')).toBe('_blank')
  })

  it('leaves an address alone, since a blank tab is not where mail is written', () => {
    expect(anchor('Write to <gm@example.com>')?.getAttribute('target')).toBeNull()
  })

  it('leaves the app’s own hover links alone, because they never navigate', () => {
    const { container } = render(
      <Markdown links resolveSpell={() => undefined}>
        {'It casts [fireball](spell:srd-5.2:fireball).'}
      </Markdown>,
    )
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('never renders a javascript: or data: destination even then', () => {
    // react-markdown's own URL sanitizer, pinned because `links` is the one path that
    // reaches it and a change there would be silent.
    expect(rendered('[x](javascript:alert(1))', true).anchors).toEqual([''])
    expect(rendered('[x](data:text/html,<script>alert(1)</script>)', true).anchors).toEqual([''])
  })

  it('applies the same rule inline, where an action’s prose renders', () => {
    const { container } = render(
      <Markdown inline>
        {'Hit: 7 damage. [More](https://evil.example) ![](https://evil.example/p.png)'}
      </Markdown>,
    )
    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.textContent).toContain('More')
  })
})
