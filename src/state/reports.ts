// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { REPORT_LIMITS, REPORT_REASONS, type ReportReason } from '../publication/index.ts'

export { REPORT_REASONS, type ReportReason }

/** The most a report may say. Long enough to explain, short enough to read. */
export const REPORT_MAX = REPORT_LIMITS.messageCharacters

/** The most an address may be, which is more than any real one. */
export const REPORT_EMAIL_MAX = REPORT_LIMITS.replyCharacters

/** Whether an optional reply address has the minimum shape needed for delivery. */
export function replyAddressError(raw: string): string | null {
  const email = raw.trim()
  if (!email) return null
  if (email.length > REPORT_EMAIL_MAX) return 'That address is too long.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That doesn’t look like an email address.'
  return null
}

export type ReportResult = 'ok' | 'unavailable' | 'failed'

/** File a report through the deployment-owned challenge and abuse boundary. */
export async function reportShare(
  code: string,
  reason: ReportReason,
  message: string,
  replyTo: string,
  challenge: string,
): Promise<ReportResult> {
  try {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code,
        reason,
        message: message.slice(0, REPORT_MAX),
        replyTo: replyTo.trim().slice(0, REPORT_EMAIL_MAX),
        challenge,
      }),
    })
    if (response.status === 201) return 'ok'
    return response.status === 503 ? 'unavailable' : 'failed'
  } catch {
    console.error('[openfray] reporting a share failed')
    return 'failed'
  }
}
