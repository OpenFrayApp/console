// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { usePlayerBoard, type PlayerLinkStatus } from '../state/playerChannel.ts'
import { useTheme } from '../hooks/useTheme.ts'
import { CrossedSwordsIcon } from './CrossedSwordsIcon.tsx'
import { GameLog } from './GameLog.tsx'
import { PlayerRow } from './PlayerRow.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

/**
 * The screen at a shared link: the initiative order and the game log, and nothing
 * else. It is read-only by construction rather than by hiding controls — the board it
 * renders arrives already filtered by `playerBoard()` on the Game Master's machine, so
 * a creature's stat block and hidden hit points are not in the page to be found.
 *
 * Phone-first, which inverts the console's tablet-first rule on purpose: the Game
 * Master runs the fight on a wide screen, and everyone else is holding a phone.
 */

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
        This page follows the fight at <span className="font-mono">{code}</span> once your Game
        Master starts sharing. Leave it open — it fills in on its own.
      </p>
    </div>
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
  const { status, board } = usePlayerBoard(code)
  const turn = board?.rows.find((r) => r.id === board.activeId)?.name

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <a href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <span className="text-indigo-500 dark:text-indigo-400">
            <CrossedSwordsIcon />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            <span className="text-indigo-500 dark:text-indigo-400">Open</span>Fray
          </span>
        </a>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">
        {board ? (
          <>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              <Standing round={board.round} paused={board.paused} turn={turn} />
            </p>

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

            <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Game log
            </h2>
            <GameLog entries={[...board.log].reverse()} />
          </>
        ) : (
          <Standby status={status} code={code} />
        )}
      </main>

      <footer className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        A shared view of a fight running in OpenFray. Nothing here is saved.
      </footer>
    </div>
  )
}
