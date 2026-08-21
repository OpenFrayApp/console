// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/**
 * The stat block's shared parts — the headings and tables that creatures, PCs, and
 * the library cards all draw with — so a card never imports its table from a
 * 950-line component.
 */

import {
  abilityMod,
  SKILL_ABILITY,
  type Ability,
  type AbilityScores as AbilityScoreMap,
  type SaveBonuses,
  type Skill,
  type SkillBonuses,
} from '../../schema/primitives.ts'
import { ABILITY_LABEL, capitalizeSegments, signed } from '../../compendium/format.ts'
import { Markdown, type ResolveSpell } from './Markdown.tsx'

/** The one h4 style every stat-block section heading wears. */
export const SECTION_HEADING =
  'mb-2 border-b border-slate-200 pb-1 text-base font-semibold tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-300'

// Heading is the heavier style, row label the lighter — swapped from the usual weight.
const TABLE_HEADING = 'font-semibold uppercase text-slate-500 dark:text-slate-400'
const TABLE_ROW_LABEL =
  'text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500'

/** A camelCase skill key as its label: "sleightOfHand" → "Sleight Of Hand". */
function skillLabel(skill: string): string {
  return skill.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
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
  gear,
}: {
  resistances?: string
  immunities?: string
  vulnerabilities?: string
  senses?: string
  languages?: string
  gear?: string
}) {
  /** A [label, value] row if the value is non-empty; empty values contribute no row. */
  const present = (label: string, value?: string): [string, string][] =>
    value && value.length ? [[label, value]] : []
  // Capitalize defenses/languages at render so lowercased source data (e.g. ToB3)
  // shows correctly everywhere — never fixed in the JSON. Senses/gear are already formatted.
  const defenseRows: [string, string][] = [
    ...present('Resistances', capitalizeSegments(resistances)),
    ...present('Immunities', capitalizeSegments(immunities)),
    ...present('Vulnerabilities', capitalizeSegments(vulnerabilities)),
  ]
  const senseRows: [string, string][] = [
    ...present('Senses', senses),
    ...present('Languages', capitalizeSegments(languages)),
    ...present('Gear', gear),
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

const ABILITY_GROUPS: Ability[][] = [
  ['str', 'dex', 'con'],
  ['int', 'wis', 'cha'],
]

/** Roll a d20 + this modifier when `onCheck` is supplied (i.e. in combat). */
export type OnCheck = (
  label: string,
  modifier: number,
  kind: 'save' | 'check',
  ability?: Ability,
) => void

/** The value as a button rolling d20 + modifier when `onCheck` is set; plain text otherwise. */
function RollableValue({
  label,
  modifier,
  kind,
  ability,
  onCheck,
  children,
}: {
  label: string
  modifier: number
  kind: 'save' | 'check'
  ability?: Ability
  onCheck?: OnCheck
  children: string
}) {
  if (!onCheck) return <>{children}</>
  return (
    <button
      type="button"
      onClick={() => onCheck(label, modifier, kind, ability)}
      title={`Roll ${label}`}
      // A stat-block number is a roll button, drawn as text at 17x20. The width is the
      // table's to give, so only the height opens up on a coarse pointer.
      className="tap-y inline-flex items-center justify-end text-indigo-600 hover:underline coarse:px-1 dark:text-indigo-400"
    >
      {children}
    </button>
  )
}

/**
 * The ability block as two side-by-side tables that fill the available width.
 * Shared by creatures and PCs so they look identical. Pass `saves` to show a Save
 * column (creatures, with a fallback to the ability mod); omit it to show just the
 * Mod column (PCs, where we only know raw scores). `onCheck` makes the values
 * rollable (combat); without it they're plain text.
 */
export function AbilityTable({
  abilities,
  saves,
  onCheck,
}: {
  abilities: AbilityScoreMap
  saves?: SaveBonuses
  onCheck?: OnCheck
}) {
  const showSaves = saves !== undefined
  /** The save bonus for an ability, falling back to the bare ability modifier. */
  const saveFor = (a: Ability): number => saves?.[a] ?? abilityMod(abilities[a])
  return (
    <div className="flex gap-3 text-sm">
      {ABILITY_GROUPS.map((group, i) => (
        <table key={i} className="flex-1">
          <thead>
            <tr className={TABLE_HEADING}>
              <th />
              <th />
              <th className="px-1 text-right">Mod</th>
              {showSaves && <th className="px-1 text-right">Save</th>}
            </tr>
          </thead>
          <tbody>
            {group.map((a) => (
              <tr key={a} className="odd:bg-slate-100 dark:odd:bg-slate-800/40">
                <td className={`rounded-l px-2 py-1 ${TABLE_ROW_LABEL}`}>{ABILITY_LABEL[a]}</td>
                <td className="px-1 py-1 text-right tabular-nums">{abilities[a]}</td>
                <td
                  className={`px-1 py-1 text-right tabular-nums ${showSaves ? '' : 'rounded-r pr-2'}`}
                >
                  <RollableValue
                    label={`${a.toUpperCase()} check`}
                    modifier={abilityMod(abilities[a])}
                    kind="check"
                    ability={a}
                    onCheck={onCheck}
                  >
                    {signed(abilityMod(abilities[a]))}
                  </RollableValue>
                </td>
                {showSaves && (
                  <td className="rounded-r px-2 py-1 text-right tabular-nums">
                    <RollableValue
                      label={`${a.toUpperCase()} save`}
                      modifier={saveFor(a)}
                      kind="save"
                      ability={a}
                      onCheck={onCheck}
                    >
                      {signed(saveFor(a))}
                    </RollableValue>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  )
}

/** The Skills table, one rollable bonus per skill; renders nothing when there are none. */
export function SkillsTable({ skills, onCheck }: { skills: SkillBonuses; onCheck?: OnCheck }) {
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
            <td className={`rounded-l px-2 py-1 ${TABLE_ROW_LABEL}`}>{skillLabel(skill)}</td>
            <td className="rounded-r px-2 py-1 text-right tabular-nums">
              <RollableValue
                label={skillLabel(skill)}
                modifier={bonus as number}
                kind="check"
                ability={SKILL_ABILITY[skill as Skill]}
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

interface Entry {
  name: string
  text?: string
  /** Suffix after the name, e.g. "Recharge 5–6". */
  note?: string
}

/** A titled run of "**Name.** text" entries rendered as markdown; hidden when empty. */
export function Section({
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
      <h4 className={SECTION_HEADING}>{title}</h4>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-400 [&_strong]:text-slate-900 dark:[&_strong]:text-slate-200">
        {items.map((entry) => (
          <Markdown key={entry.name} linkConditions resolveSpell={resolveSpell}>
            {`**${entry.name}${entry.note ? ` (${entry.note})` : ''}.** ${entry.text ?? ''}`}
          </Markdown>
        ))}
      </div>
    </div>
  )
}
