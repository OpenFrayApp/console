// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Spell } from '../schema/spell.ts'
import { FIELD, FIELD_W, LABEL } from './ActionEditor.tsx'
import { FormSection as Section } from './FormSection.tsx'
import { ABILITIES, DAMAGE_TYPES } from './customMonster.ts'
import {
  SPELL_LEVELS,
  SPELL_SCHOOLS,
  CANTRIP_TIERS,
  buildSpell,
  emptySpellDamageDraft,
  emptyScalingRowDraft,
  spellVariantPreview,
  type SpellDamageDraft,
  type SpellDraft,
} from './customSpell.ts'

/** A stacked formula + damage-type editor, reused for base damage, the per-level
 *  increment, and each manual scaling row. Allows zero rows (a non-damaging spell). */
function DamageRows({
  rows,
  onChange,
  addLabel = 'Add damage type',
}: {
  rows: SpellDamageDraft[]
  onChange: (next: SpellDamageDraft[]) => void
  addLabel?: string
}) {
  return (
    <div className="space-y-1">
      {rows.map((d) => (
        <div key={d.id} className="flex items-center gap-2">
          <input
            value={d.formula}
            onChange={(e) => onChange(rows.map((x) => (x.id === d.id ? { ...x, formula: e.target.value } : x)))}
            placeholder="8d6"
            aria-label="Damage formula"
            className={`${FIELD_W} w-28 shrink-0`}
          />
          <select
            value={d.type}
            onChange={(e) => onChange(rows.map((x) => (x.id === d.id ? { ...x, type: e.target.value as typeof x.type } : x)))}
            aria-label="Damage type"
            className={`${FIELD_W} min-w-0 flex-1`}
          >
            {DAMAGE_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
          <button
            type="button"
            onClick={() => onChange(rows.filter((x) => x.id !== d.id))}
            aria-label="Remove damage"
            className="shrink-0 rounded border border-slate-300 px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, emptySpellDamageDraft()])}
        className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
      >
        + {addLabel}
      </button>
    </div>
  )
}

/**
 * The custom-spell editor — a controlled modal over the Spell schema, opened for
 * "create" (an empty draft) or "edit" (a spell's draft + its id, so the rebuilt
 * spell keeps that id). The save DC is never collected (the caster owns it). Higher
 * levels are entered as a per-level increment that expands into damage variants, or
 * level-by-level for irregular spells.
 */
export function CustomSpellForm({
  open,
  initialDraft,
  editId = null,
  onClose,
  onSubmit,
}: {
  open: boolean
  initialDraft: SpellDraft
  editId?: string | null
  onClose: () => void
  onSubmit: (spell: Spell) => void
}) {
  const [d, setD] = useState<SpellDraft>(initialDraft)

  useEffect(() => {
    if (open) setD(initialDraft)
  }, [open, initialDraft])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const patch = (p: Partial<SpellDraft>) => setD((prev) => ({ ...prev, ...p }))

  const level = Number(d.level)
  const isCantrip = level === 0
  const hasBaseDamage = d.damage.some((r) => r.formula.trim() !== '')
  const preview = spellVariantPreview(d)
  const manualLevels = isCantrip ? [...CANTRIP_TIERS] : Array.from({ length: 9 - level }, (_, i) => level + 1 + i)

  const submit = () => {
    if (!d.name.trim()) return
    const spell = buildSpell(d)
    onSubmit(editId ? { ...spell, id: editId } : spell)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={editId ? 'Edit spell' : 'Create custom spell'}
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-xl rounded-lg border border-slate-200 bg-white text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-lg font-semibold">{editId ? 'Edit spell' : 'Custom spell'}</h2>
          <button
            type="button"
            onClick={onClose}
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
              aria-label="Spell name"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              className={FIELD}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <select value={d.level} onChange={(e) => patch({ level: e.target.value })} aria-label="Level" className={FIELD}>
                {SPELL_LEVELS.map((l) => (
                  <option key={l} value={l}>{l === '0' ? 'Cantrip' : `Level ${l}`}</option>
                ))}
              </select>
              <select value={d.school} onChange={(e) => patch({ school: e.target.value })} aria-label="School" className={FIELD}>
                {SPELL_SCHOOLS.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
              <select value={d.edition} onChange={(e) => patch({ edition: e.target.value as SpellDraft['edition'] })} aria-label="Edition" className={FIELD}>
                <option value="5.5">DnD 5.5 (2024)</option>
                <option value="5.0">DnD 5.0 (2014)</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input value={d.sourceName} onChange={(e) => patch({ sourceName: e.target.value })} placeholder="Source (Homebrew, book…)" aria-label="Source" className={FIELD} />
              <input value={d.classes} onChange={(e) => patch({ classes: e.target.value })} placeholder="Classes (comma-separated)" aria-label="Classes" className={FIELD} />
            </div>
          </Section>

          <Section title="Casting" open>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input value={d.castingTime} onChange={(e) => patch({ castingTime: e.target.value })} placeholder="Casting time" aria-label="Casting time" className={FIELD} />
              <input value={d.range} onChange={(e) => patch({ range: e.target.value })} placeholder="Range" aria-label="Range" className={FIELD} />
              <input value={d.duration} onChange={(e) => patch({ duration: e.target.value })} placeholder="Duration" aria-label="Duration" className={FIELD} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <label className="flex items-center gap-1"><input type="checkbox" checked={d.concentration} onChange={(e) => patch({ concentration: e.target.checked })} /> Concentration</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={d.ritual} onChange={(e) => patch({ ritual: e.target.checked })} /> Ritual</label>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className={LABEL}>Components</span>
              <label className="flex items-center gap-1"><input type="checkbox" checked={d.verbal} onChange={(e) => patch({ verbal: e.target.checked })} /> V</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={d.somatic} onChange={(e) => patch({ somatic: e.target.checked })} /> S</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={d.material} onChange={(e) => patch({ material: e.target.checked })} /> M</label>
            </div>
            {d.material && (
              <input value={d.materials} onChange={(e) => patch({ materials: e.target.value })} placeholder="Material components" aria-label="Material components" className={FIELD} />
            )}
          </Section>

          <Section title="Description" open>
            <textarea
              value={d.text}
              onChange={(e) => patch({ text: e.target.value })}
              placeholder="Spell description (markdown)"
              aria-label="Description"
              rows={4}
              className={FIELD}
            />
          </Section>

          <Section title="Mechanics">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Leave empty for a utility spell. The save DC isn’t set here — it comes from the caster.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className={LABEL}>Resolution</span>
              {(['none', 'attack', 'save'] as const).map((r) => (
                <label key={r} className="flex items-center gap-1">
                  <input type="radio" name="spell-resolution" checked={d.resolution === r} onChange={() => patch({ resolution: r })} />
                  {r === 'none' ? 'None' : r === 'attack' ? 'Spell attack' : 'Saving throw'}
                </label>
              ))}
            </div>
            {d.resolution === 'save' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${LABEL} w-16`}>Save</span>
                <select value={d.saveAbility} onChange={(e) => patch({ saveAbility: e.target.value as SpellDraft['saveAbility'] })} aria-label="Save ability" className={`${FIELD_W} w-20`}>
                  {ABILITIES.map((a) => (<option key={a} value={a}>{a.toUpperCase()}</option>))}
                </select>
                <select value={d.saveOutcome} onChange={(e) => patch({ saveOutcome: e.target.value as SpellDraft['saveOutcome'] })} aria-label="On save" className={`${FIELD_W} min-w-0 flex-1`}>
                  <option value="half">save → half damage</option>
                  <option value="none">save → no damage</option>
                  <option value="negates">save → negates effect</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <span className={LABEL}>Base damage</span>
              <DamageRows rows={d.damage} onChange={(damage) => patch({ damage })} />
            </div>

            <div className="space-y-2 rounded-md border border-slate-200 p-2 dark:border-slate-700">
              <p className={LABEL}>At higher levels</p>
              {!hasBaseDamage ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add base damage above to set how the spell scales.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <label className="flex items-center gap-1">
                      <input type="radio" name="scaling-mode" checked={d.scalingMode === 'increment'} onChange={() => patch({ scalingMode: 'increment' })} />
                      Scales regularly
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="radio" name="scaling-mode" checked={d.scalingMode === 'manual'} onChange={() => patch({ scalingMode: 'manual' })} />
                      Edit each level
                    </label>
                  </div>

                  {d.scalingMode === 'increment' ? (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isCantrip
                          ? 'Damage added at character levels 5, 11, and 17:'
                          : `Extra damage per slot level above ${level}:`}
                      </p>
                      <DamageRows
                        rows={d.scalingIncrement}
                        onChange={(scalingIncrement) => patch({ scalingIncrement })}
                        addLabel="Add increment"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {d.scalingRows.map((row) => (
                        <div key={row.id} className="space-y-1 rounded border border-slate-200 p-2 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">{isCantrip ? 'Character level' : 'Slot level'}</span>
                            <select
                              value={row.level}
                              onChange={(e) => patch({ scalingRows: d.scalingRows.map((x) => (x.id === row.id ? { ...x, level: e.target.value } : x)) })}
                              aria-label="Scaling level"
                              className={`${FIELD_W} w-24`}
                            >
                              <option value="">Level…</option>
                              {manualLevels.map((l) => (<option key={l} value={l}>{l}</option>))}
                            </select>
                            <button
                              type="button"
                              onClick={() => patch({ scalingRows: d.scalingRows.filter((x) => x.id !== row.id) })}
                              aria-label="Remove level"
                              className="ml-auto shrink-0 rounded border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              Remove
                            </button>
                          </div>
                          <DamageRows
                            rows={row.damage}
                            onChange={(damage) => patch({ scalingRows: d.scalingRows.map((x) => (x.id === row.id ? { ...x, damage } : x)) })}
                          />
                        </div>
                      ))}
                      <button type="button" onClick={() => patch({ scalingRows: [...d.scalingRows, emptyScalingRowDraft()] })} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">+ Add level</button>
                    </div>
                  )}

                  {preview.length > 1 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Preview: {preview.map((v) => `${v.label}: ${v.formula}`).join(' · ')}
                    </p>
                  )}
                </>
              )}
            </div>
          </Section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
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
            {editId ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
