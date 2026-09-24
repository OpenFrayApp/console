// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus.ts'

/** Contain a dialog sequence's focus once, restoring its original trigger when it closes. */
export function DialogFocus({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useDialogFocus(root)
  useLayoutEffect(() => {
    root.current?.querySelector<HTMLElement>('button, input, select, textarea, a[href]')?.focus()
  }, [])
  return (
    <div ref={root} className="contents">
      {children}
    </div>
  )
}
