// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability } from '../schema/primitives.ts'
import type { RosterPc } from '../schema/roster.ts'
import { speedLines } from '../combat/speed.ts'

const ABILITY_ORDER: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABEL: Record<Ability, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

/** The signed modifier for an ability score, e.g. 14 → "+2", 8 → "−1". */
function modOf(score: number): string {
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : `−${-mod}`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-semibold">{label}</dt>
      <dd>{value}</dd>
    </>
  )
}

/**
 * Read-only view of a roster PC — the same shape as a creature stat block or
 * campaign card. Add to encounter / Edit / Delete live in the bottom source row
 * (roster PCs are always the viewer's own).
 */
export function PcCard({
  pc,
  campaignName,
  onAddToEncounter,
  onEdit,
  onDelete,
}: {
  pc: RosterPc
  /** Resolved name of the PC's campaign, if assigned. */
  campaignName?: string
  onAddToEncounter: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const speed = pc.speed ? speedLines(pc.speed).join(', ') : ''
  const defenses = [
    pc.resistances?.length ? `Resistant to ${pc.resistances.join(', ')}` : '',
    pc.immunities?.length ? `Immune to ${pc.immunities.join(', ')}` : '',
    pc.vulnerabilities?.length ? `Vulnerable to ${pc.vulnerabilities.join(', ')}` : '',
  ].filter(Boolean)

  return (
    <div className="flex flex-1 flex-col space-y-3 pt-4">
      <div>
        <h3 className="text-lg font-semibold">{pc.name}</h3>
        <p className="text-sm italic text-slate-500 dark:text-slate-400">
          Player character{campaignName ? ` · ${campaignName}` : ''}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <Row label="Armor Class" value={String(pc.ac)} />
        <Row label="Hit Points" value={String(pc.maxHp)} />
        {pc.abilities && <Row label="Initiative" value={modOf(pc.abilities.dex)} />}
        {pc.passivePerception != null && (
          <Row label="Passive Perception" value={String(pc.passivePerception)} />
        )}
        {speed && <Row label="Speed" value={speed} />}
        {pc.languages?.length ? <Row label="Languages" value={pc.languages.join(', ')} /> : null}
        {defenses.map((line) => (
          <dd key={line} className="col-span-2 text-slate-600 dark:text-slate-400">
            {line}
          </dd>
        ))}
      </dl>

      {pc.abilities && (
        <div className="grid grid-cols-6 gap-2 rounded-md border border-slate-200 p-2 text-center dark:border-slate-800">
          {ABILITY_ORDER.map((a) => (
            <div key={a}>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {ABILITY_LABEL[a]}
              </div>
              <div className="text-sm font-semibold">{pc.abilities![a]}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{modOf(pc.abilities![a])}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-end gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
        <button
          type="button"
          onClick={onAddToEncounter}
          className="mr-auto rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          Add to encounter
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
