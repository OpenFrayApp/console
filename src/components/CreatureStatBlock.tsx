// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Action } from '../schema/action.ts'
import type { Ability } from '../schema/primitives.ts'
import type { Creature } from '../schema/creature.ts'
import { formatCr } from '../compendium/format.ts'

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const abilityMod = (score: number): number => Math.floor((score - 10) / 2)
const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)

function ActionLine({ action }: { action: Action }) {
  return (
    <p>
      <span className="font-semibold">{action.name}.</span>{' '}
      <span className="text-slate-600 dark:text-slate-400">{action.text}</span>
    </p>
  )
}

export function CreatureStatBlock({ creature }: { creature: Creature }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">{creature.name}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {creature.size} {creature.type} · CR {formatCr(creature.cr)}
        </p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          <span className="font-semibold">AC</span> {creature.ac}
        </span>
        <span>
          <span className="font-semibold">HP</span> {creature.maxHp}
          {creature.hpFormula ? ` (${creature.hpFormula})` : ''}
        </span>
        {creature.speed.walk != null && (
          <span>
            <span className="font-semibold">Speed</span> {creature.speed.walk} ft
          </span>
        )}
      </div>

      <div className="grid grid-cols-6 gap-2 text-center text-sm">
        {ABILITIES.map((a) => (
          <div key={a}>
            <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              {a}
            </div>
            <div className="tabular-nums">
              {creature.abilities[a]} ({signed(abilityMod(creature.abilities[a]))})
            </div>
          </div>
        ))}
      </div>

      {creature.actions && creature.actions.length > 0 && (
        <div>
          <h4 className="mb-1 border-b border-slate-200 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Actions
          </h4>
          <div className="space-y-1.5 text-sm">
            {creature.actions.map((action) => (
              <ActionLine key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
