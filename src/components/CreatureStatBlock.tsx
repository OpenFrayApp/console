// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability, Senses, SkillBonuses } from '../schema/primitives.ts'
import { speedLines } from '../combat/speed.ts'
import type { Action, Recharge } from '../schema/action.ts'
import type { Creature } from '../schema/creature.ts'
import type { Concentration, HitPoints } from '../schema/combatant.ts'
import { hpTierOf } from '../combat/resources.ts'
import { formatCr } from '../compendium/format.ts'
import { hpToneFor } from './hpTone.ts'
import { Markdown } from './Markdown.tsx'
import { SourceLink } from './SourceLink.tsx'
import { HeaderStat, StatHeader } from './StatHeader.tsx'

const ABILITY_LABEL: Record<Ability, string> = {
  str: 'Str',
  dex: 'Dex',
  con: 'Con',
  int: 'Int',
  wis: 'Wis',
  cha: 'Cha',
}
const abilityMod = (score: number): number => Math.floor((score - 10) / 2)
const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)

// The ability/skill table headings and row labels use swapped styles: the heading
// is the heavier one, the row label the lighter.
const TABLE_HEADING = 'font-semibold uppercase text-slate-500 dark:text-slate-400'
const TABLE_ROW_LABEL =
  'text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500'

function titleCase(skill: string): string {
  return skill.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}


function rechargeLabel(recharge: Recharge | undefined): string | undefined {
  if (!recharge) return undefined
  if (recharge.type === 'dice') {
    return recharge.value >= 6 ? 'Recharge 6' : `Recharge ${recharge.value}–6`
  }
  if (recharge.type === 'perDay') return `${recharge.value}/Day`
  return `${recharge.value}/Round`
}

function formatSenses(senses: Senses): string {
  const parts: string[] = []
  if (senses.darkvision) parts.push(`Darkvision ${senses.darkvision} ft.`)
  if (senses.blindsight) parts.push(`Blindsight ${senses.blindsight} ft.`)
  if (senses.tremorsense) parts.push(`Tremorsense ${senses.tremorsense} ft.`)
  if (senses.truesight) parts.push(`Truesight ${senses.truesight} ft.`)
  parts.push(`Passive Perception ${senses.passivePerception}`)
  return parts.join(', ')
}

/** A two-column "label / value" table that always renders, showing "—" if empty. */
export function MetaTable({ rows }: { rows: [string, string | undefined][] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="odd:bg-slate-100 dark:odd:bg-slate-800/40">
            <td className="w-px whitespace-nowrap rounded-l px-2 py-1 align-top text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {label}
            </td>
            <td className="rounded-r px-2 py-1 align-top text-xs text-slate-600 dark:text-slate-300">
              {value && value.length ? value : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Defenses (resistances/immunities/vulnerabilities) and senses/languages, laid
 * out the same way for every stat block — creatures and PCs alike. Only the rows
 * we actually have are shown; an empty table (e.g. a PC with no defenses) is
 * dropped entirely, so a lightweight combatant doesn't render a wall of "—".
 */
export function DefensesAndSenses({
  resistances,
  immunities,
  vulnerabilities,
  senses,
  languages,
}: {
  resistances?: string
  immunities?: string
  vulnerabilities?: string
  senses?: string
  languages?: string
}) {
  const present = (label: string, value?: string): [string, string][] =>
    value && value.length ? [[label, value]] : []
  const defenseRows: [string, string][] = [
    ...present('Resistances', resistances),
    ...present('Immunities', immunities),
    ...present('Vulnerabilities', vulnerabilities),
  ]
  const senseRows: [string, string][] = [
    ...present('Senses', senses),
    ...present('Languages', languages),
  ]
  if (defenseRows.length === 0 && senseRows.length === 0) return null
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
      {defenseRows.length > 0 && (
        <div className="min-w-[16rem] flex-1">
          <MetaTable rows={defenseRows} />
        </div>
      )}
      {senseRows.length > 0 && (
        <div className="min-w-[16rem] flex-1">
          <MetaTable rows={senseRows} />
        </div>
      )}
    </div>
  )
}

// --- ability / skill tables -------------------------------------------------

const ABILITY_GROUPS: Ability[][] = [
  ['str', 'dex', 'con'],
  ['int', 'wis', 'cha'],
]

/** Roll a d20 + this modifier when `onCheck` is supplied (i.e. in combat). */
export type OnCheck = (label: string, modifier: number, kind: 'save' | 'check') => void

function RollableValue({
  label,
  modifier,
  kind,
  onCheck,
  children,
}: {
  label: string
  modifier: number
  kind: 'save' | 'check'
  onCheck?: OnCheck
  children: string
}) {
  if (!onCheck) return <>{children}</>
  return (
    <button
      type="button"
      onClick={() => onCheck(label, modifier, kind)}
      title={`Roll ${label}`}
      className="text-indigo-600 hover:underline dark:text-indigo-400"
    >
      {children}
    </button>
  )
}

/** The ability block as two MOD/SAVE tables that fill the available width. */
function AbilityScores({ creature, onCheck }: { creature: Creature; onCheck?: OnCheck }) {
  const saveFor = (a: Ability): number =>
    creature.saves?.[a] ?? abilityMod(creature.abilities[a])
  return (
    <div className="flex gap-3 text-sm">
      {ABILITY_GROUPS.map((group, i) => (
        <table key={i} className="flex-1">
          <thead>
            <tr className={TABLE_HEADING}>
              <th />
              <th />
              <th className="px-1 text-right">Mod</th>
              <th className="px-1 text-right">Save</th>
            </tr>
          </thead>
          <tbody>
            {group.map((a) => (
              <tr key={a} className="odd:bg-slate-100 dark:odd:bg-slate-800/40">
                <td className={`rounded-l px-2 py-1 ${TABLE_ROW_LABEL}`}>{ABILITY_LABEL[a]}</td>
                <td className="px-1 py-1 text-right tabular-nums">{creature.abilities[a]}</td>
                <td className="px-1 py-1 text-right tabular-nums">
                  <RollableValue
                    label={`${a.toUpperCase()} check`}
                    modifier={abilityMod(creature.abilities[a])}
                    kind="check"
                    onCheck={onCheck}
                  >
                    {signed(abilityMod(creature.abilities[a]))}
                  </RollableValue>
                </td>
                <td className="rounded-r px-2 py-1 text-right tabular-nums">
                  <RollableValue
                    label={`${a.toUpperCase()} save`}
                    modifier={saveFor(a)}
                    kind="save"
                    onCheck={onCheck}
                  >
                    {signed(saveFor(a))}
                  </RollableValue>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  )
}

function SkillsTable({ skills, onCheck }: { skills: SkillBonuses; onCheck?: OnCheck }) {
  const entries = Object.entries(skills)
  if (entries.length === 0) return null
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className={TABLE_HEADING}>
          <th className="px-2 text-left">Skills</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {entries.map(([skill, bonus]) => (
          <tr key={skill} className="odd:bg-slate-100 dark:odd:bg-slate-800/40">
            <td className={`rounded-l px-2 py-1 ${TABLE_ROW_LABEL}`}>{titleCase(skill)}</td>
            <td className="rounded-r px-2 py-1 text-right tabular-nums">
              <RollableValue
                label={titleCase(skill)}
                modifier={bonus as number}
                kind="check"
                onCheck={onCheck}
              >
                {signed(bonus as number)}
              </RollableValue>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// --- sections ---------------------------------------------------------------

interface Entry {
  name: string
  text?: string
  /** Suffix after the name, e.g. "Recharge 5–6". */
  note?: string
}

function Section({ title, items }: { title: string; items?: Entry[] }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <h4 className="mb-2 border-b border-slate-200 pb-1 text-base font-semibold tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-300">
        {title}
      </h4>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {items.map((entry) => (
          <Markdown key={entry.name}>
            {`**${entry.name}${entry.note ? ` (${entry.note})` : ''}.** ${entry.text ?? ''}`}
          </Markdown>
        ))}
      </div>
    </div>
  )
}

/** An action can be resolved (rolled) if it has a to-hit, a save, or damage. */
function isRollable(a: Action): boolean {
  return a.toHit != null || a.save != null || (a.damage?.length ?? 0) > 0
}

const SECTION_HEADING =
  'mb-2 border-b border-slate-200 pb-1 text-base font-semibold tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-300'

/**
 * Renders a list of actions. When `onAction` is supplied (i.e. in combat), the
 * name of each rollable action becomes a button that opens the resolver; the
 * prose follows inline so the stat-block reads the same. In the reference
 * compendium no handler is passed, so names stay plain text.
 */
function ActionSection({
  title,
  actions,
  onAction,
  rechargeState,
  onRecharge,
}: {
  title: string
  actions?: Action[]
  onAction?: (a: Action) => void
  /** id → charged? A rechargeable action that is `false` can't be used until it recharges. */
  rechargeState?: Record<string, boolean>
  onRecharge?: (a: Action) => void
}) {
  if (!actions || actions.length === 0) return null
  return (
    <div>
      <h4 className={SECTION_HEADING}>{title}</h4>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {actions.map((a) => {
          const note = rechargeLabel(a.recharge)
          const heading = `${a.name}${note ? ` (${note})` : ''}`
          const charged = rechargeState?.[a.id] !== false
          if (onAction && isRollable(a) && charged) {
            return (
              <p key={a.id}>
                <button
                  type="button"
                  onClick={() => onAction(a)}
                  title="Roll this action"
                  className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {heading}.
                </button>{' '}
                {a.text ? <Markdown inline>{a.text}</Markdown> : null}
              </p>
            )
          }
          // Spent recharge ability — not usable until it recharges. Offer a roll.
          if (onAction && isRollable(a) && !charged) {
            return (
              <p key={a.id} className="opacity-60">
                <span className="font-semibold">{heading}.</span>{' '}
                {onRecharge && (
                  <button
                    type="button"
                    onClick={() => onRecharge(a)}
                    title="Roll the recharge die"
                    className="rounded border border-slate-300 px-1.5 py-0.5 align-middle text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Roll recharge
                  </button>
                )}{' '}
                {a.text ? <Markdown inline>{a.text}</Markdown> : null}
              </p>
            )
          }
          return (
            <Markdown key={a.id}>{`**${heading}.** ${a.text ?? ''}`}</Markdown>
          )
        })}
      </div>
    </div>
  )
}

export function CreatureStatBlock({
  creature,
  hp,
  concentration,
  label,
  onRename,
  onHpInput,
  onTempInput,
  onAction,
  rechargeState,
  onRecharge,
  onCheck,
}: {
  creature: Creature
  /** Live hit points when shown in combat; absent in the reference compendium. */
  hp?: HitPoints
  /** Live concentration, when in combat — drives the "C" badge. */
  concentration?: Concentration | null
  /** The combatant's display name (shown in the tracker); defaults to the creature name. */
  label?: string
  /** Rename the combatant's tracker label. */
  onRename?: (label: string) => void
  /** Edit current HP from a raw input ("12", "+5", "-3"). */
  onHpInput?: (raw: string) => void
  /** Edit temp HP from a raw input. */
  onTempInput?: (raw: string) => void
  /** Resolve an action (roll to-hit / save and apply damage). Combat only. */
  onAction?: (action: Action) => void
  /** id → charged? Spent recharge abilities render disabled with a recharge button. */
  rechargeState?: Record<string, boolean>
  /** Roll the recharge die for a spent ability. */
  onRecharge?: (action: Action) => void
  /** Roll an ability check / save / skill (d20 + modifier). Combat only. */
  onCheck?: OnCheck
}) {
  const displayName = label ?? creature.name
  const legendaryTitle = creature.legendaryActions
    ? `Legendary Actions (${creature.legendaryActions.perRound}/round)`
    : 'Legendary Actions'

  const current = hp ? hp.current : creature.maxHp
  const max = hp ? hp.max : creature.maxHp
  const hpTone = hp ? hpToneFor(hpTierOf(hp.current, hp.max)) : 'text-slate-900 dark:text-slate-100'
  const hpValue = (
    <span>
      <span className={hpTone}>{current}</span>
      <span className="text-slate-400 dark:text-slate-500">/{max}</span>
    </span>
  )
  const tmpValue =
    hp && hp.temp > 0 ? (
      <span className="text-sky-600 dark:text-sky-400">{hp.temp}</span>
    ) : (
      <span className="text-slate-400 dark:text-slate-500">—</span>
    )
  const speeds = speedLines(creature.speed)

  return (
    <div className="@container flex flex-1 flex-col space-y-4">
      <StatHeader
        name={displayName}
        onRename={onRename}
        originalName={label && label !== creature.name ? creature.name : undefined}
        subtitle={
          <>
            {creature.size} {creature.type} · CR {formatCr(creature.cr)}
            {creature.xp != null ? ` (${creature.xp.toLocaleString('en-US')} XP)` : ''}
          </>
        }
        legendary={creature.legendaryActions != null}
        concentration={concentration}
        speeds={speeds}
        stats={
          <>
            <HeaderStat label="AC" value={creature.ac} />
            <HeaderStat
              label={creature.hpFormula ? `HP (${creature.hpFormula})` : 'HP'}
              value={hpValue}
              edit={onHpInput ? { initial: '', onCommit: onHpInput, title: 'Set HP, or +N / −N' } : undefined}
            />
            <HeaderStat
              label="TMP"
              value={tmpValue}
              edit={onTempInput ? { initial: '', onCommit: onTempInput, title: 'Set temp HP, or +N / −N' } : undefined}
            />
            {creature.initiative != null && (
              <HeaderStat label="Init" value={signed(creature.initiative)} />
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="min-w-[20rem] flex-1">
          <AbilityScores creature={creature} onCheck={onCheck} />
        </div>
        {creature.skills && (
          <div className="min-w-[12rem] flex-1">
            <SkillsTable skills={creature.skills} onCheck={onCheck} />
          </div>
        )}
      </div>

      <DefensesAndSenses
        resistances={creature.resistances?.join(', ')}
        immunities={[
          ...(creature.immunities ?? []),
          ...(creature.conditionImmunities ?? []),
        ].join(', ')}
        vulnerabilities={creature.vulnerabilities?.join(', ')}
        senses={formatSenses(creature.senses)}
        languages={creature.languages?.join(', ')}
      />

      <Section title="Traits" items={creature.traits} />
      <ActionSection title="Actions" actions={creature.actions} onAction={onAction} rechargeState={rechargeState} onRecharge={onRecharge} />
      <ActionSection title="Bonus Actions" actions={creature.bonusActions} onAction={onAction} rechargeState={rechargeState} onRecharge={onRecharge} />
      <ActionSection title="Reactions" actions={creature.reactions} onAction={onAction} rechargeState={rechargeState} onRecharge={onRecharge} />
      <ActionSection title={legendaryTitle} actions={creature.legendaryActions?.actions} onAction={onAction} rechargeState={rechargeState} onRecharge={onRecharge} />
      <ActionSection title="Lair Actions" actions={creature.lairActions} onAction={onAction} rechargeState={rechargeState} onRecharge={onRecharge} />

      <SourceLink source={creature.source} />
    </div>
  )
}
