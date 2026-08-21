// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useRef, useState, type FormEvent } from 'react'
import type { PlayerCharacter } from '../../schema/combatant.ts'
import { useDismiss } from '../../hooks/useDismiss.ts'
import { useOpenRequest } from '../../hooks/useOpenRequest.ts'
import { parseNonNegativeInt as num } from '../../lib/form.ts'
import { popoverClass } from '../ui/popover.ts'
import { FIELD, FIELD_W } from '../ui/fieldStyles.ts'
import { Button } from '../ui/primitives.tsx'

/**
 * Quick add — a generic combatant (an NPC, or a creature dropped in mid-fight)
 * that just needs a name, HP, and AC. Shown as "Quick add", not a full PC.
 */
export function AddQuickForm({
  onAdd,
  autoOpen = false,
  openRequest,
  onClosed,
  keyHint,
  hideTrigger = false,
}: {
  onAdd: (c: PlayerCharacter) => void
  /** Start open, and report closing — the phone Add menu opens this one directly. */
  autoOpen?: boolean
  /** Bump to open the already-mounted control from outside — the keyboard's command. */
  openRequest?: number
  onClosed?: () => void
  /** Hide this control's own trigger — the Add menu keeps its button in the header. */
  hideTrigger?: boolean
  /** The keyboard chord, shown in the trigger's tooltip. */
  keyHint?: string
}) {
  const [open, setOpen] = useState(autoOpen)
  useOpenRequest(openRequest, () => setOpen(true))
  const [name, setName] = useState('')
  const [ac, setAc] = useState('')
  const [hp, setHp] = useState('')
  // Quick adds are most often an enemy dropped in mid-fight, so default to foe.
  const [side, setSide] = useState<'friend' | 'foe'>('foe')
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    onClosed?.()
  }, [onClosed])
  useDismiss(ref, open, close)

  /** Add the quick combatant on the chosen side, then reset and close; blank name is a no-op. */
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const maxHp = Math.max(1, num(hp))
    onAdd({
      isPC: true,
      kind: 'quick',
      side,
      combatantId: crypto.randomUUID(),
      name: name.trim(),
      initiative: 0, // rolled when combat begins
      ac: num(ac),
      status: 'active',
      hp: { current: maxHp, max: maxHp, temp: 0 },
      concentration: null,
      effects: [],
    })
    setName('')
    setAc('')
    setHp('')
    setSide('foe')
    close()
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        onClick={() => setOpen((o) => !o)}
        title={keyHint ? `Quick add (${keyHint})` : undefined}
        className={hideTrigger ? 'hidden' : undefined}
      >
        Quick add
      </Button>
      {open && (
        <form onSubmit={submit} className={`${popoverClass('roomy:w-72')} space-y-2 p-2`}>
          <div className="flex gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              aria-label="Quick add name"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              className={`${FIELD_W} min-w-0 flex-1`}
            />
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as 'friend' | 'foe')}
              aria-label="Side"
              className={`${FIELD_W} w-24 shrink-0`}
            >
              <option value="foe">Foe</option>
              <option value="friend">Friend</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={ac}
              onChange={(e) => setAc(e.target.value)}
              placeholder="AC"
              aria-label="AC"
              inputMode="numeric"
              className={FIELD}
            />
            <input
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              placeholder="HP"
              aria-label="Max HP"
              inputMode="numeric"
              className={FIELD}
            />
          </div>
          <Button variant="primary" type="submit" className="w-full">
            Add
          </Button>
        </form>
      )}
    </div>
  )
}
