// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/**
 * The byline on anything shared — "Shared by …", typed by whoever published it.
 *
 * It is the one string a stranger writes that renders on a public page under our own name,
 * so it is held to more than a length: a character allowlist, a fold that collapses the
 * spellings of a name onto one key, and two small lists of names nobody may publish under.
 *
 * None of this is a security control. The form is the only thing these rules run in, and
 * anyone determined can write the row themselves and say whatever they like; what stops that
 * mattering is that publishing takes an account and deliberate impersonation is a takedown.
 * These rules stop accidents and lazy misuse, and they are the reason the page can render a
 * byline as plain text without thinking about it again.
 *
 * Two checks, and the split matters. **Shape** — the characters, the length, the marks — is
 * about what our page can safely render, so it holds everywhere, including when a reader's
 * console reads someone else's published encounter. **Claim** — the reserved names — is about
 * who may call themselves what, and only the publisher's own console can judge that: a reader
 * has no idea whether the person who wrote "OpenFray" was entitled to. Running the claim check
 * on the way in would drop exactly the bylines that were granted.
 *
 * Lives in `lib/` because both a form and a parser need it, and it depends on nothing.
 */

/** The most a byline may be, in characters. Long enough for a name, short enough for a line. */
export const BYLINE_MAX = 30

/**
 * Letters, digits, spaces, underscores and slashes. This is the strongest rule here because
 * it is the only one that doesn't have to anticipate the attack: script tags, `javascript:`,
 * quotes, semicolons, and anything domain-shaped all fail on a character that isn't allowed,
 * so `casino.com` never needs a list of gambling brands to be refused.
 *
 * Slashes stay because real bylines use them ("she/her", "Nico/SirDarcanos") and can't build
 * a URL without a dot. Letters are Unicode letters, so a name outside English is welcome —
 * which is what makes the confusable fold below load-bearing rather than decorative.
 */
const ALLOWED = /^[\p{L}\p{M}\p{N} _/]+$/u

/** At least one letter or digit: "___" and "/ /" are not names. */
const HAS_WORD = /[\p{L}\p{N}]/u

/** Three or more combining marks in a row — a zalgo byline towering over the header. */
const MARK_STACK = /\p{M}{3,}/u

/**
 * Letters from other scripts that look like Latin ones, mapped to what they look like. A
 * complete confusables table is a large thing to carry and to keep; this is the handful of
 * Cyrillic and Greek letters that actually let someone spell a reserved name that reads as
 * Latin on screen. It defends a fifteen-name list — it is not general Unicode security.
 *
 * This forbids nobody these letters. The fold produces a **matching key only**; the byline
 * renders exactly as it was typed, and a name genuinely written in Cyrillic or Greek keys to
 * something that matches no reserved word ("Ника" → `huka`, "Νίκος" → `vikos`). The only way
 * to land on a reserved key is to write something that already reads as that Latin name,
 * which is the case this exists for.
 */
const CONFUSABLES: Record<string, string> = {
  а: 'a',
  в: 'b',
  е: 'e',
  ё: 'e',
  з: '3',
  и: 'u',
  к: 'k',
  м: 'm',
  н: 'h',
  о: 'o',
  р: 'p',
  с: 'c',
  т: 't',
  у: 'y',
  х: 'x',
  ѕ: 's',
  і: 'i',
  ј: 'j',
  ԁ: 'd',
  ѵ: 'v',
  α: 'a',
  β: 'b',
  ε: 'e',
  ζ: 'z',
  η: 'n',
  ι: 'i',
  κ: 'k',
  ν: 'v',
  ο: 'o',
  ρ: 'p',
  σ: 's',
  ς: 's',
  τ: 't',
  υ: 'u',
  χ: 'x',
  ϲ: 'c',
}

/** Fold the lookalikes onto Latin, so a Cyrillic o can't spell a reserved name. */
const fold = (text: string): string => text.replace(/[^\p{ASCII}]/gu, (ch) => CONFUSABLES[ch] ?? ch)

/**
 * The key a byline is matched on: one string per name, whatever the spelling. NFKC first
 * (so fullwidth and other compatibility forms become their plain letters), lowercased,
 * stripped of diacritics, lookalikes folded, `&` read as "and", and everything that isn't a
 * letter or a digit dropped — spaces included.
 *
 * So `D&D`, `D and D` and `d.&.d` all key to `dandd`, and `N i c o`, `n_i_c_o` and `Nicо`
 * with a Cyrillic o all key to `nico`.
 */
export function bylineKey(raw: string): string {
  return fold(
    raw
      .normalize('NFKC')
      .toLowerCase()
      .replace(/&/g, 'and')
      .normalize('NFD')
      .replace(/\p{M}/gu, ''),
  ).replace(/[^a-z0-9]/g, '')
}

/** The byline's words, for the whole-word lists: the same fold, split on everything else. */
function bylineWords(raw: string): string[] {
  return fold(
    raw
      .normalize('NFKC')
      .toLowerCase()
      .replace(/&/g, 'and')
      .normalize('NFD')
      .replace(/\p{M}/gu, ''),
  )
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/**
 * Names refused only when the byline **is** one of them. These are words an innocent name
 * can contain, so matching them anywhere would refuse Dominico, Nicolas and The Wizards. A
 * byline that is exactly `DnD` claims to be the trademark holder, and on our domain that
 * reads as endorsement; `DnD with Bob` is a blogger naming the game they play.
 */
const RESERVED_EXACT = new Set(['official', 'wizards', 'wotc', 'dnd', 'dandd', 'nico', 'nicola'])

/**
 * Names refused **anywhere** in the byline, because nothing innocent contains them. This is
 * what stops "Nico Mustone GM" and "SirDarcanos Presents", which exact matching would wave
 * through; it costs nothing, because no real name has these strings inside it.
 */
const RESERVED_ANYWHERE = [
  'openfray',
  'wizardsofficial',
  'wizardsofthecoast',
  'dungeonsanddragons',
  // Both stems, because the fold reads `&` as "and": "DnD Beyond" keys to `dndbeyond` and
  // "D&D Beyond" to `danddbeyond`, and only listing one would let the other through.
  'dndbeyond',
  'danddbeyond',
  'dndofficial',
  'danddofficial',
  'nicolamustone',
  'nicomustone',
  'sirdarcanos',
]

/**
 * Words that would embarrass the page this renders on: explicit sexual terms and gambling.
 * Matched as **whole words**, and short on purpose.
 *
 * The trap to avoid is this genre's own vocabulary. Succubus, Incubus, Cockatrice, Bugbear
 * and half the fiends are legitimate words in a creator's name — "Cockatrice Press" is a
 * perfectly plausible small publisher — so none of that is here, and whole-word matching
 * keeps a stray substring from deciding otherwise ("ass" inside "assassin" is the classic).
 *
 * Racial and ethnic slurs are deliberately **not** enumerated here. A partial list gives
 * false confidence, a complete one across languages is a project of its own, and either way
 * the answer to someone determined is the report link and a deleted row — not a word list.
 */
const DENIED_WORDS = new Set([
  'porn',
  'porno',
  'pornhub',
  'xxx',
  'sex',
  'sexcam',
  'nude',
  'nudes',
  'escort',
  'escorts',
  'onlyfans',
  'casino',
  'casinos',
  'betting',
  'bet365',
  'slots',
  'jackpot',
  'poker',
  'gambling',
  'wager',
])

/**
 * Whether a byline is *renderable*: the character allowlist, the length, no stack of marks,
 * and nothing this page would be embarrassed to print. Null when it's fine.
 *
 * This is the half a reader's console applies to somebody else's published encounter, so it
 * asks only about the string itself — never about who is entitled to it.
 */
export function bylineShapeError(raw: string): string | null {
  const byline = raw.replace(/\s+/g, ' ').trim()
  if (byline.length === 0) return null
  if ([...byline].length > BYLINE_MAX) return `Keep the byline under ${BYLINE_MAX} characters.`
  if (!ALLOWED.test(byline)) {
    return 'Use letters, numbers, spaces, underscores and slashes only.'
  }
  if (!HAS_WORD.test(byline)) return 'Use at least one letter or number.'
  if (MARK_STACK.test(byline)) return 'That byline has too many marks stacked on one letter.'

  const words = bylineWords(byline)
  if (words.some((word) => DENIED_WORDS.has(word)) || DENIED_WORDS.has(bylineKey(byline))) {
    return 'That name can’t be published here. Use your own.'
  }
  return null
}

/**
 * Why this byline can't be published, in words the publisher can act on, or null when it's
 * fine. An empty byline is fine and means no byline at all — "Shared by" simply doesn't
 * render.
 *
 * `allowReserved` lifts the reserved-name check for a publisher the database has granted it
 * to — the person those names actually belong to. It is a capability the app is *told about*
 * at sign-in, never a name or an id written down here: this file stays readable by anyone
 * without saying who anybody is.
 */
export function bylineError(raw: string, { allowReserved = false } = {}): string | null {
  const shape = bylineShapeError(raw)
  if (shape) return shape

  const byline = raw.replace(/\s+/g, ' ').trim()
  if (byline.length === 0) return null

  // A byline written in a script the fold doesn't touch — Japanese, Arabic, Hebrew, Thai —
  // keys to nothing, and that is not a fault: there is simply no Latin word here to compare
  // against the lists, so there is nothing to refuse. The shape check already made sure it
  // has a letter in it. Treating an empty key as an error would have banned every writing
  // system the reserved names aren't written in.
  const key = bylineKey(byline)
  if (!key || allowReserved) return null

  if (RESERVED_EXACT.has(key) || RESERVED_ANYWHERE.some((name) => key.includes(name))) {
    return 'That name is reserved. Publish under your own.'
  }
  return null
}
