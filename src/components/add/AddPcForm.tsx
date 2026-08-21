// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useRef, useState, type FormEvent } from 'react'
import type { PlayerCharacter } from '../../schema/combatant.ts'
import { parseSpeedInput } from '../../combat/speed.ts'
import { useDismiss } from '../../hooks/useDismiss.ts'
import { useOpenRequest } from '../../hooks/useOpenRequest.ts'
import {
  NO_AUTOFILL,
  parseList as list,
  parseNonNegativeInt as num,
  parseSignedInt,
} from '../../lib/form.ts'
import { popoverClass } from '../ui/popover.ts'
import { FIELD, LABEL } from '../ui/fieldStyles.ts'
import { Button } from '../ui/primitives.tsx'

/**
 * Add a player character — the combat-relevant fields the GM wants on the board.
 * The initiative field is a *modifier*: at combat start it's rolled (d20 + this)
 * unless the GM types a flat value into the initiative prompt. Players roll their
 * own dice, so nothing here is auto-rolled.
 */
export function AddPcForm({
  onAdd,
  autoOpen = false,
  openRequest,
  onClosed,
  keyHint,
  hideTrigger = false,
}: {
  onAdd: (pc: PlayerCharacter) => void
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
  const [f, setF] = useState({
    name: '',
    ac: '',
    hp: '',
    init: '',
    pp: '',
    languages: '',
    speed: '',
    resistances: '',
    immunities: '',
    vulnerabilities: '',
  })
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    onClosed?.()
  }, [onClosed])
  useDismiss(ref, open, close)

  /** Make an onChange handler that writes the input's value into the named draft field. */
  const set = (key: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }))

  /** Build the PC from the fields and add it, then reset and close; blank name is a no-op. */
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return
    const maxHp = Math.max(1, num(f.hp))
    const speed = parseSpeedInput(f.speed)
    onAdd({
      isPC: true,
      kind: 'pc',
      combatantId: crypto.randomUUID(),
      name: f.name.trim(),
      initiative: 0, // rolled/entered when combat begins
      initiativeMod: f.init ? parseSignedInt(f.init) : undefined,
      ac: num(f.ac),
      passivePerception: f.pp ? num(f.pp) : undefined,
      languages: list(f.languages).length ? list(f.languages) : undefined,
      resistances: list(f.resistances).length ? list(f.resistances) : undefined,
      immunities: list(f.immunities).length ? list(f.immunities) : undefined,
      vulnerabilities: list(f.vulnerabilities).length ? list(f.vulnerabilities) : undefined,
      speed: Object.keys(speed).length ? speed : undefined,
      status: 'active',
      hp: { current: maxHp, max: maxHp, temp: 0 },
      concentration: null,
      effects: [],
    })
    setF({
      name: '',
      ac: '',
      hp: '',
      init: '',
      pp: '',
      languages: '',
      speed: '',
      resistances: '',
      immunities: '',
      vulnerabilities: '',
    })
    close()
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        onClick={() => setOpen((o) => !o)}
        title={keyHint ? `Add PC (${keyHint})` : undefined}
        className={hideTrigger ? 'hidden' : undefined}
      >
        Add PC
      </Button>
      {open && (
        <form
          onSubmit={submit}
          {...NO_AUTOFILL}
          className={`${popoverClass('roomy:w-72')} space-y-2 p-2 roomy:max-h-[70dvh] roomy:overflow-auto`}
        >
          <input
            autoFocus
            value={f.name}
            onChange={set('name')}
            placeholder="Name"
            aria-label="PC name"
            {...NO_AUTOFILL}
            className={FIELD}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              value={f.ac}
              onChange={set('ac')}
              placeholder="AC"
              aria-label="AC"
              inputMode="numeric"
              {...NO_AUTOFILL}
              className={FIELD}
            />
            <input
              value={f.hp}
              onChange={set('hp')}
              placeholder="HP"
              aria-label="Max HP"
              inputMode="numeric"
              {...NO_AUTOFILL}
              className={FIELD}
            />
            <input
              value={f.init}
              onChange={set('init')}
              placeholder="Init +"
              aria-label="Initiative modifier"
              inputMode="numeric"
              {...NO_AUTOFILL}
              className={FIELD}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={f.pp}
              onChange={set('pp')}
              placeholder="Passive Perception"
              aria-label="Passive Perception"
              inputMode="numeric"
              {...NO_AUTOFILL}
              className={FIELD}
            />
            <input
              value={f.speed}
              onChange={set('speed')}
              placeholder="Speed (30, climb 12)"
              aria-label="Speed"
              {...NO_AUTOFILL}
              className={FIELD}
            />
          </div>
          <input
            value={f.languages}
            onChange={set('languages')}
            placeholder="Languages, separated by commas"
            aria-label="Languages"
            {...NO_AUTOFILL}
            className={FIELD}
          />
          <div className="space-y-1">
            <p className={LABEL}>Defenses, separated by commas</p>
            <input
              value={f.resistances}
              onChange={set('resistances')}
              placeholder="Resistances"
              aria-label="Resistances"
              {...NO_AUTOFILL}
              className={FIELD}
            />
            <input
              value={f.immunities}
              onChange={set('immunities')}
              placeholder="Immunities"
              aria-label="Immunities"
              {...NO_AUTOFILL}
              className={FIELD}
            />
            <input
              value={f.vulnerabilities}
              onChange={set('vulnerabilities')}
              placeholder="Vulnerabilities"
              aria-label="Vulnerabilities"
              {...NO_AUTOFILL}
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
