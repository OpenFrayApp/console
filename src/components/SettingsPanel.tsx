// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState } from 'react'
import {
  LIBRARIES,
  editionBadgeClass,
  editionLabel,
  librarySourceBadgeClass,
} from '../compendium/libraries.ts'
import { track, EVENTS } from '../lib/analytics.ts'
import type { LibrarySort, PlayerLogScope, PlayerViewSettings } from '../state/settings.ts'
import type { FieldVisibility, HpVisibility } from '../schema/combatant.ts'
import { Badge, CUSTOM_TONE, TabButton } from './ui.tsx'

const SELECT =
  'rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'

// Rule-set groups, in display order; the homebrew toggle rides along in "Other".
const GROUPS: { key: 'core' | 'openfray' | 'other'; label: string }[] = [
  { key: 'core', label: 'Core' },
  { key: 'openfray', label: 'OpenFray' },
  { key: 'other', label: 'Other' },
]

const IMPORTER_CHROME_URL =
  'https://chromewebstore.google.com/detail/openfray-importer/cjooflanhdpfddpppllaelhlfpdinjfk'
const IMPORTER_FIREFOX_URL = 'https://addons.mozilla.org/en-US/firefox/addon/openfray-importer/'

/** One "get the importer" button — the same store link for every browser we ship to. */
function ImporterLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => track(EVENTS.importerClicked)}
      className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-4 w-4"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {children}
    </a>
  )
}

/** The settings screen's tabs, in the order they're shown. */
const TABS = [
  { key: 'libraries', label: 'Libraries' },
  { key: 'player-view', label: 'Player view' },
  { key: 'importer', label: 'Importer' },
] as const

type SettingsTab = (typeof TABS)[number]['key']

/**
 * App settings, available to every user (anonymous included). Settings persist in
 * `localStorage`, so the panel doesn't need an account. One tab per area — the list
 * outgrew a single scroll, and a preference nobody can find is a preference nobody
 * uses. Shown full-screen over the app; closes via Done.
 */
export function SettingsPanel({
  onClose,
  enabledLibraries,
  onSetEnabledLibraries,
  showHomebrew,
  onSetShowHomebrew,
  librarySort,
  onSetLibrarySort,
  playerView,
  onSetPlayerView,
}: {
  onClose: () => void
  enabledLibraries: string[]
  onSetEnabledLibraries: (ids: string[]) => void
  showHomebrew: boolean
  onSetShowHomebrew: (value: boolean) => void
  librarySort: LibrarySort
  onSetLibrarySort: (value: LibrarySort) => void
  playerView: PlayerViewSettings
  onSetPlayerView: (value: PlayerViewSettings) => void
}) {
  const [tab, setTab] = useState<SettingsTab>('libraries')

  // Toggle a library; never drop the last one (an empty compendium is never useful).
  const toggleLibrary = (id: string) => {
    const next = enabledLibraries.includes(id)
      ? enabledLibraries.filter((x) => x !== id)
      : [...enabledLibraries, id]
    if (next.length > 0) {
      track(EVENTS.ruleSetToggled)
      onSetEnabledLibraries(next)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white dark:bg-slate-950">
      <div className="mx-auto flex min-h-full max-w-lg flex-col px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Settings
          </h1>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Done
          </button>
        </div>

        <div role="tablist" aria-label="Settings" className="mb-4 flex gap-1">
          {TABS.map((t) => (
            <TabButton
              key={t.key}
              id={`settings-tab-${t.key}`}
              active={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </TabButton>
          ))}
        </div>

        <div className="space-y-4">
          <section
            role="tabpanel"
            aria-labelledby="settings-tab-libraries"
            hidden={tab !== 'libraries'}
            className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
          >
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
              Select the libraries your table uses. They add creatures and spells in the compendium,
              in the Add creature list, and in the Cast spell list.
            </p>
            <div className="space-y-4">
              {GROUPS.map((group) => (
                <div key={group.key}>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {group.label}
                  </h4>
                  <div className="space-y-2">
                    {group.key === 'other' && (
                      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-indigo-600"
                          checked={showHomebrew}
                          onChange={() => {
                            track(EVENTS.homebrewToggled)
                            onSetShowHomebrew(!showHomebrew)
                          }}
                        />
                        <span>Homebrew creations</span>
                        <span className="flex items-center gap-1.5">
                          <Badge tone={CUSTOM_TONE}>Custom</Badge>
                        </span>
                      </label>
                    )}
                    {LIBRARIES.filter((lib) => lib.group === group.key).map((lib) => (
                      <label
                        key={lib.id}
                        className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-indigo-600"
                          checked={enabledLibraries.includes(lib.id)}
                          onChange={() => toggleLibrary(lib.id)}
                        />
                        {lib.bookUrl ? (
                          <a
                            href={lib.bookUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => {
                              e.stopPropagation()
                              track(EVENTS.bookOpened)
                            }}
                            className="underline decoration-dotted underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {lib.label}
                          </a>
                        ) : (
                          <span>{lib.label}</span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Badge tone={librarySourceBadgeClass(lib.id)}>{lib.shortLabel}</Badge>
                          <Badge tone={editionBadgeClass(lib.edition)}>
                            {editionLabel(lib.edition)}
                          </Badge>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <label htmlFor="library-sort" className="text-sm text-slate-700 dark:text-slate-200">
                Sort by
              </label>
              <select
                id="library-sort"
                value={librarySort}
                onChange={(e) => {
                  track(EVENTS.librarySortChanged)
                  onSetLibrarySort(e.target.value as LibrarySort)
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="name">Name (A–Z)</option>
                <option value="cr">Creature CR/Spell level</option>
              </select>
            </div>
          </section>

          <section
            role="tabpanel"
            aria-labelledby="settings-tab-player-view"
            hidden={tab !== 'player-view'}
            className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
          >
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
              Choose how much of a creature your players see on the screen you share with them.
              Their own characters always show in full.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="player-view-hp"
                  className="text-sm text-slate-700 dark:text-slate-200"
                >
                  Creature hit points
                </label>
                <select
                  id="player-view-hp"
                  value={playerView.hp}
                  onChange={(e) => {
                    track(EVENTS.playerViewChanged)
                    onSetPlayerView({ ...playerView, hp: e.target.value as HpVisibility })
                  }}
                  className={SELECT}
                >
                  <option value="bloodied">In words (Bloodied)</option>
                  <option value="exact">Exact number</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="player-view-ac"
                  className="text-sm text-slate-700 dark:text-slate-200"
                >
                  Creature armor class
                </label>
                <select
                  id="player-view-ac"
                  value={playerView.ac}
                  onChange={(e) => {
                    track(EVENTS.playerViewChanged)
                    onSetPlayerView({ ...playerView, ac: e.target.value as FieldVisibility })
                  }}
                  className={SELECT}
                >
                  <option value="hidden">Hidden</option>
                  <option value="shown">Shown</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="player-view-rolls"
                    className="text-sm text-slate-700 dark:text-slate-200"
                  >
                    Creature rolls
                  </label>
                  <select
                    id="player-view-rolls"
                    value={playerView.rolls}
                    onChange={(e) => {
                      track(EVENTS.playerViewChanged)
                      onSetPlayerView({ ...playerView, rolls: e.target.value as FieldVisibility })
                    }}
                    className={SELECT}
                  >
                    <option value="shown">Shown</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  What a creature's attacks, saves and checks came to. Hiding them keeps whether it
                  hit or saved, and the damage it dealt.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="player-view-effects"
                  className="text-sm text-slate-700 dark:text-slate-200"
                >
                  Creature conditions
                </label>
                <select
                  id="player-view-effects"
                  value={playerView.effects}
                  onChange={(e) => {
                    track(EVENTS.playerViewChanged)
                    onSetPlayerView({ ...playerView, effects: e.target.value as FieldVisibility })
                  }}
                  className={SELECT}
                >
                  <option value="shown">Shown</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="player-view-arrivals"
                    className="text-sm text-slate-700 dark:text-slate-200"
                  >
                    Creatures arriving mid-fight
                  </label>
                  <select
                    id="player-view-arrivals"
                    value={playerView.arrivals}
                    onChange={(e) => {
                      track(EVENTS.playerViewChanged)
                      onSetPlayerView({
                        ...playerView,
                        arrivals: e.target.value as FieldVisibility,
                      })
                    }}
                    className={SELECT}
                  >
                    <option value="shown">Shown</option>
                    <option value="hidden">Hidden until revealed</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Where a reinforcement starts. Any creature can be hidden or revealed on its own,
                  from its controls beside the stat block.
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="player-view-log"
                    className="text-sm text-slate-700 dark:text-slate-200"
                  >
                    Game log
                  </label>
                  <select
                    id="player-view-log"
                    value={playerView.log}
                    onChange={(e) => {
                      track(EVENTS.playerViewChanged)
                      onSetPlayerView({ ...playerView, log: e.target.value as PlayerLogScope })
                    }}
                    className={SELECT}
                  >
                    <option value="fight">This fight only</option>
                    <option value="session">The whole session</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  On <span className="font-medium">This fight only</span>, your players' log starts
                  fresh each time you begin a fight and clears when it ends. Yours keeps everything.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="player-view-timers"
                  className="text-sm text-slate-700 dark:text-slate-200"
                >
                  Fight clocks
                </label>
                <select
                  id="player-view-timers"
                  value={playerView.timers}
                  onChange={(e) => {
                    track(EVENTS.playerViewChanged)
                    onSetPlayerView({ ...playerView, timers: e.target.value as FieldVisibility })
                  }}
                  className={SELECT}
                >
                  <option value="shown">Shown</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="player-view-recap"
                    className="text-sm text-slate-700 dark:text-slate-200"
                  >
                    End-of-fight summary
                  </label>
                  <select
                    id="player-view-recap"
                    value={playerView.recap}
                    onChange={(e) => {
                      track(EVENTS.playerViewChanged)
                      onSetPlayerView({ ...playerView, recap: e.target.value as FieldVisibility })
                    }}
                    className={SELECT}
                  >
                    <option value="shown">Shown</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Your players see the summary of the fight while you have it open.
                </p>
              </div>
            </div>
          </section>

          <section
            role="tabpanel"
            aria-labelledby="settings-tab-importer"
            hidden={tab !== 'importer'}
            className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
          >
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
              OpenFray Importer turns a D&amp;D Beyond creature page into an OpenFray creature you
              can add to your library, so you never retype a stat block.
            </p>
            <div className="flex flex-wrap gap-2">
              <ImporterLink href={IMPORTER_CHROME_URL}>Get it for Chrome</ImporterLink>
              <ImporterLink href={IMPORTER_FIREFOX_URL}>Get it for Firefox</ImporterLink>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
