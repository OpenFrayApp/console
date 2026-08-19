// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState, type FormEvent } from 'react'
import type { PublishResult } from '../state/shares.ts'
import { shareUrl } from '../state/shareCode.ts'
import {
  LICENSES_FROM_SCRATCH,
  LICENSE_HINTS,
  LICENSE_LABELS,
  type ContentLicense,
} from '../schema/license.ts'
import { BylineField, PublishedLink, SHARE_FIELD, SHARE_LABEL } from './sharePieces.tsx'
import { useByline } from '../hooks/useByline.ts'
import { Modal } from './Modal.tsx'
import { Button } from './ui.tsx'

/**
 * Publishing the board's cast to a link.
 *
 * Its own file and its own component, because a dialog is a thing rather than a state of a
 * button: the trigger lives with the board's corner controls and opens this. What it asks
 * for beyond the shared pieces is what an encounter has and a creature has not — a name it
 * did not arrive with, a license covering the publisher's own words, and the creatures that
 * cannot travel at all.
 */
export function ShareEncounterDialog({
  signedIn,
  defaultByline,
  defaultLicense,
  restricted,
  canDropRestricted,
  allowReserved,
  onShare,
  onClose,
}: {
  signedIn: boolean
  /** The byline they published under last time, remembered device-locally. */
  defaultByline: string
  /** What this account publishes under by default, or `unstated` when there is no account. */
  defaultLicense: ContentLicense
  /**
   * Creatures on the board that came from outside the console. Named before the link
   * exists, because afterwards a stranger has already read them.
   */
  restricted: string[]
  /**
   * Whether anything remains once those are left out. False when they are the whole cast,
   * where publishing would put out an empty encounter.
   */
  canDropRestricted: boolean
  /**
   * Whether this account has been granted the reserved names — the app's own and the
   * maintainer's. Read from the database at sign-in, so the person it belongs to is named
   * nowhere in this repository.
   */
  allowReserved: boolean
  onShare: (draft: {
    name: string
    note: string
    by: string
    license: ContentLicense
  }) => Promise<PublishResult>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const { by, setBy, problem } = useByline(defaultByline, allowReserved)

  /**
   * The account's default fills this control; it never replaces it. The same derived-state
   * sync the byline uses, and for the same reason — the session resolves after the board has
   * rendered, so seeding once at mount would leave every signed-in Game Master on the value
   * that existed before their account did.
   */
  const [license, setLicense] = useState<ContentLicense>(defaultLicense)
  const [lastLicense, setLastLicense] = useState(defaultLicense)
  if (defaultLicense !== lastLicense) {
    setLastLicense(defaultLicense)
    if (license === lastLicense) setLicense(defaultLicense)
  }

  const [message, setMessage] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const publish = async (e: FormEvent) => {
    e.preventDefault()
    // A name is a convenience, not a requirement: a Game Master handing tonight's fight to a
    // friend has already said what it is in the message they paste the link into.
    if (busy || problem) return
    setBusy(true)
    const result = await onShare({ name: name.trim(), note: note.trim(), by: by.trim(), license })
    setBusy(false)
    if (result.status === 'ok') {
      setLink(shareUrl(result.code))
      setMessage(null)
      setName('')
      setNote('')
    } else if (result.status === 'tooBig') {
      setMessage('This encounter is too big to share. Try it without the homebrew creatures.')
    } else if (result.status === 'unavailable') {
      setMessage('Sharing isn’t set up on this server yet.')
    } else {
      setMessage('Couldn’t publish that. Try again.')
    }
  }

  return (
    <Modal
      title="Share this encounter"
      subtitle={
        link
          ? undefined
          : 'Share a public link to this encounter’s title, notes and creatures. Anyone can visit and read it. The creatures are added as they are in the compendium, not as they are on your board right now. Do not share passwords, real names, email addresses, or any other secret in the notes.'
      }
      onClose={onClose}
    >
      {!link && (
        <form onSubmit={(e) => void publish(e)} className="space-y-3">
          <div>
            <label htmlFor="share-name" className={SHARE_LABEL}>
              Name
            </label>
            <input
              id="share-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Goblin ambush"
              autoComplete="off"
              className={SHARE_FIELD}
            />
          </div>
          <div>
            <label htmlFor="share-note" className={SHARE_LABEL}>
              Note (optional)
            </label>
            <textarea
              id="share-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={6}
              placeholder="How the encounter opens, what the boss does first…"
              className={SHARE_FIELD}
            />
          </div>
          <BylineField id="share-by" value={by} onChange={setBy} problem={problem} />
          <div>
            <label htmlFor="share-license" className={SHARE_LABEL}>
              Encounter license
            </label>
            <select
              id="share-license"
              value={license}
              onChange={(e) => setLicense(e.target.value as ContentLicense)}
              className={SHARE_FIELD}
            >
              {LICENSES_FROM_SCRATCH.map((l) => (
                <option key={l} value={l}>
                  {LICENSE_LABELS[l]}
                </option>
              ))}
            </select>
            {/* Only ever the publisher's own expression. A shared encounter is a
              collection, and collecting a stat block does not relicense it — each
              creature carries what its own author said. */}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              It covers the encounter’s name, notes, and list of creatures. Each creature has their
              own, possibly different, license. {LICENSE_HINTS[license]}
            </p>
          </div>
          {!signedIn && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Signed out, the link stops working after 60 days.
            </p>
          )}
          {/* Left out rather than offered as a choice: an encounter carrying an
            imported creature would put a paid book's stat block on a public URL just as
            surely as sharing it alone would. */}
          {restricted.length > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              The following creatures are imported from official sources that OpenFray is not
              allowed to republish and they will not be included in the shared encounter:{' '}
              <strong className="font-medium">{restricted.join(', ')}</strong>.
              {!canDropRestricted && ' There is nothing left to share.'}
            </p>
          )}
          {/* The one thing publishing commits them to that no field on this form says, so
            it sits against the button rather than in a footer. A new tab, because a
            publisher who reads the terms mid-draft should come back to their note. */}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Publishing is you saying you hold the rights to this, and letting anyone with the link
            run it at their table and add its creatures to their own library. The{' '}
            <a href="/terms" target="_blank" rel="noreferrer" className="underline">
              terms
            </a>{' '}
            say the rest, including how a link comes down.
          </p>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !!problem || !canDropRestricted}
          >
            Publish
          </Button>
        </form>
      )}

      {link && (
        <PublishedLink link={link} signedIn={signedIn} onDone={onClose}>
          Published. Anyone with this link can add it to their board.
        </PublishedLink>
      )}

      {message && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300" role="status">
          {message}
        </p>
      )}
    </Modal>
  )
}
