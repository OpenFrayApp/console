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

  it('flattens the rest of markdown rather than styling it', () => {
    const container = render1('# Heading\n\n`code`\n\n| a | b |\n| - | - |\n| 1 | 2 |')
    for (const tag of ['h1', 'h2', 'code', 'pre', 'table']) {
      expect(container.querySelector(tag), tag).toBeNull()
    }
    expect(container.textContent).toContain('Heading')
  })
})
