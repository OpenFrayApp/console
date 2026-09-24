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
} from 'react'
import type { Creature } from '../../schema/creature.ts'
import type { Spell } from '../../schema/spell.ts'
import { rosterAc, rosterInitiativeMod, type RosterPc } from '../../schema/roster.ts'
import { loadLibraries } from '../../compendium/srd.ts'
import { searchReferences, type ReferenceResult } from '../../compendium/search.ts'
import { resolveCondition } from '../../compendium/conditions.ts'
import { editionLabel, libraryTag, librarySource } from '../../compendium/libraries.ts'
import { useDialogFocus } from '../../hooks/useDialogFocus.ts'
import { useCampaignEdition } from '../../state/campaignRules.ts'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/primitives.tsx'
import { CreatureStatBlock } from '../statblock/CreatureStatBlock.tsx'
import { PcStatBlock } from '../statblock/PcStatBlock.tsx'
import { ConditionCard } from '../statblock/ConditionCard.tsx'
import { CastSpellPanel } from '../resolve/CastSpellPanel.tsx'

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

  useDialogFocus(root)
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
  const index = Math.min(active, Math.max(0, results.matches.length - 1))
  useEffect(() => {
    root.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [index, results])

  return (
    <div ref={root}>
      {selected?.kind === 'spell' ? (
        <CastSpellPanel {...casting} preparedSpell={selected.entry} onClosed={onClose} />
      ) : selected ? (
        <Modal title={selected.entry.name} onClose={onClose}>
          {selected.kind === 'creature' && (
            <>
              <CreatureStatBlock creature={selected.entry} />
              <Button
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
        <Modal title="Search references" onClose={onClose}>
          <input
            ref={input}
            role="combobox"
            aria-label="Search references"
            aria-autocomplete="list"
            aria-expanded={results.matches.length > 0}
            aria-controls={`${id}-results`}
            aria-activedescendant={results.matches[index] ? `${id}-${index}` : undefined}
            placeholder="Search by name…"
            value={query}
            className="my-3 w-full rounded border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-800"
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                setActive(
                  (index + (event.key === 'ArrowDown' ? 1 : -1) + results.matches.length) %
                    (results.matches.length || 1),
                )
              } else if (event.key === 'Enter' && results.matches[index]) {
                event.preventDefault()
                setSelected(results.matches[index])
              }
            }}
          />
          <div role="listbox" id={`${id}-results`} aria-label="References">
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
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {result.kind}
                  {'source' in result.entry
                    ? result.entry.id.startsWith('custom:')
                      ? ' · Custom'
                      : ` · ${librarySource(result.entry.source) ?? result.entry.source} · ${editionLabel(libraryTag(result.entry.source)) ?? ''}`
                    : ''}
                  {result.kind === 'character' && result.entry.edition
                    ? ` · ${editionLabel(result.entry.edition)}`
                    : ''}
                </span>
              </button>
            ))}
          </div>
          <p role="status" className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {!query.trim()
              ? 'Type a name to find a reference.'
              : !library && !failed
                ? 'Loading references…'
                : failed
                  ? 'Search your saved references, or retry loading the libraries.'
                  : !results.total
                    ? 'No matches. Try another name.'
                    : results.total > 10
                      ? `${results.total} matches. Refine your search to see others.`
                      : `${results.total} ${results.total === 1 ? 'match' : 'matches'}.`}
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
        </Modal>
      )}
    </div>
  )
}
