// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState, type CSSProperties } from 'react'
import type { Ability, Senses, SkillBonuses } from '../schema/primitives.ts'
import { speedLines } from '../combat/speed.ts'
import type { Action, Recharge } from '../schema/action.ts'
import type { Creature, SpellGroup, Spellcasting, SpellRef } from '../schema/creature.ts'
import type { Concentration, HitPoints } from '../schema/combatant.ts'
import type { Spell } from '../schema/spell.ts'
import { hpTierOf } from '../combat/resources.ts'
import { formatCr } from '../compendium/format.ts'
import { hpToneFor } from './hpTone.ts'
import { Markdown } from './Markdown.tsx'
import { SourceLink } from './SourceLink.tsx'
import { SpellCard } from './SpellCard.tsx'
import { FLOATING_CARD, floatingCardStyle } from './spellPreview.ts'
import { HeaderStat, StatHeader } from './StatHeader.tsx'

/** Resolve a spell's compendium entry (for the hover preview + cast card). */
export type ResolveSpell = (ref?: string) => Spell | undefined
/** Uses left for a spell on the live combatant: null when unlimited (at-will). */
export type SpellUsesOf = (spell: SpellRef) => number | null

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

function Section({
  title,
  items,
  resolveSpell,
}: {
  title: string
  items?: Entry[]
  resolveSpell?: ResolveSpell
}) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <h4 className="mb-2 border-b border-slate-200 pb-1 text-base font-semibold tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-300">
        {title}
      </h4>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {items.map((entry) => (
          <Markdown key={entry.name} resolveSpell={resolveSpell}>
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
  resolveSpell,
  clickAll,
  legendaryRemaining,
}: {
  title: string
  actions?: Action[]
  onAction?: (a: Action) => void
  /** id → charged? A rechargeable action that is `false` can't be used until it recharges. */
  rechargeState?: Record<string, boolean>
  onRecharge?: (a: Action) => void
  resolveSpell?: ResolveSpell
  /** Make every action clickable (not just rollable ones) — used for legendary
   *  actions, where clicking spends one regardless of attack/save. */
  clickAll?: boolean
  /** Legendary actions left — disables actions that cost more than this. */
  legendaryRemaining?: number
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
          // Legendary actions: every entry is clickable (clicking spends its cost).
          if (onAction && clickAll) {
            const cost = a.legendaryCost ?? 1
            const cantAfford = legendaryRemaining != null && legendaryRemaining < cost
            const legendaryHeading = `${a.name}${cost > 1 ? ` (Costs ${cost})` : ''}`
            return (
              <p key={a.id} className={cantAfford ? 'opacity-50' : undefined}>
                <button
                  type="button"
                  onClick={() => onAction(a)}
                  disabled={cantAfford}
                  title={cost > 1 ? `Use this action (spends ${cost})` : 'Use this action (spends one)'}
                  className="font-semibold text-indigo-600 hover:underline disabled:no-underline disabled:hover:no-underline dark:text-indigo-400"
                >
                  {legendaryHeading}.
                </button>{' '}
                {a.text ? <Markdown inline resolveSpell={resolveSpell}>{a.text}</Markdown> : null}
              </p>
            )
          }
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
                {a.text ? <Markdown inline resolveSpell={resolveSpell}>{a.text}</Markdown> : null}
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
                {a.text ? <Markdown inline resolveSpell={resolveSpell}>{a.text}</Markdown> : null}
              </p>
            )
          }
          return (
            <Markdown key={a.id} resolveSpell={resolveSpell}>{`**${heading}.** ${a.text ?? ''}`}</Markdown>
          )
        })}
      </div>
    </div>
  )
}

function usageLabel(group: SpellGroup): string {
  if (group.usage.type === 'atWill') return 'At Will'
  return `${group.usage.per}/Day Each`
}

function spellcastingHeader(sc: Spellcasting): string {
  const bits: string[] = []
  if (sc.ability) bits.push(`${sc.ability.toUpperCase()} as the spellcasting ability`)
  if (sc.saveDc != null) bits.push(`spell save DC ${sc.saveDc}`)
  if (sc.toHit != null) bits.push(`${signed(sc.toHit)} to hit with spell attacks`)
  return bits.length ? `Casts using ${bits.join(', ')}.` : 'Casts the following spells.'
}

/**
 * A monster's spellcasting, grouped by usage. Each spell is a button that opens
 * the cast modal; hovering it (desktop) previews the spell card. Per-day spells
 * show their remaining uses and grey out when spent. In the reference compendium
 * (no `onCast`) the spells render as plain text.
 */
function SpellcastingSection({
  spellcasting,
  onCast,
  usesOf,
  resolveSpell,
}: {
  spellcasting: Spellcasting
  onCast?: (spell: SpellRef) => void
  usesOf?: SpellUsesOf
  resolveSpell?: ResolveSpell
}) {
  // The hover preview is anchored with a fixed, viewport-clamped position so it
  // isn't clipped by the scrolling stat-block column. Touch devices don't fire
  // hover, so they simply tap to open the cast modal (which shows the same card).
  const [preview, setPreview] = useState<{ spell: Spell; style: CSSProperties } | null>(null)

  const showPreview = (spell: SpellRef, el: HTMLElement) => {
    const found = resolveSpell?.(spell.ref)
    if (!found) return
    setPreview({ spell: found, style: floatingCardStyle(el.getBoundingClientRect()) })
  }

  return (
    <div>
      <h4 className={SECTION_HEADING}>Spellcasting</h4>
      <p className="mb-2 text-sm italic text-slate-500 dark:text-slate-400">
        {spellcastingHeader(spellcasting)}
      </p>
      <div className="space-y-2">
        {spellcasting.groups.map((group, i) => (
          <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {usageLabel(group)}
            </span>
            {group.spells.map((spell) => {
              const remaining = usesOf?.(spell) ?? null
              const drained = remaining === 0
              const label = remaining == null ? spell.name : `${spell.name} (${remaining})`
              if (!onCast) {
                return (
                  <span key={spell.ref ?? spell.name} className="text-slate-600 dark:text-slate-300">
                    {label}
                  </span>
                )
              }
              return (
                <button
                  key={spell.ref ?? spell.name}
                  type="button"
                  onClick={() => onCast(spell)}
                  onMouseEnter={(e) => showPreview(spell, e.currentTarget)}
                  onMouseLeave={() => setPreview(null)}
                  title={`Cast ${spell.name}`}
                  className={
                    drained
                      ? 'text-slate-400 line-through hover:no-underline dark:text-slate-600'
                      : 'font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                  }
                >
                  {label}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      {preview && (
        <div className={FLOATING_CARD} style={preview.style}>
          <SpellCard spell={preview.spell} />
        </div>
      )}
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
  onCastSpell,
  spellUsesOf,
  resolveSpell,
  onLegendaryAction,
  legendaryRemaining,
  legendaryResistance,
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
  /** Cast a spell from the spellcasting block. Combat only. */
  onCastSpell?: (spell: SpellRef) => void
  /** Uses left for a spell on the live combatant (null = unlimited). Combat only. */
  spellUsesOf?: SpellUsesOf
  /** Resolve a spell's compendium entry for the hover preview / cast card. */
  resolveSpell?: ResolveSpell
  /** Use a legendary action (spends one, then resolves it if it's rollable). Combat only. */
  onLegendaryAction?: (action: Action) => void
  /** Legendary actions left this round, when in combat. */
  legendaryRemaining?: number
  /** Legendary Resistance, shown as its own section when in combat. */
  legendaryResistance?: {
    left: number
    inLair: boolean
    onUse: () => void
    onToggleLair: (inLair: boolean) => void
  }
}) {
  const displayName = label ?? creature.name
  // Legendary Resistance renders as its own interactive section in combat; pull its
  // trait out of the plain Traits list so it isn't shown twice.
  const lrTrait = creature.traits?.find((t) => /^Legendary Resistance/i.test(t.name))
  const showLrSection = legendaryResistance != null && lrTrait != null
  const traits = showLrSection ? creature.traits?.filter((t) => t !== lrTrait) : creature.traits
  const perRound = creature.legendaryActions?.perRound
  const legendaryTitle = !creature.legendaryActions
    ? 'Legendary Actions'
    : legendaryRemaining != null
      ? `Legendary Actions (${legendaryRemaining} of ${perRound} left)`
      : `Legendary Actions (${perRound}/round)`

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

      {showLrSection && legendaryResistance && lrTrait && (
        <div>
          <h4 className={`${SECTION_HEADING} flex items-center justify-between gap-2`}>
            <span>Legendary Resistance ({legendaryResistance.left} left)</span>
            {creature.legendaryResistanceLair != null && (
              <label className="flex items-center gap-1 text-xs font-normal normal-case tracking-normal text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={legendaryResistance.inLair}
                  onChange={(e) => legendaryResistance.onToggleLair(e.target.checked)}
                />
                In lair
              </label>
            )}
          </h4>
          <button
            type="button"
            onClick={legendaryResistance.onUse}
            disabled={legendaryResistance.left <= 0}
            title="Use Legendary Resistance (spends one)"
            className="w-full rounded px-1 py-0.5 text-left text-sm leading-relaxed text-slate-600 hover:bg-amber-50 disabled:cursor-default disabled:opacity-60 dark:text-slate-300 dark:hover:bg-amber-950/30"
          >
            {lrTrait.text}
          </button>
        </div>
      )}
      <Section title="Traits" items={traits} resolveSpell={resolveSpell} />
      {creature.spellcasting && (
        <SpellcastingSection
          spellcasting={creature.spellcasting}
          onCast={onCastSpell}
          usesOf={spellUsesOf}
          resolveSpell={resolveSpell}
        />
      )}
      <ActionSection title="Actions" actions={creature.actions} onAction={onAction} rechargeState={rechargeState} onRecharge={onRecharge} resolveSpell={resolveSpell} />
      <ActionSection title="Bonus Actions" actions={creature.bonusActions} onAction={onAction} rechargeState={rechargeState} onRecharge={onRecharge} resolveSpell={resolveSpell} />
      <ActionSection title="Reactions" actions={creature.reactions} onAction={onAction} rechargeState={rechargeState} onRecharge={onRecharge} resolveSpell={resolveSpell} />
      <ActionSection
        title={legendaryTitle}
        actions={creature.legendaryActions?.actions}
        onAction={onLegendaryAction ?? onAction}
        clickAll={onLegendaryAction != null}
        legendaryRemaining={legendaryRemaining}
        rechargeState={rechargeState}
        onRecharge={onRecharge}
        resolveSpell={resolveSpell}
      />
      <ActionSection title="Lair Actions" actions={creature.lairActions} onAction={onAction} rechargeState={rechargeState} onRecharge={onRecharge} resolveSpell={resolveSpell} />

      <SourceLink source={creature.source} />
    </div>
  )
}
