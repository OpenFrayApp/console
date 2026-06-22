// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ReactNode } from 'react'
import type { AbilityScores, Senses, Speeds } from '../schema/primitives.ts'
import type { Concentration, HitPoints } from '../schema/combatant.ts'
import { speedLines } from '../combat/speed.ts'
import { hpTierOf } from '../combat/resources.ts'
import { hpToneFor } from './hpTone.ts'
import { formatSenses } from '../compendium/format.ts'
import { AbilityTable, DefensesAndSenses, SECTION_HEADING } from './CreatureStatBlock.tsx'
import { HeaderStat, StatHeader } from './StatHeader.tsx'
import { Markdown } from './Markdown.tsx'

const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)

/** A labelled bullet list of roleplay lines (traits / ideals / bonds / flaws). */
function LineGroup({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <ul className="list-disc pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A player character rendered as a stat block — the same shape and styling as a
 * creature's (shared `StatHeader`, ability table, defenses, sections), so the
 * compendium and the encounter look identical. PCs are lightweight: abilities show
 * Mod only (no save proficiencies to read), and the values aren't rollable (the
 * player rolls their own dice). Editing handlers / `footer` are supplied by the
 * caller — live HP editing in combat, action buttons in the compendium.
 */
export function PcStatBlock({
  name,
  subtitle,
  ac,
  hp,
  initiativeMod,
  speed,
  abilities,
  resistances,
  immunities,
  vulnerabilities,
  languages,
  senses,
  passivePerception,
  faith,
  personalityTraits,
  ideals,
  bonds,
  flaws,
  backstory,
  concentration,
  onRename,
  onHpInput,
  onTempInput,
  footer,
}: {
  name: string
  subtitle: ReactNode
  ac: number
  hp: HitPoints
  initiativeMod: number
  speed?: Speeds
  abilities?: AbilityScores
  resistances?: string[]
  immunities?: string[]
  vulnerabilities?: string[]
  languages?: string[]
  /** Full senses (roster PCs); rendered like a creature's. */
  senses?: Senses
  /** Passive Perception only (anonymous quick PCs, which carry no full senses). */
  passivePerception?: number
  faith?: string
  personalityTraits?: string[]
  ideals?: string[]
  bonds?: string[]
  flaws?: string[]
  backstory?: string
  concentration?: Concentration | null
  onRename?: (name: string) => void
  onHpInput?: (raw: string) => void
  onTempInput?: (raw: string) => void
  /** Bottom source-style row (e.g. Add to encounter / Edit / Delete). */
  footer?: ReactNode
}) {
  const hpTone = hpToneFor(hpTierOf(hp.current, hp.max))
  const hpValue = (
    <span>
      <span className={hpTone}>{hp.current}</span>
      <span className="text-slate-400 dark:text-slate-500">/{hp.max}</span>
    </span>
  )
  const tmpValue =
    hp.temp > 0 ? (
      <span className="text-sky-600 dark:text-sky-400">{hp.temp}</span>
    ) : (
      <span className="text-slate-400 dark:text-slate-500">—</span>
    )
  const hasPersonality =
    !!(faith?.trim() || personalityTraits?.length || ideals?.length || bonds?.length || flaws?.length)

  return (
    <div className="@container flex flex-1 flex-col space-y-4">
      <StatHeader
        name={name}
        onRename={onRename}
        subtitle={subtitle}
        concentration={concentration}
        speeds={speed ? speedLines(speed) : undefined}
        stats={
          <>
            <HeaderStat label="AC" value={ac} />
            <HeaderStat
              label="HP"
              value={hpValue}
              edit={onHpInput ? { initial: '', onCommit: onHpInput, title: 'Set HP, or +N / −N' } : undefined}
            />
            <HeaderStat
              label="TMP"
              value={tmpValue}
              edit={onTempInput ? { initial: '', onCommit: onTempInput, title: 'Set temp HP, or +N / −N' } : undefined}
            />
            {/* The modifier, like a creature's Init bonus — the rolled value lives in the tracker. */}
            <HeaderStat label="Init" value={signed(initiativeMod)} />
          </>
        }
      />

      {abilities && (
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
          <div className="min-w-[20rem] flex-1">
            <AbilityTable abilities={abilities} />
          </div>
        </div>
      )}

      <DefensesAndSenses
        resistances={resistances?.join(', ')}
        immunities={immunities?.join(', ')}
        vulnerabilities={vulnerabilities?.join(', ')}
        senses={
          senses
            ? formatSenses(senses)
            : passivePerception != null
              ? `Passive Perception ${passivePerception}`
              : undefined
        }
        languages={languages?.join(', ')}
      />

      {hasPersonality && (
        <div>
          <h4 className={SECTION_HEADING}>Personality</h4>
          <div className="space-y-2">
            {faith?.trim() && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Faith
                </p>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{faith}</p>
              </div>
            )}
            <LineGroup label="Personality Traits" items={personalityTraits} />
            <LineGroup label="Ideals" items={ideals} />
            <LineGroup label="Bonds" items={bonds} />
            <LineGroup label="Flaws" items={flaws} />
          </div>
        </div>
      )}

      {backstory?.trim() && (
        <div>
          <h4 className={SECTION_HEADING}>Backstory &amp; Goals</h4>
          <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <Markdown>{backstory}</Markdown>
          </div>
        </div>
      )}

      {footer && (
        <div className="mt-auto flex items-center gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
          {footer}
        </div>
      )}
    </div>
  )
}
