// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { isRollable, type Action, type Recharge } from '../../schema/action.ts'
import { Markdown, type ResolveSpell } from './Markdown.tsx'
import { SECTION_HEADING } from './parts.tsx'

/** A recharge as its stat-block tag: "Recharge 5–6", "N/Day", or "N/Round"; none → undefined. */
function rechargeLabel(recharge: Recharge | undefined): string | undefined {
  if (!recharge) return undefined
  if (recharge.type === 'dice') {
    return recharge.value >= 6 ? 'Recharge 6' : `Recharge ${recharge.value}–6`
  }
  if (recharge.type === 'perDay') return `${recharge.value}/Day`
  return `${recharge.value}/Round`
}

/**
 * Renders a list of actions. When `onAction` is supplied (i.e. in combat), the
 * name of each rollable action becomes a button that opens the resolver; the
 * prose follows inline so the stat-block reads the same. In the reference
 * compendium no handler is passed, so names stay plain text.
 */
export function ActionSection({
  title,
  note,
  actions,
  onAction,
  rechargeState,
  onRecharge,
  resolveSpell,
  actionUsesOf,
  onUseAction,
  clickAll,
  useHint,
  legendaryRemaining,
}: {
  title: string
  /** Optional explanatory text shown under the header (e.g. the legendary preamble). */
  note?: string
  actions?: Action[]
  onAction?: (a: Action) => void
  /** id → charged? A rechargeable action that is `false` can't be used until it recharges. */
  rechargeState?: Record<string, boolean>
  onRecharge?: (a: Action) => void
  resolveSpell?: ResolveSpell
  /** Per-day uses left for an "N/Day" action, or null if untracked. */
  actionUsesOf?: (a: Action) => number | null
  /** Spend one per-day use of an action. */
  onUseAction?: (a: Action) => void
  /** Make every action clickable (not just rollable ones) — used for legendary
   *  actions and reactions, where clicking spends one regardless of attack/save. */
  clickAll?: boolean
  /** Tooltip for a `clickAll` action; defaults to the legendary wording. */
  useHint?: string
  /** Legendary actions left — disables actions that cost more than this. */
  legendaryRemaining?: number
}) {
  if (!actions || actions.length === 0) return null
  return (
    <div>
      <h4 className={SECTION_HEADING}>{title}</h4>
      {note && (
        <p className="mb-2 text-sm italic leading-relaxed text-slate-500 dark:text-slate-400">
          {note}
        </p>
      )}
      <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-400 [&_strong]:text-slate-900 dark:[&_strong]:text-slate-200">
        {actions.map((a) => {
          const usesLeft = actionUsesOf?.(a) ?? null
          const recharge = rechargeLabel(a.recharge)
          const label =
            usesLeft != null ? [recharge, `${usesLeft} left`].filter(Boolean).join(', ') : recharge
          const heading = `${a.name}${label ? ` (${label})` : ''}`
          const available = usesLeft != null ? usesLeft > 0 : rechargeState?.[a.id] !== false
          // A per-day-limited action is clickable to spend a use (and roll it if it
          // rolls); greyed once exhausted — tracked like a spell's "N/Day Each" uses.
          if (onUseAction && usesLeft != null) {
            return (
              <p key={a.id} className={available ? undefined : 'opacity-60'}>
                {available ? (
                  <button
                    type="button"
                    onClick={() => onUseAction(a)}
                    title={
                      isRollable(a)
                        ? 'Use this action (spends one, then rolls)'
                        : 'Use this action (spends one)'
                    }
                    className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {heading}.
                  </button>
                ) : (
                  <span className="font-semibold">{heading}.</span>
                )}{' '}
                {a.text ? (
                  <Markdown inline linkConditions resolveSpell={resolveSpell}>
                    {a.text}
                  </Markdown>
                ) : null}
              </p>
            )
          }
          // Legendary actions and reactions: every entry is clickable, because using one
          // spends a resource whether or not it rolls anything.
          if (onAction && clickAll) {
            const cost = a.legendaryCost ?? 1
            const cantAfford = legendaryRemaining != null && legendaryRemaining < cost
            const clickHeading = cost > 1 ? `${a.name} (Costs ${cost})` : heading
            return (
              <p key={a.id} className={cantAfford ? 'opacity-50' : undefined}>
                <button
                  type="button"
                  onClick={() => onAction(a)}
                  disabled={cantAfford}
                  title={
                    useHint ??
                    (cost > 1 ? `Use this action (spends ${cost})` : 'Use this action (spends one)')
                  }
                  className="font-semibold text-indigo-600 hover:underline disabled:no-underline disabled:hover:no-underline dark:text-indigo-400"
                >
                  {clickHeading}.
                </button>{' '}
                {a.text ? (
                  <Markdown inline linkConditions resolveSpell={resolveSpell}>
                    {a.text}
                  </Markdown>
                ) : null}
              </p>
            )
          }
          if (onAction && isRollable(a) && available) {
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
                {a.text ? (
                  <Markdown inline linkConditions resolveSpell={resolveSpell}>
                    {a.text}
                  </Markdown>
                ) : null}
              </p>
            )
          }
          // Spent recharge ability — not usable until it recharges. Offer a roll.
          if (onAction && isRollable(a) && !available) {
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
                {a.text ? (
                  <Markdown inline linkConditions resolveSpell={resolveSpell}>
                    {a.text}
                  </Markdown>
                ) : null}
              </p>
            )
          }
          return (
            <Markdown
              key={a.id}
              linkConditions
              resolveSpell={resolveSpell}
            >{`**${heading}.** ${a.text ?? ''}`}</Markdown>
          )
        })}
      </div>
    </div>
  )
}
