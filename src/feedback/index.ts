// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

export const FEEDBACK_CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature request' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' },
  { value: 'unsure', label: 'Not sure' },
  { value: 'security', label: 'Security' },
] as const

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]['value']
export const FEEDBACK_LIMITS = {
  title: 256,
  description: 5_000,
  expected: 2_000,
  requestBytes: 40_960,
}

export interface FeedbackDetails {
  browser: string
  os: string
  viewport: string
  creatures: number
  players: number
  npcs: number
}

export interface FeedbackDraft {
  category: FeedbackCategory
  title: string
  description: string
  expected?: string
  details?: FeedbackDetails
}

export type FeedbackResult =
  { result: 'issue'; url: string } | { result: 'email' } | { result: 'failed' }

/** Resolve the canonical user-facing name for a validated feedback category. */
export function feedbackCategoryLabel(category: FeedbackCategory): string {
  return FEEDBACK_CATEGORIES.find((entry) => entry.value === category)!.label
}

/** Validate and project only the authored feedback and explicitly allowed technical details. */
export function feedbackDraft(value: unknown): FeedbackDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (!FEEDBACK_CATEGORIES.some((category) => category.value === row.category)) return null
  if (
    typeof row.title !== 'string' ||
    !row.title.trim() ||
    row.title.length > FEEDBACK_LIMITS.title ||
    /[\r\n]/.test(row.title)
  )
    return null
  if (
    typeof row.description !== 'string' ||
    !row.description.trim() ||
    row.description.length > FEEDBACK_LIMITS.description
  )
    return null
  const draft: FeedbackDraft = {
    category: row.category as FeedbackCategory,
    title: row.title.trim(),
    description: row.description.trim(),
  }
  if (draft.category !== 'bug') return draft
  if (row.expected !== undefined) {
    if (typeof row.expected !== 'string' || row.expected.length > FEEDBACK_LIMITS.expected)
      return null
    draft.expected = row.expected.trim()
  }
  if (row.details !== undefined) {
    if (!row.details || typeof row.details !== 'object' || Array.isArray(row.details)) return null
    const details = row.details as Record<string, unknown>
    const { browser, os, viewport, creatures, players, npcs } = details
    if (
      [browser, os, viewport].some(
        (field) => typeof field !== 'string' || field.length > 100 || /[\r\n]/.test(field),
      )
    )
      return null
    if (
      [creatures, players, npcs].some(
        (count) =>
          typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 || count > 100_000,
      )
    )
      return null
    draft.details = { browser, os, viewport, creatures, players, npcs } as FeedbackDetails
  }
  return draft
}

/** Render exactly the technical details shown before an opted-in submission. */
export function feedbackDetailsText(details: FeedbackDetails): string {
  return [
    `Browser: ${details.browser}`,
    `Operating system: ${details.os}`,
    `Viewport: ${details.viewport}`,
    `Creatures on board: ${details.creatures}`,
    `Player characters on board: ${details.players}`,
    `Nonplayer characters on board: ${details.npcs}`,
  ].join('\n')
}

/** Render the same feedback body for GitHub, email, and the manual copy action. */
export function feedbackText(draft: FeedbackDraft): string {
  const category = feedbackCategoryLabel(draft.category)
  const lines = [`Category: ${category}`, '', draft.description]
  if (draft.category === 'bug' && draft.expected)
    lines.push('', 'Expected behavior:', draft.expected)
  if (draft.category === 'bug' && draft.details) {
    lines.push('', 'Technical details:', feedbackDetailsText(draft.details))
  }
  return lines.join('\n')
}
