// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState } from 'react'
import { usePlayerBoard, type PlayerLinkStatus } from '../../state/playerChannel.ts'
import { useTheme } from '../../hooks/useTheme.ts'
import type { PlayerRecap } from '../../combat/playerView.ts'
import { CombatTimers } from '../tracker/CombatTimers.tsx'
import { CrossedSwordsIcon } from '../icons/CrossedSwordsIcon.tsx'
import { GameLog } from '../log/GameLog.tsx'
import { PlayerRow } from './PlayerRow.tsx'
import { OutcomeBadge, RecapSummary } from '../tracker/Recap.tsx'
import { ThemeToggle } from '../icons/ThemeToggle.tsx'
import { COLUMN_HEADING } from '../ui/headings.ts'
import { PinInput } from '../ui/PinInput.tsx'
import { backgroundFile } from '../../lib/backgrounds.ts'

/**
 * The screen at a shared link: the initiative order and the game log, and nothing
 * else. It is read-only by construction rather than by hiding controls — the board it
 * renders arrives already filtered by `playerBoard()` on the Game Master's machine, so
 * a creature's stat block and hidden hit points are not in the page to be found.
 *
 * Phone-first, which inverts the console's tablet-first rule on purpose: the Game
 * Master runs the fight on a wide screen, and everyone else is holding a phone.
 */

/** The console's column heading, pushed off the list below it. */
const PANE_HEADING = `mb-2 ${COLUMN_HEADING}`

/** The locked door: four boxes, and the verdict of the last try. */
function PinGate({
  pin,
  onPin,
  rejected,
}: {
  pin: string
  onPin: (pin: string) => void
  rejected: boolean
}) {
  const checking = pin.length === 4 && !rejected
  return (
    <div className="space-y-3">
      <p className="font-medium">This view is locked.</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Your Game Master set a PIN. Type it to open the board.
      </p>
      <PinInput value={pin} onChange={onPin} autoFocus />
      {checking && <p className="text-sm text-slate-500 dark:text-slate-400">Checking…</p>}
      {rejected && (
        <p className="text-sm text-rose-600 dark:text-rose-400" role="status">
          That PIN doesn’t match. Check it with your Game Master.
        </p>
      )}
    </div>
  )
}

/** What to say while there's no board — each state names what the reader should do next. */
function Standby({ status, code }: { status: PlayerLinkStatus; code: string }) {
  if (status === 'unavailable') {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Shared views aren’t available on this copy of OpenFray.
      </p>
    )
  }
  if (status === 'connecting') {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Connecting…</p>
  }
  return (
    <div className="space-y-2">
      <p className="font-medium">Waiting for the Game Master.</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        This page follows the encounter at <span className="font-mono">{code}</span> once your Game
        Master starts sharing. Leave it open — it fills in on its own.
      </p>
    </div>
  )
}

/** How the encounter went, on the table's own screens, for as long as the GM leaves it up. */
function SharedRecap({ recap }: { recap: PlayerRecap }) {
  return (
    <section className="mb-4 shrink-0 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-3 flex items-center gap-2">
        <OutcomeBadge outcome={recap.outcome} />
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          How the encounter went
        </h2>
      </div>
      <RecapSummary recap={recap} showXp={recap.showXp} />
    </section>
  )
}

/** Where the fight is, in one line: the round, and whose turn it is. */
function Standing({ round, paused, turn }: { round: number; paused: boolean; turn?: string }) {
  if (round === 0) return <span className="text-slate-500 dark:text-slate-400">Not started</span>
  if (paused)
    return <span className="text-slate-500 dark:text-slate-400">Round {round} · Paused</span>
  return (
    <span>
      Round {round}
      {turn && (
        <>
          {' · '}
          <span className="font-medium">{turn}</span>’s turn
        </>
      )}
    </span>
  )
}

/** The whole player screen for one share code. */
export function PlayerView({ code }: { code: string }) {
  const [theme, toggleTheme] = useTheme()
  const [pin, setPin] = useState('')
  const { status, board, pinRejected } = usePlayerBoard(code, pin.length === 4 ? pin : null)
  const turn = board?.rows.find((r) => r.id === board.activeId)?.name
  const backdrop = backgroundFile(board?.background)

  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {backdrop && (
        <>
          {/* Negative z keeps both layers above this div's own background and under
            everything it contains; the veil is what keeps the rows readable. */}
          <div
            aria-hidden
            data-backdrop={board?.background}
            className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${import.meta.env.BASE_URL}${backdrop})` }}
          />
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 bg-white/85 dark:bg-slate-950/60"
          />
        </>
      )}
      <header className="relative flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <a href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <span className="text-indigo-500 dark:text-indigo-400">
            <CrossedSwordsIcon />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            <span className="text-indigo-500 dark:text-indigo-400">Open</span>Fray
          </span>
        </a>
        {board && (board.campaign || board.gm) && (
          <p className="absolute left-1/2 max-w-[45vw] -translate-x-1/2 truncate whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
            {board.campaign && (
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {board.campaign}
              </span>
            )}
            {board.campaign && board.gm && ' · '}
            {board.gm && <span>Run by {board.gm}</span>}
          </p>
        )}
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-4 py-4">
        {!board && status === 'locked' ? (
          <PinGate pin={pin} onPin={setPin} rejected={pinRejected} />
        ) : board ? (
          <>
            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <Standing round={board.round} paused={board.paused} turn={turn} />
              </p>
              {board.timers && (
                <CombatTimers
                  stats={board.timers}
                  round={board.round}
                  running={board.round > 0 && !board.paused}
                />
              )}
            </div>

            {board.recap && <SharedRecap recap={board.recap} />}

            {/* Two columns that scroll independently, so a long fight's log never pushes
              the turn order off the screen — and neither one drags the other along.
              Below `sm` there isn't width for two, so they stack and the page scrolls. */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto sm:flex-row sm:overflow-hidden">
              <section className="min-h-0 sm:flex-1 sm:overflow-y-auto">
                <h2 className={PANE_HEADING}>Turn order</h2>
                {board.rows.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nobody is on the board yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {board.rows.map((row) => (
                      <PlayerRow key={row.id} row={row} active={row.id === board.activeId} />
                    ))}
                  </ul>
                )}
              </section>

              <section className="min-h-0 sm:flex-1 sm:overflow-y-auto">
                <h2 className={PANE_HEADING}>Game log</h2>
                <GameLog entries={[...board.log].reverse()} />
              </section>
            </div>
          </>
        ) : (
          <Standby status={status} code={code} />
        )}
      </main>

      <footer className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        A shared view of an encounter running in OpenFray. Nothing here is saved.
      </footer>
    </div>
  )
}
