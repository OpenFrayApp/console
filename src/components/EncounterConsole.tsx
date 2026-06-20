// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import type { Combatant, PlayerCharacter } from '../schema/combatant.ts'
import type { Encounter } from '../schema/encounter.ts'
import type { EncounterAction } from '../state/encounter.ts'
import {
  applyDamage,
  applyHealing,
  hpTierOf,
  parseHpInput,
  setCurrentHp,
} from '../combat/resources.ts'
import {
  applyConcentrationResult,
  breakConcentration,
  concentrationPromptDC,
  rollConcentrationCheck,
} from '../combat/concentration.ts'
import { CastSpellPanel } from './CastSpellPanel.tsx'
import { CombatantControls } from './CombatantControls.tsx'
import { CombatantRow } from './CombatantRow.tsx'
import { ConcentrationPrompt } from './ConcentrationPrompt.tsx'
import { CreatureStatBlock } from './CreatureStatBlock.tsx'
import { hpToneFor } from './hpTone.ts'
import { HeaderStat, StatHeader } from './StatHeader.tsx'
import { MassSavePanel } from './MassSavePanel.tsx'
import { QuickRoll } from './QuickRoll.tsx'
import { RollLog, type OnRoll, type RollEntry } from './RollLog.tsx'

const COLUMN_HEADING =
  'text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'

/** PC detail panel — same header style as the creature stat block, lighter body. */
function PcSummary({
  pc,
  onRename,
  onHpInput,
  onTempInput,
}: {
  pc: PlayerCharacter
  onRename: (name: string) => void
  onHpInput: (raw: string) => void
  onTempInput: (raw: string) => void
}) {
  const hpTone = hpToneFor(hpTierOf(pc.hp.current, pc.hp.max))
  const hpValue = (
    <span>
      <span className={hpTone}>{pc.hp.current}</span>
      <span className="text-slate-400 dark:text-slate-500">/{pc.hp.max}</span>
    </span>
  )
  const tmpValue =
    pc.hp.temp > 0 ? (
      <span className="text-sky-600 dark:text-sky-400">{pc.hp.temp}</span>
    ) : (
      <span className="text-slate-400 dark:text-slate-500">—</span>
    )
  return (
    <div className="@container flex flex-1 flex-col space-y-4">
      <StatHeader
        name={pc.name}
        onRename={onRename}
        subtitle="Player character"
        concentration={pc.concentration}
        stats={
          <>
            <HeaderStat label="AC" value={pc.ac} />
            <HeaderStat
              label="HP"
              value={hpValue}
              edit={{ initial: '', onCommit: onHpInput, title: 'Set HP, or +N / −N' }}
            />
            <HeaderStat
              label="TMP"
              value={tmpValue}
              edit={{ initial: '', onCommit: onTempInput, title: 'Set temp HP, or +N / −N' }}
            />
            <HeaderStat label="Init" value={pc.initiative} />
            <HeaderStat label="PP" value={pc.passivePerception} />
          </>
        }
      />
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

  // A concentration save owed after the selected combatant takes HP damage.
  const [concPrompt, setConcPrompt] = useState<{ id: string; dc: number; damage: number } | null>(
    null,
  )

  // Apply an HP/temp edit ("12", "+5", "-3"); HP damage to a concentrator prompts a save.
  const applyHpInput = (c: Combatant, raw: string, isTemp: boolean) => {
    const parsed = parseHpInput(raw)
    if (!parsed) return
    if (isTemp) {
      const next = 'delta' in parsed ? Math.max(0, c.hp.temp + parsed.delta) : parsed.set
      if (
        'set' in parsed &&
        next < c.hp.temp &&
        !window.confirm(
          `Temporary HP doesn't stack — you normally keep the higher value (now ${c.hp.temp}). Set it to ${next} anyway?`,
        )
      ) {
        return
      }
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (cc) => ({ ...cc, hp: { ...cc.hp, temp: Math.max(0, next) } }),
      })
      return
    }
    const op = (cc: Combatant): Combatant =>
      'delta' in parsed
        ? parsed.delta < 0
          ? applyDamage(cc, -parsed.delta)
          : applyHealing(cc, parsed.delta)
        : setCurrentHp(cc, parsed.set)
    dispatch({ type: 'update', id: c.combatantId, update: op })
    const damage =
      'delta' in parsed
        ? parsed.delta < 0
          ? -parsed.delta
          : 0
        : Math.max(0, c.hp.current - parsed.set)
    if (damage > 0) {
      const dc = concentrationPromptDC(c, op(c), damage)
      if (dc != null) setConcPrompt({ id: c.combatantId, dc, damage })
    }
  }

  const resolveConcentration = (update?: (c: Combatant) => Combatant) => {
    if (update && concPrompt) {
      dispatch({ type: 'update', id: concPrompt.id, update })
    }
    setConcPrompt(null)
  }

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

      {/* Center — stat block scrolls; Source + controls stay pinned at the bottom. */}
      <section className="flex min-h-0 flex-col">
        {selected ? (
          <>
            <div className="min-h-0 flex-1 overflow-auto pr-4">
              {selected.isPC ? (
                <PcSummary
                  pc={selected}
                  onRename={(name) =>
                    dispatch({
                      type: 'update',
                      id: selected.combatantId,
                      update: (c) => (c.isPC ? { ...c, name } : c),
                    })
                  }
                  onHpInput={(raw) => applyHpInput(selected, raw, false)}
                  onTempInput={(raw) => applyHpInput(selected, raw, true)}
                />
              ) : (
                <CreatureStatBlock
                  creature={selected.creature}
                  hp={selected.hp}
                  concentration={selected.concentration}
                  label={selected.label}
                  onRename={(label) =>
                    dispatch({
                      type: 'update',
                      id: selected.combatantId,
                      update: (c) => (c.isPC ? c : { ...c, label }),
                    })
                  }
                  onHpInput={(raw) => applyHpInput(selected, raw, false)}
                  onTempInput={(raw) => applyHpInput(selected, raw, true)}
                />
              )}
            </div>
            <div className="shrink-0 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              {concPrompt && concPrompt.id === selected.combatantId && (
                <ConcentrationPrompt
                  dc={concPrompt.dc}
                  canRoll={!selected.isPC}
                  onMaintain={() => resolveConcentration()}
                  onBreak={() => resolveConcentration(breakConcentration)}
                  onRoll={
                    selected.isPC
                      ? undefined
                      : () => {
                          const check = rollConcentrationCheck(selected, concPrompt.damage)
                          onRoll(`${selected.label}: concentration`, check.roll, check.applied)
                          resolveConcentration((c) => applyConcentrationResult(c, check.maintained))
                        }
                  }
                />
              )}
              <CombatantControls
                combatant={selected}
                combatants={combatants}
                round={encounter.round}
                dispatch={dispatch}
                onRoll={onRoll}
              />
            </div>
          </>
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
