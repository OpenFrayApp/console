// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState, type FormEvent } from 'react'
import {
  REPORT_EMAIL_MAX,
  REPORT_MAX,
  REPORT_REASONS,
  replyAddressError,
  reportShare,
  type ReportReason,
} from '../../state/reports.ts'
import { track, EVENTS } from '../../lib/analytics.ts'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/primitives.tsx'

/**
 * Reporting the encounter on screen: a reason, and room to say what's wrong.
 *
 * A reason from a list rather than a free-text subject line, because the list is what makes
 * a report readable at a glance and sortable later — and because picking one is the whole
 * effort for most reporters. The message is optional for the same reason: a report nobody
 * can be bothered to finish is a report we never get.
 *
 * Nobody is asked who they are. A report is about the encounter, and requiring a name or an
 * account would silence exactly the person most likely to be looking at something bad — so
 * the address is there for the reports that need a reply, empty by default, and the form says
 * what it is for rather than leaving them to guess.
 */
export function ReportShareDialog({ code, onClose }: { code: string; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>('spam')
  const [message, setMessage] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const badAddress = replyAddressError(replyTo)
    if (badAddress) return setError(badAddress)
    setBusy(true)
    setError(null)
    const result = await reportShare(code, reason, message.trim(), replyTo)
    setBusy(false)
    if (result === 'ok') {
      // Only the reports that landed. Counting attempts would fold a broken server into
      // the number that says how often people find something worth reporting.
      track(EVENTS.shareReported)
      setSent(true)
    } else if (result === 'unavailable') {
      // Nothing the reporter can do, and telling them to try again would waste their time.
      setError('Reporting isn’t set up on this server yet. Please email reports@openfray.app.')
    } else {
      setError('Couldn’t send that. Try again in a moment.')
    }
  }

  const field =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800'
  const label = 'mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200'

  return (
    <Modal
      title="Report this encounter"
      subtitle={
        sent
          ? undefined
          : 'It goes to the people who run OpenFray. You don’t have to say who you are.'
      }
      onClose={onClose}
    >
      {sent ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Thank you — it's been sent, and somebody will read it.
            {replyTo.trim() ? ' We’ll write back if we need to ask anything.' : ''}
          </p>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="report-reason" className={label}>
              Reason
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className={field}
            >
              {REPORT_REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-message" className={label}>
              Anything to add (optional)
            </label>
            <textarea
              id="report-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, REPORT_MAX))}
              rows={4}
              placeholder="What's wrong with it?"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="report-email" className={label}>
              Your email (optional)
            </label>
            <input
              id="report-email"
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value.slice(0, REPORT_EMAIL_MAX))}
              placeholder="bramironfist@example.com"
              autoComplete="email"
              className={field}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Used if we need to ask anything or to inform you about the report. Leave blank to stay
              anonymous.
            </p>
          </div>
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" disabled={busy}>
              Send report
            </Button>
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
