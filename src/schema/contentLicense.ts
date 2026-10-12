// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/**
 * How a stat block, or an encounter's own words, may be reused.
 *
 * This is provenance, not permission: nothing in the console is gated on it. A creature
 * with no license stated is shareable, exportable and usable exactly like any other — the
 * field records what is known about where something came from, so a reader deciding whether
 * to put it in their own book has something to read instead of a guess.
 *
 * `unstated` is a real state and the common one. Copyright already reserves everything by
 * default, so an absent license is not "free to use" and not "all rights reserved" either:
 * it is nobody having said. Every existing creature has it, and none is backfilled — a
 * guess written into somebody's data is a false claim about their work.
 */
export type ContentLicense =
  | 'cc0-1.0'
  | 'cc-by-4.0'
  | 'cc-by-sa-4.0'
  | 'cc-by-nc-4.0'
  | 'cc-by-nc-sa-4.0'
  | 'ogl-1.0a'
  | 'reserved'
  | 'unstated'

/** The label each one carries on screen. Short: these sit inline on a stat block. */
export const LICENSE_LABELS: Record<ContentLicense, string> = {
  'cc0-1.0': 'CC0 1.0',
  'cc-by-4.0': 'CC BY 4.0',
  'cc-by-sa-4.0': 'CC BY-SA 4.0',
  'cc-by-nc-4.0': 'CC BY-NC 4.0',
  'cc-by-nc-sa-4.0': 'CC BY-NC-SA 4.0',
  'ogl-1.0a': 'OGL 1.0a',
  reserved: 'All rights reserved',
  unstated: 'No public license stated',
}

/** One line saying what each one lets a reader do, for the select that offers them. */
export const LICENSE_HINTS: Record<ContentLicense, string> = {
  'cc0-1.0': 'Anyone may use it for anything, with no credit asked.',
  'cc-by-4.0': 'Anyone may use it, including commercially, if they credit you.',
  'cc-by-sa-4.0':
    'Anyone may use it, including commercially, if they credit the author, and their version has to carry the same license.',
  'cc-by-nc-4.0': 'Anyone may use it if they credit you, but not for commercial use.',
  'cc-by-nc-sa-4.0':
    'Anyone may use it if they credit you, but not for commercial use, and their version has to carry the same license.',
  'ogl-1.0a': 'Open Game Content, under the license its source was published with.',
  reserved: 'Nobody may reuse it without asking you first.',
  unstated: 'You have not specified a license. Readers should assume they need to ask.',
}

/** Everything a creature written from nothing may declare. Order is loosest to strictest. */
export const LICENSES_FROM_SCRATCH: ContentLicense[] = [
  'unstated',
  'cc0-1.0',
  'cc-by-4.0',
  'cc-by-sa-4.0',
  'cc-by-nc-4.0',
  'cc-by-nc-sa-4.0',
  'reserved',
]

/**
 * Whether a value off a payload or a stored blob is one of ours.
 *
 * `Object.hasOwn` rather than `in`, which walks the prototype chain: `'toString'` and
 * `'constructor'` are `in` every object, and this reads strings a stranger sent.
 */
export function isContentLicense(value: unknown): value is ContentLicense {
  return typeof value === 'string' && Object.hasOwn(LICENSE_LABELS, value)
}
