// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

const BOX =
  'h-11 w-10 rounded border border-slate-300 bg-white text-center text-lg font-semibold tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

/**
 * A four-digit PIN as four boxes: digits only, each typed digit moves to the next box,
 * Backspace walks back, and a paste fills them all. `value` is the digits so far (0–4);
 * `onChange` receives every edit, so the caller acts when it reaches four.
 */
export function PinInput({
  value,
  onChange,
  label = 'PIN digit',
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  /** The accessible name's stem; each box appends its position ("PIN digit 1"). */
  label?: string
  autoFocus?: boolean
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  /** A digit landed in box `i`: keep it, and step into the next empty box. */
  const typed = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    if (!digit) return
    const next = (value.slice(0, i) + digit + value.slice(i + 1)).slice(0, 4)
    onChange(next)
    boxes.current[Math.min(i + 1, 3)]?.focus()
  }

  /** Backspace clears the box, or steps back into the previous one when already empty. */
  const keyed = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Backspace') return
    e.preventDefault()
    if (value[i]) {
      onChange(value.slice(0, i) + value.slice(i + 1))
    } else if (i > 0) {
      onChange(value.slice(0, i - 1) + value.slice(i))
      boxes.current[i - 1]?.focus()
    }
  }

  /** A pasted PIN fills the boxes in one go, whatever box it landed on. */
  const pasted = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!digits) return
    e.preventDefault()
    onChange(digits)
    boxes.current[Math.min(digits.length, 3)]?.focus()
  }

  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el
          }}
          value={value[i] ?? ''}
          onChange={(e) => typed(i, e.target.value)}
          onKeyDown={(e) => keyed(i, e)}
          onPaste={pasted}
          onFocus={(e) => e.currentTarget.select()}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoFocus={autoFocus && i === 0}
          aria-label={`${label} ${i + 1}`}
          className={BOX}
        />
      ))}
    </div>
  )
}
