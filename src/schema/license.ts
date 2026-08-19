// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { LIBRARIES } from '../compendium/libraries.ts'

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

/**
 * Where the full text lives, for the licenses that have a canonical one. The OGL's is not
 * hosted anywhere we would rely on staying up, so it points at the copy this project ships
 * in CREDITS.md, which is also the copy its own section 10 requires us to distribute.
 */
export const LICENSE_URLS: Partial<Record<ContentLicense, string>> = {
  'cc0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'cc-by-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'cc-by-sa-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'cc-by-nc-4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'cc-by-nc-sa-4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  'ogl-1.0a': 'https://github.com/OpenFrayApp/console/blob/main/CREDITS.md',
}

/**
 * What each license permits, stated about the work rather than about anybody reading it.
 *
 * Impersonal on purpose. This text is shown to whoever opens a shared link, and "you" there
 * means a stranger, while "the author" means somebody they have never met — either one puts
 * the reader in a relationship the page cannot know they are in. A license is a fact about
 * the work, so it is written as one.
 *
 * Short and plain, and orientation rather than advice: the license itself governs, which the
 * dialog says and links.
 */
export const LICENSE_TERMS: Record<ContentLicense, string[]> = {
  'cc0-1.0': ['May be used for anything, including commercially.', 'No credit required.'],
  'cc-by-4.0': [
    'May be used for anything, including commercially.',
    'Credit is required, along with a note of any changes.',
  ],
  'cc-by-sa-4.0': [
    'May be used for anything, including commercially.',
    'Credit is required, along with a note of any changes.',
    'Anything derived from it carries this same license.',
  ],
  'cc-by-nc-4.0': [
    'May be used for anything, but commercial use is not permitted.',
    'Credit is required, along with a note of any changes.',
  ],
  'cc-by-nc-sa-4.0': [
    'May be used for anything, but commercial use is not permitted.',
    'Credit is required, along with a note of any changes.',
    'Anything derived from it carries this same license.',
  ],
  'ogl-1.0a': [
    'Open Game Content may be reused, including commercially.',
    'Anything derived from it carries this same license.',
    'The license text and its full Section 15 chain must travel with it.',
    'Product Identity — art, names, story — is excluded.',
  ],
  reserved: [
    'May be read here.',
    'No reuse or distribution without permission from the rights holder.',
  ],
  unstated: [
    'No license has been stated.',
    'Copyright reserves everything by default, so no reuse or distribution without permission from the rights holder.',
  ],
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

/** What a compendium library's own content is published under. */
export function licenseOfSource(source: string): ContentLicense {
  const library = LIBRARIES.find((l) => l.id === source)
  if (!library) return 'unstated'
  // Kobold Press titles ship as Open Game Content; the SRD and our own books are CC-BY.
  // `group` is the settings-panel grouping, and it happens to split exactly this way —
  // asserted by a test, so a fourth group can't quietly inherit the wrong answer.
  return library.group === 'other' ? 'ogl-1.0a' : 'cc-by-4.0'
}

/**
 * What a creature built from `source` may be licensed as.
 *
 * Two rules decide the whole table.
 *
 * **A CC-BY adaptation may be relicensed, in either direction.** CC BY 4.0 carries no
 * ShareAlike, and its section 3(b) contemplates an Adapter's License explicitly: whoever
 * receives the adapted material receives it under the terms the adapter applied. So a Game
 * Master who reworks an SRD goblin may release it as BY-SA, BY-NC, or reserved. What they
 * cannot do is restrict the original — the SRD goblin stays CC BY for anyone who gets it
 * from Wizards, and the attribution to the source travels whatever the derivative says.
 *
 * **CC0 is the exception, and is never offered for a derivative.** It waives everything the
 * dedicator holds, and nobody can waive the attribution the underlying CC-BY source still
 * requires. It is offered only for a creature made from nothing.
 *
 * **An OGL derivative has no choice at all.** Section 2 says no other terms may be applied
 * to Open Game Content distributed under the license, so a reworked Ghast of Leng stays OGL
 * 1.0a. The field is shown, and fixed.
 *
 * There is no ORC option because nothing in the compendium is ORC-licensed. The union is
 * extensible; add it when a source needs it.
 */
export function licensesForDerivative(source: string): ContentLicense[] {
  const of = licenseOfSource(source)
  if (of === 'ogl-1.0a') return ['ogl-1.0a']
  return LICENSES_FROM_SCRATCH.filter((l) => l !== 'cc0-1.0')
}

/**
 * What a creature effectively carries: what its author said, or failing that what its
 * source is published under. A library creature nobody has edited has no `license` of its
 * own and does not need one — the book it came from answers for it.
 */
export function effectiveLicense(creature: {
  source: string
  license?: ContentLicense
}): ContentLicense {
  return creature.license ?? licenseOfSource(creature.source)
}

/**
 * What a creature built *from another creature* may be licensed as.
 *
 * Keyed on the base's effective license rather than on its library, so a derivative of
 * somebody else's shared homebrew is constrained by what that person said rather than by
 * where they happened to get it. Everything but Open Game Content lands on the same set:
 * anything except CC0, which is never a derivative's to give.
 */
export function licensesForDerivativeOf(creature: {
  source: string
  license?: ContentLicense
}): ContentLicense[] {
  if (effectiveLicense(creature) === 'ogl-1.0a') return ['ogl-1.0a']
  return LICENSES_FROM_SCRATCH.filter((l) => l !== 'cc0-1.0')
}

/** Whether the derivative's license is the source's to dictate rather than the author's. */
export function licenseIsFixed(source: string): boolean {
  return licensesForDerivative(source).length === 1
}

/** Why it is fixed, in one sentence, for the form that shows the field disabled. */
export const OGL_FIXED_REASON =
  'The creature you are starting from is licensed under OGL 1.0a. Your creature must use ' +
  'the same license.'

/**
 * What a pasted stat block should be assumed to be under, from the book it names.
 *
 * The importer reads D&D Beyond, where all but one kind of content is a published book
 * somebody bought. So the assumption runs the safe way: all rights reserved, unless the
 * source clearly names the free rules. Guessing loose would put a license on somebody
 * else's book that its publisher never gave; guessing strict costs a Game Master one
 * dropdown on a creature that was theirs to relabel anyway.
 *
 * The exception is what Wizards publishes under CC BY: the SRD, which D&D Beyond labels as
 * the Basic Rules or the free rules. Matched on the words those pages actually use and
 * nothing looser, since "rules" alone appears in half the titles on the site.
 *
 * This is an assumption, not a finding. A Game Master who knows better changes it in the
 * editor, and a payload stating its own license is believed rather than guessed at.
 */
const FREE_RULES = /\b(basic rules|free rules|system reference document|srd)\b/i

export function licenseOfImportedSource(source: string): ContentLicense {
  return FREE_RULES.test(source) ? 'cc-by-4.0' : 'reserved'
}

/**
 * Whether this creature may be published to a link.
 *
 * The one bar is that it came from outside the console: the browser extension reads paid
 * books, and putting that on a public URL is republishing somebody else's content under our
 * domain. That is a copyright question, and it is ours.
 *
 * What a creature says about *reuse* is not a bar. A Game Master who marks their own work
 * all rights reserved and then publishes it has done nothing contradictory — reserved means
 * nobody else may reuse it, not that its author may not show it. What they do with their own
 * creatures is their business.
 */
export function mayShare(creature: { imported?: boolean }): boolean {
  return creature.imported !== true
}

/**
 * Whether a reader may take a copy of this — add it to their own board and library — as
 * against read what is on the page.
 *
 * Two licenses say no, and they say it for the same reason. `reserved` is an author asking
 * that nobody reuse it. `unstated` is nobody having said anything, which copyright answers
 * by reserving everything by default: an absent license grants nothing, so it cannot be
 * read as permission. The difference between them is what somebody meant, not what a reader
 * may do.
 *
 * Everything else was published under terms that permit reuse, including every library
 * creature, whose book already answered this.
 */
export function mayCopy(creature: { source: string; license?: ContentLicense }): boolean {
  const effective = effectiveLicense(creature)
  return effective !== 'reserved' && effective !== 'unstated'
}

/**
 * Whether a value off a payload or a stored blob is one of ours.
 *
 * `Object.hasOwn` rather than `in`, which walks the prototype chain: `'toString'` and
 * `'constructor'` are `in` every object, and this reads strings a stranger sent.
 */
export function isContentLicense(value: unknown): value is ContentLicense {
  return typeof value === 'string' && Object.hasOwn(LICENSE_LABELS, value)
}

/**
 * The strictest term among several, for the "using this as a whole" line on a shared
 * encounter.
 *
 * `unstated` outranks everything: one undeclared creature makes the whole summary unknown,
 * because a reader has nothing to go on for that piece. OGL sits outside the order — it is
 * not more or less restrictive than the Creative Commons terms, it is a different license
 * with its own obligations — so an encounter mixing it with anything else reads as mixed
 * and sends the reader to each creature.
 *
 * This is a summary of what is present, never a grant. Aggregating a BY-SA creature into an
 * encounter is a collection rather than an adaptation and does not force ShareAlike onto the
 * assembly, so the line it feeds says "the most restrictive term among these" rather than
 * naming a license the encounter does not have.
 */
export type LicenseSummary =
  { kind: 'single'; license: ContentLicense } | { kind: 'mixed' } | { kind: 'unknown' }

/** Loosest first. `unstated` and `ogl-1.0a` are handled before this is consulted. */
const STRICTNESS: ContentLicense[] = [
  'cc0-1.0',
  'cc-by-4.0',
  'cc-by-sa-4.0',
  'cc-by-nc-4.0',
  'cc-by-nc-sa-4.0',
  'reserved',
]

/** The strictest term present, or why there isn't one. */
export function summarizeLicenses(licenses: readonly ContentLicense[]): LicenseSummary {
  if (licenses.length === 0) return { kind: 'unknown' }
  if (licenses.includes('unstated')) return { kind: 'unknown' }

  const ogl = licenses.filter((l) => l === 'ogl-1.0a')
  const rest = licenses.filter((l) => l !== 'ogl-1.0a')
  if (ogl.length && rest.length) return { kind: 'mixed' }
  if (ogl.length) return { kind: 'single', license: 'ogl-1.0a' }

  let strictest = rest[0]
  for (const l of rest) {
    if (STRICTNESS.indexOf(l) > STRICTNESS.indexOf(strictest)) strictest = l
  }
  return { kind: 'single', license: strictest }
}
