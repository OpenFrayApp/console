// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { DEFAULT_TRACKER_COLORS, type TrackerColors } from '../../schema/trackerColors.ts'
import { IconButton } from '../ui/primitives.tsx'
import { SettingRow } from './SettingRow.tsx'

const FIELDS = [
  {
    key: 'creature',
    label: 'Creature color',
    hint: 'The side marker for creatures opposing the party.',
    defaultColor: '#ff637e',
  },
  {
    key: 'ally',
    label: 'Ally color',
    hint: 'The side marker for player characters and allied creatures.',
    defaultColor: '#00bcff',
  },
] as const

/** Pick or independently reset marker colors, optionally inheriting the GM's tracker colors. */
export function TrackerColorFields({
  colors,
  onChange,
  inherited,
}: {
  colors: TrackerColors
  onChange: (colors: TrackerColors) => void
  inherited?: TrackerColors
}) {
  const defaults = inherited ?? DEFAULT_TRACKER_COLORS
  const prefix = inherited ? 'player-view' : 'tracker'
  return (
    <div className="space-y-3">
      {FIELDS.map(({ key, label, hint, defaultColor }) => (
        <div key={key}>
          <SettingRow id={`${prefix}-${key}-color`} label={label} hint={hint}>
            <div className="flex items-center gap-2">
              <input
                id={`${prefix}-${key}-color`}
                type="color"
                value={colors[key] ?? defaults[key] ?? defaultColor}
                onChange={(e) => onChange({ ...colors, [key]: e.target.value })}
                className="tap h-8 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
              />
              <IconButton
                size={8}
                aria-label={`Reset ${key} color`}
                title={inherited ? `Reset ${key} color to follow Tracker` : `Reset ${key} color`}
                onClick={() => onChange({ ...colors, [key]: null })}
                disabled={colors[key] === null}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-4 w-4"
                >
                  <path d="M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6" />
                </svg>
              </IconButton>
            </div>
          </SettingRow>
          {inherited && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {colors[key] === null ? 'Follows Tracker' : 'Custom player-view color'}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
