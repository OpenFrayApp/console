// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { supabase } from '../lib/supabase.ts'

/**
 * Reporting a published encounter.
 *
 * A report is a row before it is an email. The console is a static app with no server of its
 * own, so it cannot send mail — and a `mailto:` asked the reporter to own the problem: it
 * opens whatever mail client the machine has, loses the code and the reason unless they type
 * them, and does nothing at all on a phone with no mail account set up.
 *
 * So the form writes a row, and the database sends the mail (a webhook on insert; see
 * `local/saved-encounters.sql`). If the mail hop is ever misconfigured the report is still
 * *there* — which is the right way round for the one feature whose whole job is not to lose
 * what somebody took the trouble to tell us.
 *
 * Writing goes through a `security definer` function rather than a table policy: a reporter
 * needs to insert one row and to read nothing at all, and a function is the only shape that
 * says exactly that.
 *
 * There is deliberately no "take mine down" option here, and the reason is that it could
 * never be honoured. An anonymous publisher leaves no identity on the shares row — that is
 * the point of the table — so a claim of ownership arriving through this form is
 * unverifiable, and offering the option would promise something nobody can act on. A
 * publisher who wants that guarantee signs in, and their links are listed on their account
 * with an Unpublish beside each. Everyone else's expire at 60 days.
 *
 * What a report does reach is a person, who gets a one-click takedown in the mail and uses
 * it when the encounter itself warrants it, rather than because somebody said it was theirs.
 *
 * A reply address is optional and stays optional. Most reports need no conversation, and
 * demanding one would silence the person most likely to be looking at something bad; but
 * some do — "which creature?", "where did you see it?" — and there is no way back without it.
 */

/** Why someone is reporting an encounter. The value stored; the label is the form's. */
export type ReportReason =
  'spam' | 'sexual' | 'hate' | 'impersonation' | 'copyright' | 'takedown' | 'other'

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'sexual', label: 'Sexual or explicit content' },
  { value: 'hate', label: 'Hate or harassment' },
  { value: 'impersonation', label: 'Pretending to be someone else' },
  { value: 'copyright', label: 'Copied from a published book' },
  { value: 'other', label: 'Something else' },
]

/** The most a report may say. Long enough to explain, short enough to read. */
export const REPORT_MAX = 1000

/** The most an address may be, which is more than any real one. */
export const REPORT_EMAIL_MAX = 254

/**
 * Whether this looks like an address worth replying to — one @, something either side, a dot
 * in the domain. Deliberately loose: the cost of refusing a real address is a report nobody
 * can follow up, and the cost of accepting a fake one is a bounced reply.
 */
export function replyAddressError(raw: string): string | null {
  const email = raw.trim()
  if (!email) return null
  if (email.length > REPORT_EMAIL_MAX) return 'That address is too long.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That doesn’t look like an email address.'
  return null
}

export type ReportResult = 'ok' | 'unavailable' | 'failed'

/** Postgres and PostgREST both answer when the function isn't deployed yet. */
const MISSING_SCHEMA = ['42883', '42P01', 'PGRST202', 'PGRST205']

/**
 * File a report against one published encounter.
 *
 * The code travels with it, so nobody has to copy a link out of the address bar, and the
 * reporter is never asked who they are: a report is about the encounter.
 */
export async function reportShare(
  code: string,
  reason: ReportReason,
  message: string,
  replyTo = '',
): Promise<ReportResult> {
  if (!supabase) return 'unavailable'
  const { error } = await supabase.rpc('report_share', {
    want: code,
    why: reason,
    note: message.slice(0, REPORT_MAX),
    reply_to: replyTo.trim().slice(0, REPORT_EMAIL_MAX) || null,
  })
  if (!error) return 'ok'
  const pg = (error as { code?: string }).code ?? ''
  if (MISSING_SCHEMA.includes(pg)) return 'unavailable'
  console.error('[openfray] reporting a share failed', error)
  return 'failed'
}
