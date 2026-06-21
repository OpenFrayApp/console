// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState, type ReactNode } from 'react'
import type { Creature } from '../schema/creature.ts'
import type { ActionKind } from '../schema/action.ts'
import { ActionEditor, FIELD, LABEL } from './ActionEditor.tsx'
import {
  ABILITIES,
  ALIGNMENTS,
  CREATURE_TYPES,
  SIZES,
  SKILLS,
  buildCreature,
  emptyActionDraft,
  emptyDraft,
  emptySkillDraft,
  emptySpellGroupDraft,
  emptyTraitDraft,
  type ActionDraft,
  type MonsterDraft,
} from './customMonster.ts'

/** A collapsible group of fields. Core sections start open; advanced ones closed. */
function Section({
  title,
  children,
  open = false,
}: {
  title: string
  children: ReactNode
  open?: boolean
}) {
  return (
    <details open={open} className="rounded-md border border-slate-200 dark:border-slate-800">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold">
        {title}
      </summary>
      <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-800">{children}</div>
    </details>
  )
}

function ActionList({
  label,
  items,
  onChange,
  defaultKind = 'melee',
  showLegendaryCost = false,
}: {
  label: string
  items: ActionDraft[]
  onChange: (next: ActionDraft[]) => void
  defaultKind?: ActionKind
  showLegendaryCost?: boolean
}) {
  return (
    <div className="space-y-2">
      {items.map((a) => (
        <ActionEditor
          key={a.id}
          action={a}
          label={label}
          showLegendaryCost={showLegendaryCost}
          onChange={(next) => onChange(items.map((x) => (x.id === a.id ? next : x)))}
          onRemove={() => onChange(items.filter((x) => x.id !== a.id))}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, emptyActionDraft(defaultKind)])}
        className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
      >
        + Add {label}
      </button>
    </div>
  )
}

/**
 * Create a custom (homebrew / SRD-excluded) monster — a full stat-block editor
 * over the Creature schema. The result is `source:'custom'` with a fresh id and
 * flows into the encounter like any picked creature. Every custom creature is an
 * independent entity; nothing here is matched or deduped against existing content.
 */
export function CustomMonsterForm({ onCreate }: { onCreate: (creature: Creature) => void }) {
  const [open, setOpen] = useState(false)
  const [d, setD] = useState<MonsterDraft>(emptyDraft)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const patch = (p: Partial<MonsterDraft>) => setD((prev) => ({ ...prev, ...p }))

  const submit = () => {
    if (!d.name.trim()) return
    onCreate(buildCreature(d))
    setD(emptyDraft())
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Custom monster
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Create custom monster"
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-lg font-semibold">Custom monster</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-auto p-4">
              <Section title="Identity" open>
                <input
                  autoFocus
                  value={d.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Name"
                  aria-label="Monster name"
                  className={FIELD}
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <select value={d.size} onChange={(e) => patch({ size: e.target.value as MonsterDraft['size'] })} aria-label="Size" className={FIELD}>
                    {SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select value={d.type} onChange={(e) => patch({ type: e.target.value })} aria-label="Type" className={FIELD}>
                    {CREATURE_TYPES.map((t) => (
                      <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                  <select value={d.alignment} onChange={(e) => patch({ alignment: e.target.value })} aria-label="Alignment" className={FIELD}>
                    <option value="">Alignment…</option>
                    {ALIGNMENTS.map((a) => (
                      <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <select value={d.edition} onChange={(e) => patch({ edition: e.target.value as MonsterDraft['edition'] })} aria-label="Edition" className={FIELD}>
                    <option value="5.5">5.5</option>
                    <option value="5.0">5.0</option>
                  </select>
                  <input value={d.cr} onChange={(e) => patch({ cr: e.target.value })} placeholder="CR (e.g. 1/2, 6)" aria-label="Challenge rating" inputMode="text" className={FIELD} />
                  <input value={d.sourceName} onChange={(e) => patch({ sourceName: e.target.value })} placeholder="Source (Homebrew, book…)" aria-label="Source" className={FIELD} />
                </div>
              </Section>

              <Section title="Defense & HP" open>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input value={d.ac} onChange={(e) => patch({ ac: e.target.value })} placeholder="AC" aria-label="AC" inputMode="numeric" className={FIELD} />
                  <input value={d.hp} onChange={(e) => patch({ hp: e.target.value })} placeholder="Avg HP" aria-label="Avg HP" inputMode="numeric" className={FIELD} />
                  <input value={d.hpFormula} onChange={(e) => patch({ hpFormula: e.target.value })} placeholder="HP formula (8d10+16)" aria-label="HP formula" className={`${FIELD} col-span-2`} />
                </div>
              </Section>

              <Section title="Speed" open>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {(['walk', 'fly', 'swim', 'climb', 'burrow'] as const).map((k) => (
                    <input
                      key={k}
                      value={d.speed[k]}
                      onChange={(e) => patch({ speed: { ...d.speed, [k]: e.target.value } })}
                      placeholder={k}
                      aria-label={`${k} speed`}
                      inputMode="numeric"
                      className={FIELD}
                    />
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.speed.hover} onChange={(e) => patch({ speed: { ...d.speed, hover: e.target.checked } })} />
                  Can hover
                </label>
              </Section>

              <Section title="Abilities & saves" open>
                <div className="grid grid-cols-6 gap-2">
                  {ABILITIES.map((a) => (
                    <div key={a} className="space-y-1">
                      <p className={`${LABEL} text-center`}>{a}</p>
                      <input value={d.abilities[a]} onChange={(e) => patch({ abilities: { ...d.abilities, [a]: e.target.value } })} aria-label={`${a} score`} inputMode="numeric" className={`${FIELD} text-center`} />
                      <label className="flex items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <input type="checkbox" checked={d.saves[a]} onChange={(e) => patch({ saves: { ...d.saves, [a]: e.target.checked } })} aria-label={`${a} save proficient`} />
                        save
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter each ability score; tick “save” where the creature is proficient — the
                  save bonus is derived from the modifier + proficiency bonus (set the CR above).
                </p>
              </Section>

              <Section title="Skills, senses & languages">
                <div className="space-y-1">
                  <p className={LABEL}>Skills (proficient)</p>
                  {d.skills.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <select value={s.skill} onChange={(e) => patch({ skills: d.skills.map((x) => (x.id === s.id ? { ...x, skill: e.target.value as typeof x.skill } : x)) })} aria-label="Skill" className={FIELD}>
                        {SKILLS.map((sk) => (
                          <option key={sk} value={sk}>{sk}</option>
                        ))}
                      </select>
                      <input value={s.bonus} onChange={(e) => patch({ skills: d.skills.map((x) => (x.id === s.id ? { ...x, bonus: e.target.value } : x)) })} placeholder="bonus +" aria-label="Skill bonus" inputMode="numeric" className={`${FIELD} w-24`} />
                      <button type="button" onClick={() => patch({ skills: d.skills.filter((x) => x.id !== s.id) })} aria-label="Remove skill" className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => patch({ skills: [...d.skills, emptySkillDraft()] })} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">+ Add skill</button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <input value={d.senses.passivePerception} onChange={(e) => patch({ senses: { ...d.senses, passivePerception: e.target.value } })} placeholder="Passive Perc." aria-label="Passive Perception" inputMode="numeric" className={FIELD} />
                  <input value={d.senses.darkvision} onChange={(e) => patch({ senses: { ...d.senses, darkvision: e.target.value } })} placeholder="Darkvision" aria-label="Darkvision" inputMode="numeric" className={FIELD} />
                  <input value={d.senses.blindsight} onChange={(e) => patch({ senses: { ...d.senses, blindsight: e.target.value } })} placeholder="Blindsight" aria-label="Blindsight" inputMode="numeric" className={FIELD} />
                  <input value={d.senses.tremorsense} onChange={(e) => patch({ senses: { ...d.senses, tremorsense: e.target.value } })} placeholder="Tremorsense" aria-label="Tremorsense" inputMode="numeric" className={FIELD} />
                  <input value={d.senses.truesight} onChange={(e) => patch({ senses: { ...d.senses, truesight: e.target.value } })} placeholder="Truesight" aria-label="Truesight" inputMode="numeric" className={FIELD} />
                </div>
                <input value={d.languages} onChange={(e) => patch({ languages: e.target.value })} placeholder="Languages (comma-separated)" aria-label="Languages" className={FIELD} />
              </Section>

              <Section title="Defenses">
                <input value={d.resistances} onChange={(e) => patch({ resistances: e.target.value })} placeholder="Resistances (comma-separated)" aria-label="Resistances" className={FIELD} />
                <input value={d.immunities} onChange={(e) => patch({ immunities: e.target.value })} placeholder="Immunities" aria-label="Immunities" className={FIELD} />
                <input value={d.vulnerabilities} onChange={(e) => patch({ vulnerabilities: e.target.value })} placeholder="Vulnerabilities" aria-label="Vulnerabilities" className={FIELD} />
                <input value={d.conditionImmunities} onChange={(e) => patch({ conditionImmunities: e.target.value })} placeholder="Condition immunities" aria-label="Condition immunities" className={FIELD} />
              </Section>

              <Section title="Traits">
                <div className="space-y-2">
                  {d.traits.map((t) => (
                    <div key={t.id} className="space-y-1 rounded-md border border-slate-200 p-2 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <input value={t.name} onChange={(e) => patch({ traits: d.traits.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)) })} placeholder="Trait name" aria-label="Trait name" className={FIELD} />
                        <button type="button" onClick={() => patch({ traits: d.traits.filter((x) => x.id !== t.id) })} aria-label="Remove trait" className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Remove</button>
                      </div>
                      <textarea value={t.text} onChange={(e) => patch({ traits: d.traits.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)) })} placeholder="Trait text" aria-label="Trait text" rows={2} className={FIELD} />
                    </div>
                  ))}
                  <button type="button" onClick={() => patch({ traits: [...d.traits, emptyTraitDraft()] })} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">+ Add trait</button>
                </div>
              </Section>

              <Section title="Actions">
                <ActionList label="action" items={d.actions} onChange={(actions) => patch({ actions })} />
              </Section>

              <Section title="Bonus actions">
                <ActionList label="bonus action" items={d.bonusActions} onChange={(bonusActions) => patch({ bonusActions })} />
              </Section>

              <Section title="Reactions">
                <ActionList label="reaction" items={d.reactions} onChange={(reactions) => patch({ reactions })} />
              </Section>

              <Section title="Legendary & lair">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm" htmlFor="legendary-per-round">Legendary actions per round</label>
                    <input id="legendary-per-round" value={d.legendaryPerRound} onChange={(e) => patch({ legendaryPerRound: e.target.value })} aria-label="Legendary actions per round" inputMode="numeric" className={`${FIELD} w-20`} />
                  </div>
                  <ActionList label="legendary action" items={d.legendaryActions} onChange={(legendaryActions) => patch({ legendaryActions })} showLegendaryCost />
                </div>
                <div className="space-y-1">
                  <p className={LABEL}>Lair actions (initiative count 20)</p>
                  <ActionList label="lair action" items={d.lairActions} onChange={(lairActions) => patch({ lairActions })} defaultKind="utility" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={d.legendaryResistance} onChange={(e) => patch({ legendaryResistance: e.target.value })} placeholder="Legendary Resistance / day" aria-label="Legendary Resistance per day" inputMode="numeric" className={FIELD} />
                  <input value={d.legendaryResistanceLair} onChange={(e) => patch({ legendaryResistanceLair: e.target.value })} placeholder="…in lair" aria-label="Legendary Resistance in lair" inputMode="numeric" className={FIELD} />
                </div>
              </Section>

              <Section title="Spellcasting">
                <div className="grid grid-cols-3 gap-2">
                  <select value={d.spellAbility} onChange={(e) => patch({ spellAbility: e.target.value as MonsterDraft['spellAbility'] })} aria-label="Spellcasting ability" className={FIELD}>
                    <option value="">Ability…</option>
                    {ABILITIES.map((a) => (
                      <option key={a} value={a}>{a.toUpperCase()}</option>
                    ))}
                  </select>
                  <input value={d.spellSaveDc} onChange={(e) => patch({ spellSaveDc: e.target.value })} placeholder="Save DC" aria-label="Spell save DC" inputMode="numeric" className={FIELD} />
                  <input value={d.spellToHit} onChange={(e) => patch({ spellToHit: e.target.value })} placeholder="Spell atk +" aria-label="Spell attack bonus" inputMode="numeric" className={FIELD} />
                </div>
                <div className="space-y-2">
                  {d.spellGroups.map((g) => (
                    <div key={g.id} className="space-y-1 rounded-md border border-slate-200 p-2 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <select value={g.usage} onChange={(e) => patch({ spellGroups: d.spellGroups.map((x) => (x.id === g.id ? { ...x, usage: e.target.value as typeof x.usage } : x)) })} aria-label="Spell usage" className={`${FIELD} w-32`}>
                          <option value="atWill">At will</option>
                          <option value="perDay">N/day each</option>
                        </select>
                        {g.usage === 'perDay' && (
                          <input value={g.per} onChange={(e) => patch({ spellGroups: d.spellGroups.map((x) => (x.id === g.id ? { ...x, per: e.target.value } : x)) })} placeholder="N" aria-label="Uses per day" inputMode="numeric" className={`${FIELD} w-16`} />
                        )}
                        <button type="button" onClick={() => patch({ spellGroups: d.spellGroups.filter((x) => x.id !== g.id) })} aria-label="Remove spell group" className="ml-auto shrink-0 rounded border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Remove</button>
                      </div>
                      <input value={g.spells} onChange={(e) => patch({ spellGroups: d.spellGroups.map((x) => (x.id === g.id ? { ...x, spells: e.target.value } : x)) })} placeholder="Spells (comma-separated)" aria-label="Spells" className={FIELD} />
                    </div>
                  ))}
                  <button type="button" onClick={() => patch({ spellGroups: [...d.spellGroups, emptySpellGroupDraft()] })} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">+ Add spell group</button>
                </div>
              </Section>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!d.name.trim()}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                Create & add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
