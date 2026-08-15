// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useDismiss } from '../hooks/useDismiss.ts'
import { popoverClass } from './popover.ts'
import { Button } from './ui.tsx'

export interface AddMenuItem {
  key: string
  label: string
  /** The control this item stands in for, rendered open. Calls back when it closes. */
  render: (onClosed: () => void) => ReactNode
}

/**
 * One "Add" button standing in for the three add controls, for the phone header.
 * Quick add, Add PC and Add creature each keep their own button on a roomy screen;
 * side by side they wrap onto a line of their own, which costs a third of a narrow
 * phone screen before the tracker starts.
 *
 * Picking an item swaps this button for that control, opened. The item's own popover
 * is the second step, so there is never a sheet on top of a sheet; when it closes,
 * the Add button comes back.
 */
export function AddMenu({ items }: { items: AddMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  // Only the menu itself dismisses on an outside click. Once an item is up, that
  // control owns dismissal and reports back through onClosed.
  useDismiss(ref, open && activeKey === null, close)

  const active = items.find((i) => i.key === activeKey)

  return (
    <div className="relative" ref={ref}>
      {active ? (
        active.render(() => setActiveKey(null))
      ) : (
        <>
          {/* Named in full for the accessible name: the forms this opens each end in
          their own "Add" submit, and two buttons called "Add" are one button as far as
          a screen reader is concerned. */}
          <Button
            variant="primary"
            onClick={() => setOpen((o) => !o)}
            aria-label="Add to the encounter"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            Add
          </Button>
          {open && (
            <div role="menu" className={`${popoverClass('roomy:w-56')} p-1`}>
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    setActiveKey(item.key)
                  }}
                  className="tap-y block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
