// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { PlayerCharacter } from '../schema/combatant.ts'
import type { Encounter } from '../schema/encounter.ts'
import type { EncounterAction } from '../state/encounter.ts'
import { CastSpellPanel } from './CastSpellPanel.tsx'
import { CombatantControls } from './CombatantControls.tsx'
import { CombatantRow } from './CombatantRow.tsx'
import { CreatureStatBlock } from './CreatureStatBlock.tsx'
import { MassSavePanel } from './MassSavePanel.tsx'
import { QuickRoll } from './QuickRoll.tsx'
import { RollLog, type OnRoll, type RollEntry } from './RollLog.tsx'

const COLUMN_HEADING =
  'text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'

/** Lightweight detail panel for a selected PC (no full stat block by design). */
function PcSummary({ pc }: { pc: PlayerCharacter }) {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold">{pc.name}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">Player character</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          <span className="font-semibold">AC</span> {pc.ac}
        </span>
        <span>
          <span className="font-semibold">HP</span> {pc.hp.current}/{pc.hp.max}
          {pc.hp.temp > 0 ? ` +${pc.hp.temp} temp` : ''}
        </span>
        <span>
          <span className="font-semibold">Passive Perception</span> {pc.passivePerception}
        </span>
      </div>
      {pc.languages && pc.languages.length > 0 && (
        <p className="text-sm">
          <span className="font-semibold">Languages</span> {pc.languages.join(', ')}
        </p>
      )}
    </div>
  )
}

export function EncounterConsole({
  encounter,
  dispatch,
  rollLog,
  onRoll,
  selectedId,
  onSelect,
  started,
  paused,
}: {
  encounter: Encounter
  dispatch: (action: EncounterAction) => void
  rollLog: RollEntry[]
  onRoll: OnRoll
  selectedId: string | null
  onSelect: (id: string) => void
  started: boolean
  paused: boolean
}) {
  const { combatants, activeIndex } = encounter
  const running = started && !paused
  const activeId = running ? combatants[activeIndex]?.combatantId : undefined
  // Show the explicitly-selected combatant, else whoever's turn it is, else the first.
  const selected =
    combatants.find((c) => c.combatantId === selectedId) ??
    combatants.find((c) => c.combatantId === activeId) ??
    combatants[0]

  return (
    <div className="grid h-full grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[28rem_1fr_24rem]">
      {/* Left — initiative tracker */}
      <section className="flex min-h-0 flex-col">
        <h2 className={COLUMN_HEADING}>
          {started ? `Round ${encounter.round}${paused ? ' · paused' : ''}` : 'Initiative'}
        </h2>
        <div className="mt-2 flex-1 space-y-2 overflow-auto px-1 py-1">
          {combatants.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Add creatures to build the encounter.
            </p>
          ) : (
            combatants.map((c, i) => (
              <CombatantRow
                key={c.combatantId}
                combatant={c}
                active={running && i === activeIndex}
                selected={c.combatantId === selected?.combatantId}
                onSelect={() => onSelect(c.combatantId)}
                onRemoveEffect={(effectId) =>
                  dispatch({
                    type: 'update',
                    id: c.combatantId,
                    update: (cc) => ({
                      ...cc,
                      effects: cc.effects.filter((e) => e.id !== effectId),
                    }),
                  })
                }
              />
            ))
          )}
        </div>
      </section>

      {/* Center — the selected combatant: stat block + controls */}
      <section className="min-h-0 overflow-auto">
        {selected ? (
          <div className="space-y-4">
            {selected.isPC ? (
              <PcSummary pc={selected} />
            ) : (
              <CreatureStatBlock creature={selected.creature} />
            )}
            <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
              <CombatantControls
                combatant={selected}
                combatants={combatants}
                round={encounter.round}
                dispatch={dispatch}
                onRoll={onRoll}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Add a combatant, then select it to see its stat block and actions.
          </p>
        )}
      </section>

      {/* Right — combat actions, dice, roll log */}
      <aside className="flex min-h-0 flex-col gap-3 overflow-auto">
        {combatants.length > 0 && (
          <div className="flex flex-wrap items-start gap-2">
            <MassSavePanel combatants={combatants} dispatch={dispatch} onRoll={onRoll} />
            <CastSpellPanel combatants={combatants} dispatch={dispatch} onRoll={onRoll} />
          </div>
        )}

        <div>
          <h3 className={`mb-1 ${COLUMN_HEADING}`}>Dice</h3>
          <QuickRoll onRoll={onRoll} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <h3 className={`mb-1 ${COLUMN_HEADING}`}>Roll log</h3>
          <div className="min-h-0 flex-1 overflow-auto">
            <RollLog entries={rollLog} />
          </div>
        </div>
      </aside>
    </div>
  )
}
