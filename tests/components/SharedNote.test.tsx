// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SharedNote } from '../../src/components/SharedNote.tsx'

afterEach(cleanup)

/**
 * The note is a stranger's prose rendered inside our own chrome, and this file is the guard
 * on that. It fails the day someone gives the shared renderer a raw-HTML plugin, or widens
 * the allowlist to something that navigates or fetches.
 */

const render1 = (markdown: string) => render(<SharedNote>{markdown}</SharedNote>).container

describe('SharedNote', () => {
  it('renders the small grammar a Game Master writes prep in', () => {
    const container = render1(
      'They **wait** in the rafters.\n\n> Round one: the boss stays hidden.\n\n- Two on the cart\n- One on the roof',
    )
    expect(container.querySelector('strong')?.textContent).toBe('wait')
    expect(container.querySelector('blockquote')).toBeTruthy()
    expect(container.querySelectorAll('li')).toHaveLength(2)
  })

  it('keeps a link’s words and drops the link', () => {
    // The phishing case: a line that reads like the app asking, pointing somewhere else.
    const container = render1('[Sign in to load this encounter](https://evil.example/login)')
    expect(container.querySelector('a')).toBeNull()
    expect(screen.getByText(/Sign in to load this encounter/)).toBeTruthy()
    expect(container.innerHTML).not.toContain('evil.example')
  })

  it('never fetches a stranger’s server for an image', () => {
    // A remote image is a read receipt on everyone who opened the link.
    const container = render1('![tracker](https://evil.example/px.png)')
    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).not.toContain('evil.example')
  })

  it('renders markup as the text it is, never as markup', () => {
    const container = render1(
      '<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n<a href="https://evil.example">click</a>',
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
    expect(container.innerHTML).not.toContain('onerror')
  })

  it('lands every heading at h3 or below, so the page keeps its outline', () => {
    // The page owns its h1 (the encounter's name) and its h2 (Notes). A `#` in somebody's
    // prep can't be either without breaking the outline for a screen reader.
    const container = render1(
      '# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six',
    )
    expect(container.querySelector('h1')).toBeNull()
    expect(container.querySelector('h2')).toBeNull()
    expect([...container.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([
      'One',
      'Two',
      'Three',
    ])
    // Below h3 the writer is structuring their own section, so those stand as typed.
    expect(container.querySelector('h4')?.textContent).toBe('Four')
    expect(container.querySelector('h5')?.textContent).toBe('Five')
    expect(container.querySelector('h6')?.textContent).toBe('Six')
  })

  it('keeps a writer’s own line breaks without doubling every gap', () => {
    // A Game Master's prep is full of single newlines that markdown folds into one
    // paragraph, so the text renders as typed. react-markdown also leaves a newline
    // between every block, though, and preserving those renders each as a blank line on
    // top of the margins — which is the wide gap around a heading this pins against.
    const container = render1('One line\nand its second\n\n## A heading')
    const wrapper = container.firstElementChild as HTMLElement
    const classes = wrapper.className.split(/\s+/)
    expect(classes).not.toContain('whitespace-pre-wrap')
    expect(classes).toContain('[&_p]:whitespace-pre-wrap')
    expect(container.querySelector('p')?.textContent).toBe('One line\nand its second')
  })

  it('flattens the rest of markdown rather than styling it', () => {
    const container = render1('`code`\n\n| a | b |\n| - | - |\n| 1 | 2 |')
    for (const tag of ['code', 'pre', 'table']) {
      expect(container.querySelector(tag), tag).toBeNull()
    }
    expect(container.textContent).toContain('code')
  })
})
