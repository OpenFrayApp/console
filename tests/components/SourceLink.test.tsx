// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SourceLink } from '../../src/components/SourceLink.tsx'

afterEach(cleanup)

describe('SourceLink', () => {
  it('names the ruleset and what it is published under', () => {
    // The license used to be left to CREDITS.md, which satisfies the obligation but is not
    // where somebody deciding whether to reuse a stat block is looking. It falls back to
    // the source's own terms, so every library entry carries them without storing a copy.
    render(<SourceLink source="srd-5.2" />)
    expect(screen.getByText(/Basic Rules 2024/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText(/License: CC BY 4.0/)).toBeInTheDocument()
  })

  it('reads a third-party book as Open Game Content', () => {
    render(<SourceLink source="kobold-press-tob" />)
    expect(screen.getByText(/License: OGL 1.0a/)).toBeInTheDocument()
  })

  it('answers what the license permits, rather than leaving the jargon', () => {
    // "CC BY-NC-SA 4.0" is six characters of jargon next to the one question a Game Master
    // actually has, which is whether they may put this in the thing they are making. The
    // answer is written about the work: a reader here is a stranger, so "you" and "the
    // author" both point at somebody the page cannot know.
    render(<SourceLink source="srd-5.2" />)
    fireEvent.click(screen.getByRole('button', { name: /License: CC BY 4.0/ }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Credit is required')
    expect(dialog.textContent).not.toMatch(/\byou\b|\byour\b|the author/i)
    // A summary is not the license, and the dialog says so rather than standing in for it.
    expect(dialog.textContent).toContain('not the license')
    expect(dialog.querySelector('a')?.getAttribute('href')).toBe(
      'https://creativecommons.org/licenses/by/4.0/',
    )
  })

  it('does not pass the click on to whatever the line sits inside', () => {
    // The source row lives inside cards and rows that are themselves clickable; asking
    // about a license is not choosing the thing it belongs to.
    const onPick = vi.fn()
    render(
      <div onClick={onPick}>
        <SourceLink source="srd-5.2" />
      </div>,
    )
    fireEvent.click(screen.getByRole('button', { name: /License: CC BY 4.0/ }))
    expect(onPick).not.toHaveBeenCalled()
  })

  it('leaves third-party sources unlinked — a publisher’s home page is not attribution', () => {
    render(<SourceLink source="kobold-press-tob3" />)
    expect(screen.getByText(/Tome of Beasts 3/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('links one of our own books to the book itself, not to the site root', () => {
    const link = () => screen.getByRole('link', { name: /Brood & Bloom/ })
    render(<SourceLink source="openfray-brood-and-bloom" />)
    expect(link()).toHaveAttribute('href', '/brood-and-bloom/')
    // A new tab: following a source mid-fight must not take the board off the screen.
    expect(link()).toHaveAttribute('target', '_blank')
  })

  it('leaves custom content unlinked — there is nowhere to send the reader', () => {
    render(<SourceLink source="custom" />)
    expect(screen.getByText(/Custom \(you\)/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('folds the page into the ruleset parens', () => {
    render(<SourceLink source="srd-5.2" page={266} />)
    expect(screen.getByText(/\(SRD 5\.2\.1, pg\. 266\)/)).toBeInTheDocument()
  })

  it('shows the 2014 ruleset', () => {
    render(<SourceLink source="srd-5.1" />)
    expect(screen.getByText(/Basic Rules 2014/)).toBeInTheDocument()
  })

  it('shows an OpenFray library (Strong Waters) by its full title, and links the book', () => {
    render(<SourceLink source="openfray-strong-waters" />)
    const link = screen.getByRole('link', { name: /On Strong Waters and Potent Simples/ })
    expect(link).toHaveAttribute('href', '/strong-waters/')
    expect(screen.queryByText(/openfray-strong/)).toBeNull()
  })

  it('shows an OpenFray library (The Waking Garden) by name, not its id', () => {
    render(<SourceLink source="openfray-waking-garden" />)
    expect(screen.getByText(/The Waking Garden/)).toBeInTheDocument()
    expect(screen.queryByText(/openfray-waking/)).toBeNull()
  })

  it('shows a third-party (OGL) source and appends the page when there are no parens', () => {
    render(<SourceLink source="kobold-press-tob3" page={16} />)
    expect(screen.getByText(/Tome of Beasts 3 \(pg\. 16\)/)).toBeInTheDocument()
  })
})

describe('a creature that carries its own provenance', () => {
  it('reads a compendium id back as the creature it names, and only that', () => {
    // The name comes off the id, so it works on the shared page where the compendium may
    // not be loaded. The book is left to the Source beside it rather than repeated in a
    // parenthetical inside the one the ruleset already carries.
    const { container } = render(
      <SourceLink source="custom" derivedFrom="kobold-press-tob:ghast-of-leng" />,
    )
    expect(container.textContent).toContain('· Based on Ghast of Leng')
    expect(container.textContent).not.toMatch(/Based on Ghast of Leng \(/)
  })

  it('shows free text exactly as the Game Master typed it', () => {
    const { container } = render(
      <SourceLink source="custom" derivedFrom="a stat block in an old zine" />,
    )
    // One line now, so the whole of it is read rather than a paragraph of its own.
    expect(container.textContent).toContain('· Based on a stat block in an old zine')
  })

  it('says nothing at all when nobody has said anything', () => {
    // `unstated` is the absent state. A line reading "Not stated" would turn silence into
    // an assertion, and the whole point is that nobody spoke.
    // A custom creature nobody has spoken for: the source has no terms of its own to fall
    // back to, so there is nothing to say and nothing is said.
    const { container } = render(<SourceLink source="custom" license="unstated" />)
    expect(container.textContent).not.toMatch(/Based on|License:/)
  })

  it('shows a stated license beside the derivation', () => {
    render(<SourceLink source="custom" derivedFrom="srd-5.2:goblin" license="cc-by-sa-4.0" />)
    expect(screen.getByText(/Based on Goblin/).textContent).toContain('License: CC BY-SA 4.0')
  })
})
