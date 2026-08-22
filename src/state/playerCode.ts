// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { rollDie } from 'opendice'

/**
 * The share code in a player-view link. A signed-in GM chooses one and keeps it; an
 * anonymous GM gets a random one. The code is the only thing standing between a
 * stranger and a read-only view of the fight, which is a trade the GM makes knowingly
 * when they pick a name they can read aloud at the table.
 */

export const PLAYER_CODE_MIN = 3
export const PLAYER_CODE_MAX = 32

/**
 * No 0/o, 1/l/i — a random code gets read off one screen and typed into another. Shared
 * with the share codes in `shareCode.ts`, so the app has one alphabet rather than two that
 * drift.
 */
export const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const ALPHABET = CODE_ALPHABET
const RANDOM_LENGTH = 10

/** Names that would make a confusing link, so nobody claims them. */
const RESERVED = new Set(['play', 'new', 'admin', 'console', 'docs', 'openfray'])

/**
 * Mint an unguessable code for a GM who hasn't chosen one — ten characters of the
 * ambiguity-free alphabet, about 49 bits. Drawn with the dice engine's unbiased die
 * so there is only ever one piece of randomness in the app; it isn't a roll in the
 * game sense, so it doesn't go through `roll()`.
 */
export function randomPlayerCode(): string {
  let out = ''
  for (let i = 0; i < RANDOM_LENGTH; i++) out += ALPHABET[rollDie(ALPHABET.length) - 1]
  return out
}

/**
 * The canonical form of a code the GM typed: lowercase, spaces and underscores as
 * hyphens, runs collapsed, edges trimmed. Uniqueness is checked on this, so
 * "Tuesday Game" and "tuesday-game" are the same claim.
 */
export function normalizePlayerCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Why a chosen code can't be used, in words the GM can act on, or null when it's fine.
 * Runs on the normalized form, so it judges what would actually be claimed.
 */
export function playerCodeError(raw: string): string | null {
  const code = normalizePlayerCode(raw)
  if (code.length === 0) return 'Give the link a name — letters, numbers and hyphens.'
  if (code.length < PLAYER_CODE_MIN) return `Use at least ${PLAYER_CODE_MIN} characters.`
  if (code.length > PLAYER_CODE_MAX) return `Keep it under ${PLAYER_CODE_MAX} characters.`
  if (RESERVED.has(code)) return 'That name is reserved. Try another.'
  return null
}

/**
 * A typed code as it should appear while it is being typed: the same rules as
 * `normalizePlayerCode`, minus the trailing-hyphen trim that would make "tuesday-game"
 * impossible to type. Applied on every keystroke so a character that could never
 * survive a claim never reaches the field, and the length the reader counts is the
 * length that is checked.
 */
export function filterPlayerCodeInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
}

/**
 * The full link to hand to the table: `openfray.app/p/<code>`.
 *
 * Rooted at the site rather than under `/console/`, because this is a link read aloud at a
 * table and pasted into a chat, by people who are not opening the console. Cloudflare serves
 * the app for `/p/*` (see the parent repo's `scripts/assemble-site.mjs`).
 */
export function playerViewUrl(code: string): string {
  return `${playerViewPrefix()}${code}`
}

/**
 * Everything in that link before the code — `openfray.app/p/`. The share control shows
 * it as text beside the field that edits the code, so one control is the link and the
 * name at once.
 */
export function playerViewPrefix(): string {
  return `${window.location.origin}/p/`
}

/**
 * The code in the current address, or null when this isn't a player-view link. The console
 * is served under a catch-all fallback, so the path is all there is to read — there is no
 * router.
 *
 * Three forms, and the third is why there is no redirect rule anywhere. `/p/<code>` is what
 * links carry now; `${base}p/<code>` is the same thing under the app's own base path, which
 * the existing `/console/*` fallback already serves and which makes this testable on the dev
 * server; and `${base}play/<code>` is what links carried before the move. Anonymous codes
 * live in `localStorage` and never reach the database, so a signed-out Game Master still
 * holds the same code they pasted somewhere durable — this line is what keeps that link
 * alive, and it can be deleted in a release or two.
 */
export function playerCodeFromPath(pathname: string, base: string): string | null {
  for (const prefix of ['/p/', `${base}p/`, `${base}play/`]) {
    if (!pathname.startsWith(prefix)) continue
    const code = normalizePlayerCode(pathname.slice(prefix.length).replace(/\/+$/, ''))
    if (code.length > 0) return code
  }
  return null
}
