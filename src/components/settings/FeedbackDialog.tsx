// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useState, type FormEvent } from 'react'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_LIMITS,
  feedbackDraft,
  feedbackText,
  feedbackDetailsText,
  type FeedbackCategory,
  type FeedbackDetails,
  type FeedbackResult,
} from '../../feedback/index.ts'
import { feedbackDetails, submitFeedback } from '../../state/feedback.ts'
import { Modal } from '../ui/Modal.tsx'
import { Button, LinkButton } from '../ui/primitives.tsx'
import { SHARE_FIELD, SHARE_LABEL } from '../share/sharePieces.tsx'
import { TurnstileChallenge } from '../share/TurnstileChallenge.tsx'
import { turnstileConfigured } from '../../lib/turnstile.ts'
import { DialogFocus } from '../ui/DialogFocus.tsx'

/** Keep an ephemeral feedback draft and route security reports privately through the same form. */
export function FeedbackDialog({
  open,
  onClose,
  counts,
}: {
  open: boolean
  onClose: () => void
  counts: Pick<FeedbackDetails, 'creatures' | 'players' | 'npcs'>
}) {
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [expected, setExpected] = useState('')
  const [details, setDetails] = useState<FeedbackDetails | undefined>()
  const [challenge, setChallenge] = useState('')
  const [reset, setReset] = useState(0)
  const [unavailable, setUnavailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [error, setError] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [result, setResult] = useState<FeedbackResult | null>(null)
  const challengeFailed = useCallback(() => setUnavailable(true), [])
  const challengeReceived = useCallback((token: string) => {
    setChallenge(token)
    if (token) setUnavailable(false)
  }, [])
  const security = category === 'security'
  const draft = {
    category,
    title,
    description,
    ...(category === 'bug' ? { expected, details } : {}),
  }

  /** Warn about an in-flight submission before dismissing the modal. */
  function close() {
    if (busy) {
      setConfirmClose(true)
      return
    }
    setResult(null)
    setChallenge('')
    setReset((value) => value + 1)
    onClose()
  }

  /** Validate the draft and verification token, then preserve input on every failure. */
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!feedbackDraft(draft)) {
      setError('Enter a title and description within the field limits.')
      return
    }
    if (!turnstileConfigured || unavailable || !challenge) {
      setError('Verification is unavailable or incomplete. Try again later, or report manually.')
      return
    }
    setError('')
    setCopyMessage('')
    setBusy(true)
    const response = await submitFeedback(draft, challenge)
    setBusy(false)
    setConfirmClose(false)
    setChallenge('')
    setReset((value) => value + 1)
    if (response.result === 'failed') {
      setError('Sending wasn’t confirmed. Try again later, or report manually.')
      return
    }
    setResult(response)
    setTitle('')
    setDescription('')
    setExpected('')
    setDetails(undefined)
  }

  /** Copy the current report for manual submission without publishing it. */
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${feedbackText(draft)}`)
      setCopyMessage('Feedback copied.')
    } catch {
      setCopyMessage('Couldn’t copy. Select and copy the fields manually.')
    }
  }

  if (!open) return null
  return (
    <DialogFocus>
      <Modal title="Share feedback" onClose={close}>
        {confirmClose && (
          <div className="mb-3 space-y-2 rounded border border-amber-300 p-3" role="alert">
            <p className="text-sm">
              Feedback is still being sent. Closing won’t cancel submission.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setConfirmClose(false)
                  onClose()
                }}
              >
                Close anyway
              </Button>
              <Button onClick={() => setConfirmClose(false)}>Keep open</Button>
            </div>
          </div>
        )}
        {result && result.result !== 'failed' ? (
          <div className="space-y-3" role="status">
            <p>
              {result.result === 'issue' ? 'Feedback posted on GitHub.' : 'Feedback sent by email.'}
            </p>
            <div className="flex flex-wrap items-stretch gap-2">
              {result.result === 'issue' && (
                <LinkButton
                  variant="secondary"
                  size="md"
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </LinkButton>
              )}
              <Button variant="primary" size="md" onClick={close}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3" aria-busy={busy}>
            <fieldset disabled={busy} className="space-y-3">
              <div>
                <label htmlFor="feedback-category" className={SHARE_LABEL}>
                  Category
                </label>
                <select
                  id="feedback-category"
                  className={SHARE_FIELD}
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value as FeedbackCategory)
                    setDetails(undefined)
                    setError('')
                    setCopyMessage('')
                  }}
                >
                  {FEEDBACK_CATEGORIES.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {security
                  ? 'Security feedback is emailed privately to reports@openfray.app. It never goes to GitHub.'
                  : 'Your feedback becomes a public GitHub issue. Don’t include private information. If GitHub is unavailable, it is emailed to reports@openfray.app.'}
              </p>
              <div>
                <label htmlFor="feedback-title" className={SHARE_LABEL}>
                  Title
                </label>
                <input
                  id="feedback-title"
                  className={SHARE_FIELD}
                  value={title}
                  required
                  maxLength={FEEDBACK_LIMITS.title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="feedback-description" className={SHARE_LABEL}>
                  Description
                </label>
                <textarea
                  id="feedback-description"
                  className={SHARE_FIELD}
                  value={description}
                  required
                  maxLength={FEEDBACK_LIMITS.description}
                  rows={5}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              {category === 'bug' && (
                <>
                  <div>
                    <label htmlFor="feedback-expected" className={SHARE_LABEL}>
                      Expected behavior (optional)
                    </label>
                    <textarea
                      id="feedback-expected"
                      className={SHARE_FIELD}
                      value={expected}
                      maxLength={FEEDBACK_LIMITS.expected}
                      rows={3}
                      onChange={(event) => setExpected(event.target.value)}
                    />
                  </div>
                  <label className="tap flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!details}
                      onChange={(event) =>
                        setDetails(event.target.checked ? feedbackDetails(counts) : undefined)
                      }
                    />
                    Include technical details
                  </label>
                  {details && (
                    <pre className="whitespace-pre-wrap break-words rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
                      {feedbackDetailsText(details)}
                    </pre>
                  )}
                </>
              )}
            </fieldset>
            <TurnstileChallenge
              onToken={challengeReceived}
              resetKey={reset}
              onUnavailable={challengeFailed}
            />
            {unavailable && !error && (
              <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                Verification isn’t available. Try again later, or report manually.
              </p>
            )}
            {error && (
              <div className="space-y-2" role="alert">
                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={copy}>Copy feedback</Button>
                  <LinkButton
                    href={
                      security
                        ? 'mailto:reports@openfray.app'
                        : 'https://github.com/OpenFrayApp/console/issues/new'
                    }
                    target={security ? undefined : '_blank'}
                    rel="noreferrer"
                  >
                    {security ? 'Email report' : 'Report on GitHub'}
                  </LinkButton>
                </div>
              </div>
            )}
            {copyMessage && (
              <p role="status" className="text-sm">
                {copyMessage}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? 'Sending…' : error ? 'Try again' : 'Send feedback'}
              </Button>
              <Button onClick={close}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
    </DialogFocus>
  )
}
