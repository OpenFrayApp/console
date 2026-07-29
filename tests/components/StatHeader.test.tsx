// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HeaderStat, StatHeader } from '../../src/components/StatHeader.tsx'

afterEach(cleanup)

const RENAME_TITLE = 'Rename — changes how it appears in the tracker'

describe('StatHeader', () => {
  it('renders the name, subtitle, stats slot, and speed lines', () => {
    render(
      <StatHeader
        name="Goblin"
        subtitle="Small humanoid, CR 1/4"
        stats={<HeaderStat label="AC" value={15} />}
        speeds={['30 ft.', 'fly 60 ft.']}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Goblin' })).toBeInTheDocument()
    expect(screen.getByText('Small humanoid, CR 1/4')).toBeInTheDocument()
    expect(screen.getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('30 ft.')).toBeInTheDocument()
    expect(screen.getByText('fly 60 ft.')).toBeInTheDocument()
  })

  it('commits a trimmed rename and ignores a blank one', () => {
    const onRename = vi.fn()
    render(<StatHeader name="Goblin" onRename={onRename} subtitle="x" stats={null} />)
    fireEvent.click(screen.getByTitle(RENAME_TITLE))
    const input = screen.getByDisplayValue('Goblin')
    fireEvent.change(input, { target: { value: '  Griknak  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRename).toHaveBeenCalledWith('Griknak')

    // A whitespace-only entry never renames.
    fireEvent.click(screen.getByTitle(RENAME_TITLE))
    const again = screen.getByDisplayValue('Goblin')
    fireEvent.change(again, { target: { value: '   ' } })
    fireEvent.keyDown(again, { key: 'Enter' })
    expect(onRename).toHaveBeenCalledTimes(1)
  })

  it('shows a plain, uneditable name without onRename', () => {
    render(<StatHeader name="Goblin" subtitle="x" stats={null} />)
    expect(screen.getByRole('heading', { name: 'Goblin' })).toBeInTheDocument()
    expect(screen.queryByTitle(RENAME_TITLE)).toBeNull()
  })

  it('titles the concentration badge with the spell and rounds left', () => {
    const { rerender } = render(
      <StatHeader
        name="Mage"
        subtitle="x"
        stats={null}
        concentration={{ spell: 'Hold Person', saveDc: 13, round: 2, rounds: 3 }}
      />,
    )
    const badge = screen.getByTitle('Concentrating: Hold Person (3 rounds left)')
    expect(badge).toHaveTextContent('C')
    expect(badge).toHaveTextContent('3')

    // No timer → no rounds counter in badge or title.
    rerender(
      <StatHeader
        name="Mage"
        subtitle="x"
        stats={null}
        concentration={{ spell: 'Hold Person', saveDc: 13, round: 2 }}
      />,
    )
    expect(screen.getByTitle('Concentrating: Hold Person')).toHaveTextContent('C')

    rerender(<StatHeader name="Mage" subtitle="x" stats={null} concentration={null} />)
    expect(screen.queryByTitle(/Concentrating/)).toBeNull()
  })

  it('marks a legendary creature and shows the original name behind a rename', () => {
    render(
      <StatHeader
        name="Smaug"
        subtitle="Huge dragon"
        stats={null}
        legendary
        originalName="Adult Red Dragon"
      />,
    )
    expect(screen.getByTitle('Legendary')).toHaveTextContent('L')
    expect(screen.getByText('(Adult Red Dragon)')).toBeInTheDocument()
    expect(screen.getByTitle('Original name: Adult Red Dragon')).toBeInTheDocument()
  })
})

describe('HeaderStat', () => {
  it('commits an edited value through the editable field', () => {
    const onCommit = vi.fn()
    render(
      <HeaderStat label="HP" value="27" edit={{ initial: '27', onCommit, title: 'Edit HP' }} />,
    )
    fireEvent.click(screen.getByTitle('Edit HP'))
    const input = screen.getByDisplayValue('27')
    fireEvent.change(input, { target: { value: '19' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledWith('19')
  })
})
