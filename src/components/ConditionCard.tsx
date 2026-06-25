// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ConditionName } from '../schema/effect.ts'
import { Markdown } from './Markdown.tsx'

/** The reference card for a condition: its name and SRD rules text. */
export function ConditionCard({ name, text }: { name: ConditionName; text: string }) {
  return (
    <div className="flex flex-1 flex-col space-y-2">
      <h3 className="text-lg font-semibold">{name}</h3>
      <div className="text-sm text-slate-700 dark:text-slate-300">
        <Markdown>{text}</Markdown>
      </div>
    </div>
  )
}
