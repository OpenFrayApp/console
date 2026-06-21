// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Action } from '../schema/action.ts'
import type { Combatant, MonsterCombatant, PlayerCharacter } from '../schema/combatant.ts'
import type { SpellRef } from '../schema/creature.ts'
import type { Spell } from '../schema/spell.ts'
import type { Encounter } from '../schema/encounter.ts'
import type { EncounterAction } from '../state/encounter.ts'
import {
  applyDamage,
  applyHealing,
  castSpell,
  hpTierOf,
  legendaryResistanceLeft,
  parseHpInput,
  rechargeLimited,
  restoreSpellUse,
  setCurrentHp,
  spellUsesRemaining,
  spendLimited,
  spendLegendaryResistance,
} from '../combat/resources.ts'
import { loadSrdSpells } from '../compendium/srd.ts'
import { isRechargeable, rollRecharge } from '../combat/recharge.ts'
import { rollWithEffects } from '../combat/effectroll.ts'
import {
  applyConcentrationResult,
  breakConcentration,
  concentrationPromptDC,
  rollConcentrationCheck,
} from '../combat/concentration.ts'
import { ActionResolver } from './ActionResolver.tsx'
import { CastSpellPanel } from './CastSpellPanel.tsx'
import { CombatantControls } from './CombatantControls.tsx'
import { CombatantRow } from './CombatantRow.tsx'
import { ConcentrationPrompt } from './ConcentrationPrompt.tsx'
import { CreatureStatBlock } from './CreatureStatBlock.tsx'
import { SpellCastModal } from './SpellCastModal.tsx'
import { EncounterPlayback } from './EncounterPlayback.tsx'
import { hpToneFor } from './hpTone.ts'
import { HeaderStat, StatHeader } from './StatHeader.tsx'
import { DefensesAndSenses } from './CreatureStatBlock.tsx'
import { speedLines } from '../combat/speed.ts'
import { MassSavePanel } from './MassSavePanel.tsx'
import { QuickRoll } from './QuickRoll.tsx'
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
        subtitle={pc.kind === 'quick' ? 'Quick add' : 'Player character'}
        concentration={pc.concentration}
        speeds={pc.speed ? speedLines(pc.speed) : undefined}
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
            {/* The modifier, like a creature's Init bonus — the rolled value lives in the tracker. */}
            <HeaderStat
              label="Init"
              value={`${(pc.initiativeMod ?? 0) >= 0 ? '+' : ''}${pc.initiativeMod ?? 0}`}
            />
          </>
        }
      />
      <DefensesAndSenses
        resistances={pc.resistances?.join(', ')}
        immunities={pc.immunities?.join(', ')}
        vulnerabilities={pc.vulnerabilities?.join(', ')}
        senses={
          pc.passivePerception != null ? `Passive Perception ${pc.passivePerception}` : undefined
        }
        languages={pc.languages?.join(', ')}
      />
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
  onBegin,
  onNextTurn,
  onClearLog,
  onNote,
}: {
  encounter: Encounter
  dispatch: (action: EncounterAction) => void
  rollLog: RollEntry[]
  onRoll: OnRoll
  onNote: OnNote
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
  // Show the explicitly-selected combatant, else whoever's turn it is, else the first.
  const selected =
    combatants.find((c) => c.combatantId === selectedId) ??
    combatants.find((c) => c.combatantId === activeId) ??
    combatants[0]

  // A concentration save owed after the selected combatant takes HP damage.
  const [concPrompt, setConcPrompt] = useState<{ id: string; dc: number; damage: number } | null>(
    null,
  )

  // The action whose resolver modal is open (the selected creature is the attacker).
  const [actionFor, setActionFor] = useState<Action | null>(null)
  // The spell being cast from the selected creature's stat block.
  const [castingSpell, setCastingSpell] = useState<SpellRef | null>(null)
  // Switching the selected combatant closes a stale resolver / cast modal.
  useEffect(() => {
    setActionFor(null)
    setCastingSpell(null)
  }, [selected?.combatantId])

  // The SRD spells, loaded once, indexed by id for the hover card + cast resolution.
  const [spellsById, setSpellsById] = useState<Map<string, Spell>>(new Map())
  useEffect(() => {
    loadSrdSpells().then(
      (spells) => setSpellsById(new Map(spells.map((s) => [s.id, s]))),
      () => {},
    )
  }, [])
  const resolveSpell = (ref?: string): Spell | undefined =>
    ref ? spellsById.get(ref) : undefined

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

  // Roll a recharge die for a spent ability; on success it becomes usable again.
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

  // Roll an ability check / save / skill off the stat block (d20 + modifier),
  // effect-aware so Bless etc. fold in, and log it.
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

  // Spend a rechargeable action when it's used from the resolver.
  const consumeIfRechargeable = (c: Combatant, action: Action) => {
    if (c.isPC || !isRechargeable(action)) return
    dispatch({
      type: 'update',
      id: c.combatantId,
      update: (cc) => (cc.isPC ? cc : spendLimited(cc, action.id)),
    })
  }

  // Casting a spell from the stat block: spend a use (per-day decrements; at-will
  // doesn't) and log the cast. The damage/save resolution is in the cast modal.
  const castSpellFrom = (c: MonsterCombatant, spell: SpellRef) => {
    dispatch({
      type: 'update',
      id: c.combatantId,
      update: (cc) => (cc.isPC ? cc : castSpell(cc, spell)),
    })
    onNote(`${c.label} casts ${spell.name}`)
  }

  const restoreSpellUseFor = (c: MonsterCombatant, spell: SpellRef) => {
    dispatch({
      type: 'update',
      id: c.combatantId,
      update: (cc) => (cc.isPC ? cc : restoreSpellUse(cc, spell)),
    })
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
    />
  )
  const players = combatants.filter((c) => c.isPC)
  const creatures = combatants.filter((c) => !c.isPC)
  const living = combatants.filter((c) => c.status !== 'dead')
  const dead = combatants.filter((c) => c.status === 'dead')

  return (
    <div className="grid h-full grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[28rem_1fr_24rem] lg:gap-0">
      {/* Left — initiative tracker */}
      <section className="flex min-h-0 flex-col lg:border-r lg:border-slate-200 lg:pr-4 lg:dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h2 className={COLUMN_HEADING}>
            {started ? `Round ${encounter.round}${paused ? ' · paused' : ''}` : 'Initiative'}
          </h2>
          <EncounterPlayback
            started={started}
            paused={paused}
            canBegin={combatants.length > 0}
            dispatch={dispatch}
            onBegin={onBegin}
            onNextTurn={onNextTurn}
          />
        </div>
        <div className="mt-2 flex-1 space-y-2 overflow-auto px-1 py-1">
          {combatants.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Add creatures to build the encounter.
            </p>
          ) : started ? (
            // During combat: living combatants in initiative order, the dead grouped below.
            <>
              {living.map(renderRow)}
              {dead.length > 0 && <GroupHeading>Dead</GroupHeading>}
              {dead.map(renderRow)}
            </>
          ) : (
            // Before combat there's no order yet, so group by kind for clarity.
            <>
              {players.length > 0 && <GroupHeading>Players &amp; NPCs</GroupHeading>}
              {players.map(renderRow)}
              {creatures.length > 0 && <GroupHeading>Creatures</GroupHeading>}
              {creatures.map(renderRow)}
            </>
          )}
        </div>
      </section>

      {/* Center — stat block scrolls; Source + controls stay pinned at the bottom. */}
      <section className="flex min-h-0 flex-col lg:border-r lg:border-slate-200 lg:px-4 lg:dark:border-slate-800">
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
                  onAction={setActionFor}
                  rechargeState={rechargeStateOf(selected)}
                  onRecharge={(action) => rollRechargeFor(selected, action)}
                  onCheck={(label, modifier, kind) => rollCheckFor(selected, label, modifier, kind)}
                  onCastSpell={setCastingSpell}
                  spellUsesOf={(spell) =>
                    selected.isPC ? null : spellUsesRemaining(selected, spell)
                  }
                  resolveSpell={resolveSpell}
                  legendaryResistance={
                    selected.creature.legendaryResistance != null
                      ? {
                          left: legendaryResistanceLeft(selected),
                          onUse: () =>
                            dispatch({
                              type: 'update',
                              id: selected.combatantId,
                              update: (c) => (c.isPC ? c : spendLegendaryResistance(c)),
                            }),
                        }
                      : undefined
                  }
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
      <aside className="flex min-h-0 flex-col gap-3 overflow-auto lg:pl-4">
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
