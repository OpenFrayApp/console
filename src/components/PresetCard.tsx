// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { EffectPreset } from '../schema/preset.ts'
import { isOwnPreset } from '../schema/preset.ts'
import { describeDuration, describeModifier } from '../combat/effects.ts'
import { draftEffects, presetToDraft } from './effectPreset.ts'
import { SourceLink } from './SourceLink.tsx'
import { MetaTable } from './CreatureStatBlock.tsx'

/**
 * A preset shown read-only: what it puts on the board, and where it came from. The
 * bundle is rendered by building the Effects it would apply, so the card can't drift
 * from what Apply actually does. Editing the bundle happens in the Apply effect modal —
 * stage it, change it, and save it again — so only the name is editable here.
 */
export function PresetCard({
  preset,
  onRename,
  onDelete,
}: {
  preset: EffectPreset
  /** Rename the GM's own preset. Absent for one a library ships. */
  onRename?: (name: string) => void
  /** Delete the GM's own preset. Absent for one a library ships. */
  onDelete?: () => void
}) {
  const own = isOwnPreset(preset)
  const draft = presetToDraft(preset)
  const effects = draftEffects(draft)

  // What kind of preset it is, named by what it actually carries. A Game Master
  // scanning the list wants this before the detail.
  const kinds = [
    preset.conditions.length > 0 && (preset.conditions.length === 1 ? 'condition' : 'conditions'),
    preset.modifier && (preset.modifier.mode === 'flatBonus' ? 'modifier' : preset.modifier.mode),
    preset.counter ? 'counter' : preset.note && 'reminder',
  ].filter((k): k is string => typeof k === 'string')
  const kind = kinds.length ? `${kinds.join(' · ')}` : 'empty'

  // The duration every condition and modifier in the bundle shares. A counter has no
  // timer at all — it holds a tally — so it names itself instead.
  const timed = effects.find((e) => e.duration.type !== 'counter') ?? effects[0]
  const duration = preset.counter ? 'Counter' : timed ? describeDuration(timed) : undefined

  const rows: [string, string | undefined][] = [
    ['Duration', duration],
    ['Conditions', preset.conditions.join(', ')],
    ['Modifier', preset.modifier ? describeModifier(preset.modifier) : undefined],
    [preset.counter ? 'Counter' : 'Reminder', preset.note ?? undefined],
  ]

  /** Ask for a new name, then commit it. */
  const rename = () => {
    const chosen = window.prompt('Rename this preset', preset.name)
    if (chosen === null || chosen.trim() === '') return
    onRename?.(chosen.trim())
  }

  return (
    <div className="flex min-h-full flex-col space-y-4 pt-4">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{preset.name}</h3>
        <p className="text-sm italic text-slate-500 dark:text-slate-400">Preset · {kind}</p>
      </div>

      <MetaTable rows={rows} />

      <div>
        <p className="mb-2 border-b border-slate-200 pb-1 text-base font-semibold tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-300">
          What Apply puts on the board
        </p>
        {effects.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nothing — it is empty.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {effects.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{e.name}</span>
                <span className="text-slate-500 dark:text-slate-400">· {describeDuration(e)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SourceLink
        source={preset.source ?? 'custom'}
        actions={
          own && (onRename || onDelete) ? (
            <span className="flex shrink-0 gap-2">
              {onRename && (
                <button
                  type="button"
                  onClick={rename}
                  className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Rename
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  Delete
                </button>
              )}
            </span>
          ) : undefined
        }
      />
    </div>
  )
}
