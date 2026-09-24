// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import type { Creature } from '../../schema/creature.ts'
import type { Spell } from '../../schema/spell.ts'
import { rosterAc, rosterInitiativeMod, type RosterPc } from '../../schema/roster.ts'
import { loadLibraries } from '../../compendium/srd.ts'
import { searchReferences, type ReferenceResult } from '../../compendium/search.ts'
import { resolveCondition } from '../../compendium/conditions.ts'
import { titleCase } from '../../compendium/format.ts'
import { DialogFocus } from '../ui/DialogFocus.tsx'
import { useCampaignEdition } from '../../state/campaignRules.ts'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/primitives.tsx'
import { LibraryEntryBadges } from '../ui/LibraryEntryBadges.tsx'
import { SearchIcon } from '../icons/SearchIcon.tsx'
import { CreatureStatBlock } from '../statblock/CreatureStatBlock.tsx'
import { PcStatBlock } from '../statblock/PcStatBlock.tsx'
import { ConditionCard } from '../statblock/ConditionCard.tsx'
import { CastSpellPanel } from '../resolve/CastSpellPanel.tsx'

const KEYCAP =
  'inline-flex min-w-7 items-center justify-center rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-base leading-5 dark:border-slate-600 dark:bg-slate-800'

/** An existing console destination offered before the GM starts typing. */
export interface SearchDestination {
  id: string
  name: string
  icon: ReactNode
  href?: string
  onSelect: () => void
}

type CastingProps = Pick<
  ComponentProps<typeof CastSpellPanel>,
  'combatants' | 'dispatch' | 'onRoll' | 'onNote' | 'round' | 'defaultCasterId'
>

/** Search compendium references and open one detail surface without changing the fight. */
export function QuickSearch({
  enabledLibraries,
  showHomebrew,
  customCreatures,
  customSpells,
  characters,
  navigation = [],
  onClose,
  onAddCreature,
  onAddCharacter,
  ...casting
}: CastingProps & {
  enabledLibraries: string[]
  showHomebrew: boolean
  customCreatures: Creature[]
  customSpells: Spell[]
  characters: RosterPc[]
  navigation?: SearchDestination[]
  onClose: () => void
  onAddCreature: (creature: Creature) => void
  onAddCharacter: (character: RosterPc) => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState<ReferenceResult | null>(null)
  const [library, setLibrary] = useState<{ creatures: Creature[]; spells: Spell[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const edition = useCampaignEdition()

  useEffect(() => {
    let current = true
    loadLibraries(enabledLibraries, { strict: true }).then(
      (data) => {
        if (current) setLibrary(data)
      },
      () => {
        if (current) setFailed(true)
      },
    )
    return () => {
      current = false
    }
  }, [enabledLibraries, retry])

  useLayoutEffect(() => {
    if (!selected) input.current?.focus()
    else root.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [selected])

  const results = useMemo(
    () =>
      searchReferences(query, {
        creatures: [...(library?.creatures ?? []), ...customCreatures],
        spells: [...(library?.spells ?? []), ...customSpells],
        characters,
        enabledLibraries,
        showHomebrew,
      }),
    [query, library, customCreatures, customSpells, characters, enabledLibraries, showHomebrew],
  )
  const destinations = useMemo(
    () => [...navigation].sort((a, b) => a.name.localeCompare(b.name)),
    [navigation],
  )
  const navigating = !query.trim()
  const count = navigating ? destinations.length : results.matches.length
  const index = Math.min(active, Math.max(0, count - 1))
  useEffect(() => {
    root.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [index, results, navigating, count])

  return (
    <DialogFocus>
      <div ref={root}>
        {selected?.kind === 'spell' ? (
          <CastSpellPanel {...casting} preparedSpell={selected.entry} onClosed={onClose} />
        ) : selected ? (
          <Modal
            title={selected.entry.name}
            onClose={onClose}
            size={selected.kind === 'condition' ? 'md' : 'lg'}
            showTitle={false}
          >
            {selected.kind === 'creature' && (
              <>
                <CreatureStatBlock creature={selected.entry} />
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => {
                    onAddCreature(selected.entry)
                    onClose()
                  }}
                >
                  Add creature
                </Button>
              </>
            )}
            {selected.kind === 'character' && (
              <>
                <PcStatBlock
                  {...selected.entry}
                  subtitle={[selected.entry.race, selected.entry.alignment]
                    .filter(Boolean)
                    .join(' · ')}
                  ac={rosterAc(selected.entry)}
                  initiativeMod={rosterInitiativeMod(selected.entry)}
                  hp={{ current: selected.entry.maxHp, max: selected.entry.maxHp, temp: 0 }}
                />
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => {
                    onAddCharacter(selected.entry)
                    onClose()
                  }}
                >
                  Add to encounter
                </Button>
              </>
            )}
            {selected.kind === 'condition' && (
              <ConditionCard
                name={selected.entry.name}
                text={resolveCondition(selected.entry.name, edition)?.text ?? ''}
              />
            )}
          </Modal>
        ) : (
          <Modal
            title="Search references"
            onClose={onClose}
            header={
              <div className="quick-search-input -mx-4 -mt-4 mb-3 flex items-center gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                <SearchIcon className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
                <input
                  ref={input}
                  role="combobox"
                  aria-label="Search references"
                  aria-autocomplete="list"
                  aria-expanded={count > 0}
                  aria-controls={`${id}-results`}
                  aria-activedescendant={count > 0 ? `${id}-${index}` : undefined}
                  placeholder="Search by name…"
                  value={query}
                  className="min-w-0 flex-1 bg-transparent py-1 text-base placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setActive(0)
                  }}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault()
                      setActive(
                        (index + (event.key === 'ArrowDown' ? 1 : -1) + count) % (count || 1),
                      )
                    } else if (event.key === 'Enter' && count > 0) {
                      event.preventDefault()
                      if (navigating)
                        root.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.click()
                      else setSelected(results.matches[index])
                    }
                  }}
                />
                <Button variant="quiet" onClick={onClose}>
                  Close
                </Button>
              </div>
            }
          >
            {navigating && (
              <div className="space-y-2 px-3 py-5">
                <p className="text-sm font-medium">Creatures, spells, conditions, and characters</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Type a name to find a reference.
                </p>
                {destinations.length > 0 && (
                  <h4 className="pt-3 text-sm font-semibold">Navigate to</h4>
                )}
              </div>
            )}
            <div
              role="listbox"
              id={`${id}-results`}
              aria-label={navigating ? 'Navigate to' : 'References'}
              className="max-h-[50dvh] overflow-y-auto"
            >
              {navigating &&
                destinations.map((destination, i) => {
                  const props = {
                    role: 'option',
                    'aria-selected': i === index,
                    id: `${id}-${i}`,
                    tabIndex: -1,
                    onClick: destination.onSelect,
                    className: `tap flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm ${i === index ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`,
                  }
                  const content = (
                    <>
                      <span className="flex h-5 w-5 items-center justify-center text-slate-500 dark:text-slate-400">
                        {destination.icon}
                      </span>
                      {destination.name}
                    </>
                  )
                  return destination.href ? (
                    <a
                      key={destination.id}
                      {...props}
                      href={destination.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {content}
                    </a>
                  ) : (
                    <button key={destination.id} {...props} type="button">
                      {content}
                    </button>
                  )
                })}
              {results.matches.map((result, i) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={i === index}
                  id={`${id}-${i}`}
                  key={`${result.kind}:${result.entry.id}`}
                  tabIndex={-1}
                  onClick={() => setSelected(result)}
                  className={`tap flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm ${i === index ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <span className="min-w-0 truncate">{result.entry.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {titleCase(result.kind)}
                    </span>
                    <LibraryEntryBadges entry={result.entry} />
                  </span>
                </button>
              ))}
            </div>
            <p role="status" className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {!query.trim()
                ? ''
                : !library && !failed
                  ? 'Loading references…'
                  : failed
                    ? 'Search your saved references, or retry loading the libraries.'
                    : !results.total
                      ? 'No matches. Try another name.'
                      : ''}
            </p>
            {failed && (
              <p role="alert" className="mt-2 text-sm">
                Couldn’t load references.{' '}
                <Button
                  onClick={() => {
                    setFailed(false)
                    setRetry((n) => n + 1)
                  }}
                >
                  Try again
                </Button>
              </p>
            )}
            <div className="-mx-4 -mb-4 mt-4 flex flex-wrap gap-4 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <span className="flex gap-1">
                  <kbd className={KEYCAP}>↑</kbd>
                  <kbd className={KEYCAP}>↓</kbd>
                </span>
                to navigate
              </span>
              <span className="flex items-center gap-2">
                <kbd className={KEYCAP}>↵</kbd> to open
              </span>
            </div>
          </Modal>
        )}
      </div>
    </DialogFocus>
  )
}
