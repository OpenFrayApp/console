// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PinInput } from '../../../src/components/ui/PinInput.tsx'

afterEach(cleanup)

/** The controlled harness a real caller is: state in, edits out. */
function Harness({ onValue }: { onValue?: (v: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <PinInput
      value={value}
      onChange={(v) => {
        setValue(v)
        onValue?.(v)
      }}
    />
  )
}

const box = (n: number) => screen.getByLabelText(`PIN digit ${n}`) as HTMLInputElement

describe('PinInput', () => {
  it('fills box by box, moving the focus along', () => {
    render(<Harness />)
    fireEvent.change(box(1), { target: { value: '1' } })
    expect(box(1).value).toBe('1')
    expect(document.activeElement).toBe(box(2))
    fireEvent.change(box(2), { target: { value: '2' } })
    fireEvent.change(box(3), { target: { value: '3' } })
    fireEvent.change(box(4), { target: { value: '4' } })
    expect([1, 2, 3, 4].map((n) => box(n).value).join('')).toBe('1234')
  })

  it('ignores anything that is not a digit', () => {
    render(<Harness />)
    fireEvent.change(box(1), { target: { value: 'x' } })
    expect(box(1).value).toBe('')
    expect(document.activeElement).not.toBe(box(2))
  })

  it('walks back on Backspace — clearing the box, then stepping into the previous one', () => {
    render(<Harness />)
    fireEvent.change(box(1), { target: { value: '1' } })
    fireEvent.change(box(2), { target: { value: '2' } })
    fireEvent.keyDown(box(3), { key: 'Backspace' })
    expect(box(2).value).toBe('')
    expect(document.activeElement).toBe(box(2))
    fireEvent.keyDown(box(2), { key: 'Backspace' })
    expect(box(1).value).toBe('')
  })

  it('takes a pasted PIN whole, junk stripped', () => {
    const seen: string[] = []
    render(<Harness onValue={(v) => seen.push(v)} />)
    fireEvent.paste(box(1), { clipboardData: { getData: () => '12 3x4' } })
    expect(seen.at(-1)).toBe('1234')
  })
})
