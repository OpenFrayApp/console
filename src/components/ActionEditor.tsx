// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import {
  ACTION_KINDS,
  ABILITIES,
  DAMAGE_TYPES,
  emptyDamageDraft,
  type ActionDraft,
  type RechargeKind,
} from './customMonster.ts'

// Width-less base, so explicit sizes (`${FIELD_W} w-16`) win cleanly in flex rows.
// FIELD keeps `w-full` for the common full-width input.
export const FIELD_W =
  'rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800'
export const FIELD = `w-full ${FIELD_W}`
export const LABEL = 'text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500'

const RECHARGE_KINDS: { value: RechargeKind; label: string }[] = [
  { value: 'none', label: 'No limit' },
  { value: 'dice', label: 'Recharge die' },
  { value: 'perDay', label: 'Per day' },
  { value: 'perRound', label: 'Per round' },
]

/**
 * Edits one Action draft (an attack, save, or utility line). Reused for every
 * action category — actions, bonus actions, reactions, legendary, lair. The
 * attack vs save fields show contextually by `kind`; damage and the advanced
 * row (recharge / legendary cost / prose) apply to any kind.
 */
export function ActionEditor({
  action,
  onChange,
  onRemove,
  label,
  showLegendaryCost = false,
}: {
  action: ActionDraft
  onChange: (next: ActionDraft) => void
  onRemove: () => void
  /** What this category calls one entry, e.g. "action", "legendary action". */
  label: string
  /** Only legendary actions spend from the per-round budget, so only they show cost. */
  showLegendaryCost?: boolean
}) {
  const set = <K extends keyof ActionDraft>(key: K, value: ActionDraft[K]) =>
    onChange({ ...action, [key]: value })

  const isAttack = action.kind === 'melee' || action.kind === 'ranged'

  return (
    <div className="space-y-2 rounded-md border border-slate-200 p-2 dark:border-slate-700">
      {/* Row 1 — what it is: name, kind, remove. To-hit isn't shown; it's derived
          from the ability + proficiency and rendered on the stat block. */}
      <div className="flex items-center gap-2">
        <input
          value={action.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={`${label[0].toUpperCase()}${label.slice(1)} name`}
          aria-label={`${label} name`}
          className={`${FIELD_W} min-w-0 flex-1`}
        />
        <select
          value={action.kind}
          onChange={(e) => set('kind', e.target.value as ActionDraft['kind'])}
          aria-label={`${label} kind`}
          className={`${FIELD_W} w-28`}
        >
          {ACTION_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Remove
        </button>
      </div>

      {/* Attack — which ability it uses, and reach (melee) or range (ranged). */}
      {isAttack && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${LABEL} w-16`}>Attack</span>
          <select value={action.attackAbility} onChange={(e) => set('attackAbility', e.target.value as ActionDraft['attackAbility'])} aria-label="Attack ability" className={`${FIELD_W} w-20`}>
            {ABILITIES.map((a) => (<option key={a} value={a}>{a.toUpperCase()}</option>))}
          </select>
          {action.kind === 'melee' && (
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              reach
              <input value={action.reach} onChange={(e) => set('reach', e.target.value)} placeholder="ft" aria-label="Reach" inputMode="numeric" className={`${FIELD_W} w-16`} />
            </span>
          )}
          {action.kind === 'ranged' && (
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              range
              <input value={action.rangeNormal} onChange={(e) => set('rangeNormal', e.target.value)} placeholder="near" aria-label="Short range" inputMode="numeric" className={`${FIELD_W} w-16`} />
              /
              <input value={action.rangeLong} onChange={(e) => set('rangeLong', e.target.value)} placeholder="far" aria-label="Long range" inputMode="numeric" className={`${FIELD_W} w-16`} />
              ft
            </span>
          )}
        </div>
      )}

      {/* Save — ability, DC, and what a success does. */}
      {action.kind === 'save' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${LABEL} w-16`}>Save</span>
          <select value={action.saveAbility} onChange={(e) => set('saveAbility', e.target.value as ActionDraft['saveAbility'])} aria-label="Save ability" className={`${FIELD_W} w-20`}>
            {ABILITIES.map((a) => (<option key={a} value={a}>{a.toUpperCase()}</option>))}
          </select>
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            DC
            <input value={action.saveDc} onChange={(e) => set('saveDc', e.target.value)} placeholder="#" aria-label="Save DC" inputMode="numeric" className={`${FIELD_W} w-14`} />
          </span>
          {/* Outcome labels mirror the mass-save modal (GroupSaveForm). */}
          <select value={action.saveOutcome} onChange={(e) => set('saveOutcome', e.target.value as ActionDraft['saveOutcome'])} aria-label="On save" className={`${FIELD_W} min-w-0 flex-1`}>
            <option value="half">save → half damage</option>
            <option value="none">save → no damage</option>
            <option value="negates">save → negates effect</option>
          </select>
        </div>
      )}

      {/* Damage — one component per row, stacked. */}
      <div className="space-y-1">
        <span className={LABEL}>Damage</span>
        {action.damage.map((d, i) => (
          <div key={d.id} className="flex items-center gap-2">
            <input
              value={d.formula}
              onChange={(e) => set('damage', action.damage.map((x) => (x.id === d.id ? { ...x, formula: e.target.value } : x)))}
              placeholder="2d6"
              aria-label="Damage formula"
              className={`${FIELD_W} w-28 shrink-0`}
            />
            <select
              value={d.type}
              onChange={(e) => set('damage', action.damage.map((x) => (x.id === d.id ? { ...x, type: e.target.value as typeof x.type } : x)))}
              aria-label="Damage type"
              className={`${FIELD_W} min-w-0 flex-1`}
            >
              {DAMAGE_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
            <button
              type="button"
              onClick={() => set('damage', action.damage.filter((x) => x.id !== d.id))}
              aria-label="Remove damage"
              disabled={action.damage.length === 1 && i === 0}
              className="shrink-0 rounded border border-slate-300 px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set('damage', [...action.damage, emptyDamageDraft()])}
          className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
        >
          + Add damage
        </button>
      </div>

      {/* Recharge / limited uses. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${LABEL} w-16`}>Recharge</span>
        <select value={action.rechargeKind} onChange={(e) => set('rechargeKind', e.target.value as RechargeKind)} aria-label="Recharge kind" className={`${FIELD_W} w-40`}>
          {RECHARGE_KINDS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {action.rechargeKind !== 'none' && (
          <input
            value={action.rechargeValue}
            onChange={(e) => set('rechargeValue', e.target.value)}
            placeholder={action.rechargeKind === 'dice' ? 'Threshold (5)' : 'Count (1)'}
            aria-label="Recharge value"
            inputMode="numeric"
            className={`${FIELD_W} w-32`}
          />
        )}
        {showLegendaryCost && (
          <input
            value={action.legendaryCost}
            onChange={(e) => set('legendaryCost', e.target.value)}
            placeholder="Legendary cost"
            aria-label="Legendary cost"
            inputMode="numeric"
            className={`${FIELD_W} w-36`}
          />
        )}
      </div>

      <textarea
        value={action.text}
        onChange={(e) => set('text', e.target.value)}
        placeholder="Prose (display only — never parsed for mechanics)"
        aria-label={`${label} text`}
        rows={2}
        className={FIELD}
      />
    </div>
  )
}
