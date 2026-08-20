// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { rollDie } from 'opendice'
import { CODE_ALPHABET } from './playerCode.ts'

/**
 * The code in a shared link: `openfray.app/s/k7mqx3rt9p`.
 *
 * Ten characters of the ambiguity-free alphabet — about 49.5 bits — drawn one at a time with
 * the dice engine's unbiased die, the app's only piece of randomness. Nothing here counts:
 * no sequence, no timestamp, no serial column behind it (the code *is* the row's primary
 * key), so `00000001` isn't merely unlikely, it can't be spelled — neither `0` nor `1` is in
 * the alphabet.
 *
 * Ten rather than eight because a published row is a patient target: a player-view code is
 * only useful while a fight is being broadcast, and these stay readable until their
 * publisher takes them down. At eight characters and ten thousand rows, a thousand guesses a
 * second finds one in about a day; at ten it takes years.
 *
 * Codes are drawn, never chosen. The player view lets a Game Master name their link because
 * it is read aloud at the table; a name on a public store is a name a stranger can guess,
 * and the good ones would be squatted.
 */

const LENGTH = 10

/** `/s/` is the namespace for everything shared, whatever kind of thing it turns out to be. */
const PREFIX = 's'

/** Mint an unguessable share code. */
export function randomShareCode(): string {
  let out = ''
  for (let i = 0; i < LENGTH; i++) out += CODE_ALPHABET[rollDie(CODE_ALPHABET.length) - 1]
  return out
}

/**
 * Whether a string is shaped like a share code. Read off a URL before it reaches the
 * database: a code is the only thing a stranger hands us on that path.
 */
export function isShareCode(value: string): boolean {
  return (
    value.length >= 6 && value.length <= 32 && [...value].every((ch) => CODE_ALPHABET.includes(ch))
  )
}

/**
 * The link to hand out. Rooted at the site rather than under `/console/`, because it is
 * pasted where it will be read by people who have never seen the console — Cloudflare serves
 * the app for `/s/*` (see the parent repo's `scripts/assemble-site.mjs`).
 */
export function shareUrl(code: string): string {
  return `${window.location.origin}/${PREFIX}/${code}`
}

/**
 * The moderation token in the current address, or null when there isn't one.
 *
 * It arrives in the fragment of a link in a report mail, and the fragment is the point: a
 * mail scanner or a client that prefetches links fetches the URL without it, so nothing can
 * take an encounter down by merely following a link. The token reaches the database only
 * when a person clicks the control the page then offers.
 *
 * The database mints these as UUIDs, so that is the shape accepted here. Anything else is
 * read as no token at all, and the page shows an ordinary shared encounter.
 */
export function moderationTokenFromHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('m')
  return token && /^[0-9a-f-]{36}$/i.test(token) ? token : null
}

/**
 * The share code in the current address, or null when this isn't one.
 *
 * Both forms are read: the short `/s/<code>` a link carries, and `${base}s/<code>`, which the
 * existing `/console/*` fallback already serves. The second is what makes the whole flow
 * testable on the dev server and in a preview before the routing rule lands.
 */
export function shareCodeFromPath(pathname: string, base: string): string | null {
  const prefixes = [`/${PREFIX}/`, `${base}${PREFIX}/`]
  for (const prefix of prefixes) {
    if (!pathname.startsWith(prefix)) continue
    const code = pathname.slice(prefix.length).replace(/\/+$/, '').toLowerCase()
    if (isShareCode(code)) return code
  }
  return null
}
