// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import {
  feedbackDraft,
  type FeedbackDetails,
  type FeedbackDraft,
  type FeedbackResult,
} from '../feedback/index.ts'

/** Collect bounded browser facts and board counts without retaining the user agent or board contents. */
export function feedbackDetails(
  counts: Pick<FeedbackDetails, 'creatures' | 'players' | 'npcs'>,
): FeedbackDetails {
  const ua = navigator.userAgent
  const browser =
    /Edg\/[\d.]+/.exec(ua)?.[0] ??
    /Firefox\/[\d.]+/.exec(ua)?.[0] ??
    /Chrome\/[\d.]+/.exec(ua)?.[0] ??
    (/Safari\//.test(ua)
      ? /Version\/[\d.]+/.exec(ua)?.[0]?.replace('Version', 'Safari')
      : undefined) ??
    'Other'
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS / iPadOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Macintosh|Mac OS/.test(ua)
          ? 'macOS / iPadOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Other'
  return {
    browser: browser.slice(0, 100),
    os,
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    ...counts,
  }
}

/** Submit validated feedback through the anonymous deployment boundary without leaking extra state. */
export async function submitFeedback(
  draft: FeedbackDraft,
  challenge: string,
): Promise<FeedbackResult> {
  const input = feedbackDraft(draft)
  if (!input || !challenge) return { result: 'failed' }
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...input, challenge }),
      signal: AbortSignal.timeout(20_000),
    })
    if (response.status !== 201) return { result: 'failed' }
    const result: unknown = await response.json()
    if (!result || typeof result !== 'object') return { result: 'failed' }
    const row = result as Record<string, unknown>
    if (row.result === 'email') return { result: 'email' }
    if (
      input.category !== 'security' &&
      row.result === 'issue' &&
      typeof row.url === 'string' &&
      /^https:\/\/github\.com\/OpenFrayApp\/console\/issues\/\d+$/.test(row.url)
    )
      return { result: 'issue', url: row.url }
  } catch {
    // Provider and network details can contain report content; expose only the failure state.
  }
  return { result: 'failed' }
}
