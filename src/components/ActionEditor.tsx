// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import {
  ACTION_KINDS,
  ABILITIES,
  DAMAGE_TYPES,
  SAVE_OUTCOMES,
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
  toHitPreview = null,
}: {
  action: ActionDraft
  onChange: (next: ActionDraft) => void
  onRemove: () => void
  /** What this category calls one entry, e.g. "action", "legendary action". */
  label: string
  /** Only legendary actions spend from the per-round budget, so only they show cost. */
  showLegendaryCost?: boolean
  /** The derived to-hit (ability mod + proficiency), shown so the DM sees the result. */
  toHitPreview?: number | null
}) {
  const set = <K extends keyof ActionDraft>(key: K, value: ActionDraft[K]) =>
    onChange({ ...action, [key]: value })

  const isAttack = action.kind === 'melee' || action.kind === 'ranged'
  const fmtBonus = (n: number | null) => (n == null ? '' : n >= 0 ? `+${n}` : `${n}`)

  return (
    <div className="space-y-2 rounded-md border border-slate-200 p-2 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <input
          value={action.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={`${label[0].toUpperCase()}${label.slice(1)} name`}
          aria-label={`${label} name`}
          className={FIELD}
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

      {/* One wrapping mechanics row: attack (ability + derived to-hit + reach/range)
          or a save (ability/DC/outcome), then the damage components inline after.
          To-hit is derived from the ability + proficiency, never typed. */}
      <div className="flex flex-wrap items-center gap-2">
        {isAttack && (
          <>
            <select value={action.attackAbility} onChange={(e) => set('attackAbility', e.target.value as ActionDraft['attackAbility'])} aria-label="Attack ability" className={`${FIELD_W} w-20`}>
              {ABILITIES.map((a) => (<option key={a} value={a}>{a.toUpperCase()}</option>))}
            </select>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              to hit <span className="font-medium tabular-nums">{fmtBonus(toHitPreview)}</span>
            </span>
            {action.kind === 'melee' && (
              <input value={action.reach} onChange={(e) => set('reach', e.target.value)} placeholder="Reach ft" aria-label="Reach" inputMode="numeric" className={`${FIELD_W} w-20`} />
            )}
            {action.kind === 'ranged' && (
              <>
                <input value={action.rangeNormal} onChange={(e) => set('rangeNormal', e.target.value)} placeholder="Short" aria-label="Short range" inputMode="numeric" className={`${FIELD_W} w-24`} />
                <input value={action.rangeLong} onChange={(e) => set('rangeLong', e.target.value)} placeholder="Long" aria-label="Long range" inputMode="numeric" className={`${FIELD_W} w-24`} />
              </>
            )}
          </>
        )}
        {action.kind === 'save' && (
          <>
            <select value={action.saveAbility} onChange={(e) => set('saveAbility', e.target.value as ActionDraft['saveAbility'])} aria-label="Save ability" className={`${FIELD_W} w-28`}>
              <option value="">Save…</option>
              {ABILITIES.map((a) => (<option key={a} value={a}>{a.toUpperCase()}</option>))}
            </select>
            <input value={action.saveDc} onChange={(e) => set('saveDc', e.target.value)} placeholder="DC" aria-label="Save DC" inputMode="numeric" className={`${FIELD_W} w-14`} />
            <select value={action.saveOutcome} onChange={(e) => set('saveOutcome', e.target.value as ActionDraft['saveOutcome'])} aria-label="On save" className={`${FIELD_W} w-36`}>
              {SAVE_OUTCOMES.map((o) => (<option key={o} value={o}>on save: {o}</option>))}
            </select>
          </>
        )}
        {action.damage.map((d, i) => (
          <span key={d.id} className="flex items-center gap-1">
            <input
              value={d.formula}
              onChange={(e) => set('damage', action.damage.map((x) => (x.id === d.id ? { ...x, formula: e.target.value } : x)))}
              placeholder="2d6+3"
              aria-label="Damage formula"
              className={`${FIELD_W} w-24`}
            />
            <select
              value={d.type}
              onChange={(e) => set('damage', action.damage.map((x) => (x.id === d.id ? { ...x, type: e.target.value as typeof x.type } : x)))}
              aria-label="Damage type"
              className={`${FIELD_W} w-32`}
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
          </span>
        ))}
        <button
          type="button"
          onClick={() => set('damage', [...action.damage, emptyDamageDraft()])}
          className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
        >
          + damage
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
