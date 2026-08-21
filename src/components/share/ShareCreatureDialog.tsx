// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState, type FormEvent } from 'react'
import type { Creature } from '../../schema/creature.ts'
import type { PublishResult } from '../../state/shares.ts'
import { shareUrl } from '../../state/shareCode.ts'
import {
  BylineField,
  PublishConsent,
  PublishedLink,
  SHARE_FIELD,
  SHARE_LABEL,
  SignInToShare,
} from './sharePieces.tsx'
import { shareErrorMessage } from './shareMessages.ts'
import { useByline } from '../../hooks/useByline.ts'
import { mayCopy, mayShare } from '../../schema/license.ts'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/primitives.tsx'

/**
 * Publishing one creature to a link.
 *
 * The encounter's dialog asks for a name; this one doesn't, because the creature already
 * has one and it is not the publisher's to retype here. What is left is the note and the
 * byline — and no license control at all, because a creature carries its own, stated in the
 * editor where the creature is. The share flow asks for nothing that lives somewhere else.
 */

export function ShareCreatureDialog({
  creature,
  signedIn,
  defaultByline,
  allowReserved,
  onShare,
  onSignIn,
  onClose,
}: {
  creature: Creature
  signedIn: boolean
  defaultByline: string
  /** Whether this account may publish under one of the reserved names. */
  allowReserved: boolean
  onShare: (draft: { note: string; by: string }) => Promise<PublishResult>
  /** Opens the account screen. Signed out, this dialog asks rather than publishes. */
  onSignIn: () => void
  onClose: () => void
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [publishedCode, setPublishedCode] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { by, setBy, problem } = useByline(defaultByline, allowReserved)

  /**
   * Shown instead of the form rather than hiding the control. A Game Master who imported a
   * creature and then can't find Share would conclude the feature is broken; told plainly,
   * they know it is the book's terms and not the app.
   */
  const shareable = mayShare(creature)

  const publish = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || problem) return
    setBusy(true)
    const result = await onShare({ note: note.trim(), by: by.trim() })
    setBusy(false)
    if (result.status === 'ok') {
      setLink(shareUrl(result.code))
      setPublishedCode(result.code)
      setMessage(null)
    } else {
      setMessage(
        shareErrorMessage(result, {
          noun: 'creatures',
          tooBig: 'This creature is too big to share.',
          failed: 'Couldn’t publish that. Try again in a moment.',
        }),
      )
    }
  }

  return (
    <Modal
      title={`Share ${creature.name}`}
      subtitle={
        link
          ? undefined
          : 'Share a public link to this creature’s stat block. Anyone can visit and read it. Do not share passwords, real names, email addresses, or any other secret in the notes.'
      }
      onClose={onClose}
    >
      {!shareable && (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            This creature was brought in with the{' '}
            <strong className="font-semibold">OpenFray Importer</strong>, so it can’t be shared
            publicly. It is intellectual property of Wizards of the Coast LLC, and sharing it on a
            public page would violate their rights.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            It stays yours to use at your own table.
          </p>
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      )}

      {shareable && !signedIn && (
        <SignInToShare
          what="a creature"
          onSignIn={() => {
            // Closed on the way out. The account screen opens over the app, and a dialog left
            // behind it is still there when they come back from signing in.
            onClose()
            onSignIn()
          }}
        />
      )}

      {shareable && signedIn && !link && (
        <form onSubmit={publish} className="space-y-3">
          <div>
            <label htmlFor="share-creature-note" className={SHARE_LABEL}>
              Note (optional)
            </label>
            <textarea
              id="share-creature-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="Where it came from, how to run it…"
              className={SHARE_FIELD}
            />
          </div>
          <BylineField id="share-creature-by" value={by} onChange={setBy} problem={problem} />
          {!mayCopy(creature) && (
            <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              This creature has no license that allows reuse, so whoever opens the link can read it
              but not add it to their board. Set a license in the creature editor if they should be
              able to use it.
            </p>
          )}
          <PublishConsent holds="this stat block">
            OpenFray hosts it on a page anyone can open.
          </PublishConsent>
          <Button type="submit" variant="primary" disabled={busy || !!problem}>
            Publish
          </Button>
        </form>
      )}

      {link && (
        <PublishedLink
          link={link}
          code={publishedCode ?? ''}
          name={creature.name}
          onDone={onClose}
          onUnpublished={() => {
            setLink(null)
            setPublishedCode(null)
            setMessage('Link taken down. Publishing again makes a new link.')
          }}
        >
          Published. Anyone with this link can add {creature.name} to their board.
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
