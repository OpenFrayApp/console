// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Action } from '../schema/action.ts'
import type { Combatant, MonsterCombatant, PlayerCharacter } from '../schema/combatant.ts'
import type { SpellLevel, SpellRef } from '../schema/creature.ts'
import type { Spell } from '../schema/spell.ts'
import type { Encounter } from '../schema/encounter.ts'
import { moveById, type EncounterAction } from '../state/encounter.ts'
import {
  applyDamage,
  applyHealing,
  castSpell,
  legendaryResistanceLeft,
  parseHpInput,
  rechargeLimited,
  restoreSpellUse,
  setCurrentHp,
  slotsRemaining,
  spellUsesRemaining,
  spendLegendary,
  spendLimited,
} from '../combat/resources.ts'
import { loadSrdSpells } from '../compendium/srd.ts'
import { isRechargeable, rollRecharge } from '../combat/recharge.ts'
import { isFoe } from '../combat/combatant.ts'
import { rollWithEffects } from '../combat/effectroll.ts'
import { durationRounds } from '../combat/casting.ts'
import {
  applyConcentrationResult,
  breakConcentration,
  concentrationPromptDC,
  rollConcentrationCheck,
  startConcentration,
} from '../combat/concentration.ts'
import { ActionResolver } from './ActionResolver.tsx'
import { CombatantControls } from './CombatantControls.tsx'
import { CombatantRow } from './CombatantRow.tsx'
import { ConcentrationPrompt } from './ConcentrationPrompt.tsx'
import { CreatureStatBlock } from './CreatureStatBlock.tsx'
import { PcStatBlock } from './PcStatBlock.tsx'
import { SpellCastModal } from './SpellCastModal.tsx'
import { EncounterPlayback, EncounterCleanup } from './EncounterPlayback.tsx'
import { RollLog, type OnNote, type OnRoll, type RollEntry } from './RollLog.tsx'

const COLUMN_HEADING =
  'text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'

function GroupHeading({ children }: { children: string }) {
  return (
    <p className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {children}
    </p>
  )
}

/** id → charged? for a monster's tracked recharge abilities (undefined for PCs). */
function rechargeStateOf(c: Combatant): Record<string, boolean> | undefined {
  if (c.isPC) return undefined
  const out: Record<string, boolean> = {}
  for (const [id, state] of Object.entries(c.limitedUseState)) out[id] = state.available
  return out
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
  onBegin,
  onNextTurn,
  onClearLog,
  onNote,
  onRename,
  onEditPc,
  onEditPcDmNotes,
  onEditCreature,
}: {
  encounter: Encounter
  dispatch: (action: EncounterAction) => void
  rollLog: RollEntry[]
  onRoll: OnRoll
  onNote: OnNote
  /** Open the full character editor for a roster-backed PC (saves to the DB). */
  onEditPc?: (pc: PlayerCharacter) => void
  /** Commit edited GM notes for a roster-backed PC (saves to the board + the DB). */
  onEditPcDmNotes?: (pc: PlayerCharacter, text: string) => void
  /** Open the editor for a custom creature (saves to the library; the fight is untouched). */
  onEditCreature?: (creature: MonsterCombatant) => void
  /** Keep the roll log in sync when a combatant is renamed. */
  onRename: (oldName: string, newName: string) => void
  selectedId: string | null
  onSelect: (id: string) => void
  started: boolean
  paused: boolean
  onBegin: () => void
  onNextTurn: () => void
  onClearLog: () => void
}) {
  const { combatants, activeIndex } = encounter
  const running = started && !paused
  const activeId = running ? combatants[activeIndex]?.combatantId : undefined
  // Explicitly-selected combatant, else whoever's turn it is, else the first.
  const selected =
    combatants.find((c) => c.combatantId === selectedId) ??
    combatants.find((c) => c.combatantId === activeId) ??
    combatants[0]

  // A concentration save owed after the selected combatant takes HP damage.
  const [concPrompt, setConcPrompt] = useState<{ id: string; dc: number; damage: number } | null>(
    null,
  )

  const [actionFor, setActionFor] = useState<Action | null>(null)
  // Manual reorder drag (combat only): the dragged combatant and the row it's over,
  // so the list shows a live preview before the drop commits.
  const [drag, setDrag] = useState<{ id: string; overId: string | null } | null>(null)
  const [castingSpell, setCastingSpell] = useState<SpellRef | null>(null)
  // Switching the selected combatant closes a stale resolver / cast modal.
  useEffect(() => {
    setActionFor(null)
    setCastingSpell(null)
  }, [selected?.combatantId])

  const [spellsById, setSpellsById] = useState<Map<string, Spell>>(new Map())
  useEffect(() => {
    loadSrdSpells().then(
      (spells) => setSpellsById(new Map(spells.map((s) => [s.id, s]))),
      () => {},
    )
  }, [])
  const resolveSpell = (ref?: string): Spell | undefined =>
    ref ? spellsById.get(ref) : undefined

  // HP damage to a concentrator prompts a save.
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

  const rollRechargeFor = (c: Combatant, action: Action) => {
    if (c.isPC) return
    const { recharged, roll } = rollRecharge(action)
    onRoll(`${c.label}: ${action.name} recharge`, roll)
    if (recharged) {
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (cc) => (cc.isPC ? cc : rechargeLimited(cc, action.id)),
      })
    }
  }

  // Effect-aware so Bless etc. fold into the d20.
  const rollCheckFor = (
    c: Combatant,
    label: string,
    modifier: number,
    kind: 'save' | 'check',
  ) => {
    const formula = `1d20${modifier >= 0 ? `+${modifier}` : modifier}`
    const { result, applied } = rollWithEffects(formula, { roller: c, kind })
    onRoll(`${c.isPC ? c.name : c.label}: ${label}`, result, applied)
  }

  const consumeIfRechargeable = (c: Combatant, action: Action) => {
    if (c.isPC || !isRechargeable(action)) return
    dispatch({
      type: 'update',
      id: c.combatantId,
      update: (cc) => (cc.isPC ? cc : spendLimited(cc, action.id)),
    })
  }

  // Spends a use (per-day decrements; at-will doesn't). Damage/save resolution
  // happens in the cast modal.
  const castSpellFrom = (c: MonsterCombatant, spell: SpellRef) => {
    dispatch({
      type: 'update',
      id: c.combatantId,
      update: (cc) => (cc.isPC ? cc : castSpell(cc, spell)),
    })
    // A concentration spell starts concentration, replacing any current one.
    const full = resolveSpell(spell.ref)
    if (full?.concentration) {
      dispatch({
        type: 'update',
        id: c.combatantId,
        update: (cc) =>
          cc.isPC
            ? cc
            : startConcentration(cc, {
                spell: full.name,
                saveDc: c.creature.spellcasting?.saveDc ?? 0,
                round: encounter.round,
                rounds: durationRounds(full.duration),
              }),
      })
    }
    onNote(`${c.label} casts ${spell.name}`)
  }

  const restoreSpellUseFor = (c: MonsterCombatant, spell: SpellRef) => {
    dispatch({
      type: 'update',
      id: c.combatantId,
      update: (cc) => (cc.isPC ? cc : restoreSpellUse(cc, spell)),
    })
  }

  // Spends from this round's legendary budget, then resolves it like any other
  // action when it has an attack or save.
  const applyLegendaryAction = (c: MonsterCombatant, action: Action) => {
    dispatch({
      type: 'update',
      id: c.combatantId,
      update: (cc) => (cc.isPC ? cc : spendLegendary(cc, action.legendaryCost ?? 1)),
    })
    onNote(`${c.label} uses ${action.name}`)
    const rollable = action.toHit != null || action.save != null || (action.damage?.length ?? 0) > 0
    if (rollable) setActionFor(action)
  }

  const renderRow = (c: Combatant) => (
    <CombatantRow
      key={c.combatantId}
      combatant={c}
      active={running && c.combatantId === activeId}
      selected={c.combatantId === selected?.combatantId}
      onSelect={() => onSelect(c.combatantId)}
      onRemoveEffect={(effectId) =>
        dispatch({
          type: 'update',
          id: c.combatantId,
          update: (cc) => ({ ...cc, effects: cc.effects.filter((e) => e.id !== effectId) }),
        })
      }
      onRemove={() => dispatch({ type: 'remove', id: c.combatantId })}
      onHpInput={(raw) => applyHpInput(c, raw, false)}
      reorderable={started && c.status !== 'dead'}
      dragging={drag?.id === c.combatantId}
      onReorderStart={() => setDrag({ id: c.combatantId, overId: null })}
      onReorderEnd={() => setDrag(null)}
      onReorderOver={() =>
        setDrag((d) =>
          d && d.id !== c.combatantId && d.overId !== c.combatantId
            ? { ...d, overId: c.combatantId }
            : d,
        )
      }
    />
  )
  // While dragging, render a preview order so the list visibly makes space; the
  // drop then commits the same move.
  const view =
    drag?.overId && drag.id !== drag.overId ? moveById(combatants, drag.id, drag.overId) : combatants
  const commitReorder = () => {
    if (drag?.overId && drag.id !== drag.overId) {
      dispatch({ type: 'reorder', id: drag.id, toId: drag.overId })
    }
    setDrag(null)
  }
  // Group by disposition, not isPC: a foe quick add belongs with the Creatures.
  const players = view.filter((c) => !isFoe(c))
  const creatures = view.filter((c) => isFoe(c))
  const living = view.filter((c) => c.status !== 'dead')
  const dead = view.filter((c) => c.status === 'dead')

  return (
    <div className="grid h-full grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[28rem_1fr_24rem] lg:gap-0">
      <section className="flex min-h-0 flex-col lg:border-r lg:border-slate-200 lg:pr-4 lg:dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          {started ? (
            <h2 className={COLUMN_HEADING}>
              {`Round ${encounter.round}${paused ? ' · paused' : ''}`}
            </h2>
          ) : (
            <EncounterCleanup
              hasCombatants={combatants.length > 0}
              hasFoes={creatures.length > 0}
              dispatch={dispatch}
            />
          )}
          <EncounterPlayback
            started={started}
            paused={paused}
            canBegin={combatants.length > 0}
            dispatch={dispatch}
            onBegin={onBegin}
            onNextTurn={onNextTurn}
          />
        </div>
        <div
          className="mt-2 flex-1 space-y-2 overflow-auto px-1 py-1"
          onDragOver={drag ? (e) => e.preventDefault() : undefined}
          onDrop={
            drag
              ? (e) => {
                  e.preventDefault()
                  commitReorder()
                }
              : undefined
          }
        >
          {combatants.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Add creatures to build the encounter.
            </p>
          ) : started ? (
            // In combat: living in initiative order, the dead grouped below.
            <>
              {living.map(renderRow)}
              {dead.length > 0 && <GroupHeading>Dead</GroupHeading>}
              {dead.map(renderRow)}
            </>
          ) : (
            // Before combat there's no order yet, so group by kind.
            <>
              {players.length > 0 && <GroupHeading>Players &amp; NPCs</GroupHeading>}
              {players.map(renderRow)}
              {creatures.length > 0 && <GroupHeading>Creatures</GroupHeading>}
              {creatures.map(renderRow)}
            </>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col lg:border-r lg:border-slate-200 lg:px-4 lg:dark:border-slate-800">
        {selected ? (
          <div className="min-h-0 flex-1 overflow-auto pr-4">
              {selected.isPC ? (
                <PcStatBlock
                  name={selected.name}
                  subtitle={
                    selected.kind === 'quick'
                      ? 'Quick add'
                      : ['Player character', selected.race, selected.alignment]
                          .filter(Boolean)
                          .join(' · ')
                  }
                  ac={selected.ac}
                  hp={selected.hp}
                  initiativeMod={selected.initiativeMod ?? 0}
                  speed={selected.speed}
                  abilities={selected.abilities}
                  resistances={selected.resistances}
                  immunities={selected.immunities}
                  vulnerabilities={selected.vulnerabilities}
                  languages={selected.languages}
                  senses={selected.senses}
                  passivePerception={selected.passivePerception}
                  faith={selected.faith}
                  personalityTraits={selected.personalityTraits}
                  ideals={selected.ideals}
                  bonds={selected.bonds}
                  flaws={selected.flaws}
                  backstory={selected.backstory}
                  dmNotes={selected.dmNotes}
                  concentration={selected.concentration}
                  onRename={(name) => {
                    onRename(selected.name, name)
                    dispatch({
                      type: 'update',
                      id: selected.combatantId,
                      update: (c) => (c.isPC ? { ...c, name } : c),
                    })
                  }}
                  onHpInput={(raw) => applyHpInput(selected, raw, false)}
                  onTempInput={(raw) => applyHpInput(selected, raw, true)}
                  onEditDmNotes={
                    selected.rosterId && onEditPcDmNotes
                      ? (text) => onEditPcDmNotes(selected, text)
                      : undefined
                  }
                  onCheck={(label, modifier, kind) => rollCheckFor(selected, label, modifier, kind)}
                />
              ) : (
                <CreatureStatBlock
                  creature={selected.creature}
                  hp={selected.hp}
                  concentration={selected.concentration}
                  label={selected.label}
                  onRename={(label) => {
                    onRename(selected.label, label)
                    dispatch({
                      type: 'update',
                      id: selected.combatantId,
                      update: (c) => (c.isPC ? c : { ...c, label }),
                    })
                  }}
                  onHpInput={(raw) => applyHpInput(selected, raw, false)}
                  onTempInput={(raw) => applyHpInput(selected, raw, true)}
                  onAction={setActionFor}
                  rechargeState={rechargeStateOf(selected)}
                  onRecharge={(action) => rollRechargeFor(selected, action)}
                  onCheck={(label, modifier, kind) => rollCheckFor(selected, label, modifier, kind)}
                  onCastSpell={setCastingSpell}
                  spellUsesOf={(spell) =>
                    selected.isPC ? null : spellUsesRemaining(selected, spell)
                  }
                  slotsLeftOf={
                    selected.isPC
                      ? undefined
                      : (level) => slotsRemaining(selected, String(level) as SpellLevel)
                  }
                  resolveSpell={resolveSpell}
                  onLegendaryAction={
                    selected.creature.legendaryActions
                      ? (action) => applyLegendaryAction(selected, action)
                      : undefined
                  }
                  legendaryRemaining={
                    selected.creature.legendaryActions ? selected.legendaryRemaining : undefined
                  }
                  legendaryResistanceLeft={
                    selected.creature.legendaryResistance != null
                      ? legendaryResistanceLeft(selected)
                      : undefined
                  }
                />
              )}
            </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Add a combatant, then select it to see its stat block and actions.
          </p>
        )}
      </section>

      <aside className="flex min-h-0 flex-col gap-4 overflow-auto lg:pl-4">
        {selected && (
          <div className="shrink-0">
            <h3 className={COLUMN_HEADING}>Controls</h3>
            <div className="mt-2 space-y-2">
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
                round={encounter.round}
                dispatch={dispatch}
                onRoll={onRoll}
              />
              {selected.isPC && selected.rosterId && onEditPc && (
                <button
                  type="button"
                  onClick={() => onEditPc(selected)}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Edit character
                </button>
              )}
              {!selected.isPC && selected.creatureId.startsWith('custom:') && onEditCreature && (
                <button
                  type="button"
                  onClick={() => onEditCreature(selected)}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Edit creature
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="mb-1 flex items-center justify-between">
            <h3 className={COLUMN_HEADING}>Roll log</h3>
            {rollLog.length > 0 && (
              <button
                type="button"
                onClick={onClearLog}
                className="text-xs text-slate-500 hover:underline dark:text-slate-400"
              >
                Clear
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <RollLog entries={rollLog} />
          </div>
        </div>
      </aside>

      {actionFor && selected && !selected.isPC && (
        <ActionResolver
          attacker={selected}
          action={actionFor}
          combatants={combatants}
          dispatch={dispatch}
          onRoll={onRoll}
          onUse={() => consumeIfRechargeable(selected, actionFor)}
          onClose={() => setActionFor(null)}
        />
      )}

      {castingSpell && selected && !selected.isPC && (
        <SpellCastModal
          caster={selected}
          spellRef={castingSpell}
          spell={resolveSpell(castingSpell.ref)}
          usesRemaining={spellUsesRemaining(selected, castingSpell)}
          combatants={combatants}
          dispatch={dispatch}
          onRoll={onRoll}
          onCast={() => castSpellFrom(selected, castingSpell)}
          onRestore={() => restoreSpellUseFor(selected, castingSpell)}
          onClose={() => setCastingSpell(null)}
        />
      )}
    </div>
  )
}
