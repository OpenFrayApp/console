// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/**
 * The keyboard commands: what can be bound, the default chords, and the chord
 * grammar. A chord is one key, optionally with Shift and/or Ctrl; Meta and Alt
 * belong to the browser and the OS and are never consumed. Pure module — the
 * document listener lives in hooks/useHotkeys.ts, the rebinding UI in the
 * Settings panel's Keyboard tab.
 *
 * Chord strings are canonical: letters carry their modifiers as prefixes
 * (`n`, `shift+n`, `ctrl+a`, `ctrl+shift+x`); a shifted punctuation key stores
 * the character the keyboard produced (`?`, not `shift+/`), because the event's
 * key already encodes the Shift; named keys (`Delete`, `F9`, `ArrowUp`) take the
 * prefixes like letters do.
 */

export type HotkeyCommandId =
  | 'nextTurn'
  | 'prevTurn'
  | 'startCombat'
  | 'endFight'
  | 'pauseResume'
  | 'selectNext'
  | 'selectPrev'
  | 'damageSelected'
  | 'applyEffect'
  | 'concentrate'
  | 'toggleReaction'
  | 'toggleHidden'
  | 'toggleAlly'
  | 'removeSelected'
  | 'addCreature'
  | 'addPc'
  | 'quickAdd'
  | 'castSpell'
  | 'groupSave'
  | 'shortRest'
  | 'longRest'
  | 'openLog'
  | 'toggleCompendium'
  | 'focusDice'
  | 'openSettings'
  | 'showHotkeys'

/** One bindable command: its Settings/overlay label and where the list groups it. */
export interface HotkeyCommand {
  id: HotkeyCommandId
  label: string
  category:
    'Turn and encounter' | 'Selection' | 'The selected creature' | 'Add and open' | 'Everywhere'
  /** Whether holding the key repeats the command (only selection movement does). */
  repeats?: boolean
}

/** Every command, in the order the Settings tab and the overlay list them. */
export const COMMANDS: readonly HotkeyCommand[] = [
  { id: 'nextTurn', label: 'Next turn', category: 'Turn and encounter' },
  { id: 'prevTurn', label: 'Previous turn', category: 'Turn and encounter' },
  { id: 'startCombat', label: 'Start combat', category: 'Turn and encounter' },
  { id: 'endFight', label: 'End the encounter', category: 'Turn and encounter' },
  { id: 'pauseResume', label: 'Pause or resume', category: 'Turn and encounter' },
  { id: 'selectNext', label: 'Select next in the order', category: 'Selection', repeats: true },
  { id: 'selectPrev', label: 'Select previous in the order', category: 'Selection', repeats: true },
  { id: 'damageSelected', label: 'Damage or heal the selected', category: 'The selected creature' },
  {
    id: 'applyEffect',
    label: 'Apply an effect to the selected',
    category: 'The selected creature',
  },
  { id: 'concentrate', label: 'Concentrate', category: 'The selected creature' },
  { id: 'toggleReaction', label: 'Toggle reaction', category: 'The selected creature' },
  { id: 'toggleHidden', label: 'Hide from players / Show', category: 'The selected creature' },
  { id: 'toggleAlly', label: 'Make ally / Make foe', category: 'The selected creature' },
  {
    id: 'removeSelected',
    label: 'Remove the selected from the board',
    category: 'The selected creature',
  },
  { id: 'addCreature', label: 'Add creature', category: 'Add and open' },
  { id: 'addPc', label: 'Add PC', category: 'Add and open' },
  { id: 'quickAdd', label: 'Quick add', category: 'Add and open' },
  { id: 'castSpell', label: 'Cast spell', category: 'Add and open' },
  { id: 'groupSave', label: 'Group save', category: 'Add and open' },
  { id: 'shortRest', label: 'Short rest', category: 'Add and open' },
  { id: 'longRest', label: 'Long rest', category: 'Add and open' },
  { id: 'openLog', label: 'Open the game log', category: 'Add and open' },
  {
    id: 'toggleCompendium',
    label: 'Show the compendium / Back to the encounter',
    category: 'Everywhere',
  },
  { id: 'focusDice', label: 'Focus the dice bar', category: 'Everywhere' },
  { id: 'openSettings', label: 'Settings', category: 'Everywhere' },
  { id: 'showHotkeys', label: 'Keyboard shortcuts', category: 'Everywhere' },
]

export const DEFAULT_HOTKEYS: Record<HotkeyCommandId, string | null> = {
  nextTurn: 'n',
  prevTurn: 'shift+n',
  startCombat: 'b',
  endFight: 'shift+b',
  pauseResume: 'p',
  selectNext: 'j',
  selectPrev: 'k',
  damageSelected: 'd',
  applyEffect: 'e',
  concentrate: 'shift+c',
  toggleReaction: 'r',
  toggleHidden: 'h',
  toggleAlly: 'f',
  removeSelected: 'Delete',
  addCreature: 'a',
  addPc: 'shift+a',
  quickAdd: 'ctrl+a',
  castSpell: 'c',
  groupSave: 'g',
  shortRest: 'shift+s',
  longRest: 'shift+l',
  openLog: 'l',
  toggleCompendium: 'm',
  focusDice: '/',
  openSettings: ',',
  showHotkeys: '?',
}

// Enter and Space activate the focused control, Tab moves focus, and Escape
// closes things — none of the four may ever carry a command.
const UNBINDABLE = new Set(['Enter', ' ', 'Tab', 'Escape'])

// Chords a page must not take from the browser. The tab/window trio isn't even
// delivered to the page, so binding one would mint a dead key; the rest are the
// clipboard, undo, save, print, find, reload, address bar, and bookmark keys.
// `ctrl+a` is deliberately absent: Quick add owns it, and the typing-surface
// guard keeps select-all working inside every text field.
const RESERVED = new Set([
  'ctrl+t',
  'ctrl+n',
  'ctrl+w',
  'ctrl+shift+t',
  'ctrl+shift+n',
  'ctrl+shift+w',
  'ctrl+c',
  'ctrl+v',
  'ctrl+x',
  'ctrl+z',
  'ctrl+y',
  'ctrl+s',
  'ctrl+p',
  'ctrl+f',
  'ctrl+r',
  'ctrl+l',
  'ctrl+d',
  'F5',
  'F11',
  'F12',
])

/** Whether the browser keeps this chord for itself (never bindable, never resolved). */
export function isReservedChord(chord: string): boolean {
  return RESERVED.has(chord)
}

/** The event's chord in canonical form, or null when it can't carry a command
 *  (Meta/Alt held, a bare modifier, or one of the unbindable keys). */
export function chordOf(e: KeyboardEvent): string | null {
  if (e.metaKey || e.altKey) return null
  const key = e.key
  if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') return null
  if (UNBINDABLE.has(key)) return null
  const ctrl = e.ctrlKey ? 'ctrl+' : ''
  if (/^[a-zA-Z]$/.test(key)) {
    return `${ctrl}${e.shiftKey ? 'shift+' : ''}${key.toLowerCase()}`
  }
  // A single non-letter character already encodes Shift ('?' is shift+/); a
  // named key (Delete, F9, ArrowUp) doesn't, so it takes the prefix.
  if (key.length === 1) return `${ctrl}${key}`
  return `${ctrl}${e.shiftKey ? 'shift+' : ''}${key}`
}

// What the physical keyboard produces these characters with, for display: the
// stored chord keeps the character, the label names the keys pressed.
const SHIFTED: Record<string, string> = {
  '?': '/',
  '!': '1',
  '@': '2',
  '#': '3',
  $: '4',
  '%': '5',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
  ')': '0',
  _: '-',
  '+': '=',
  '{': '[',
  '}': ']',
  '|': '\\',
  ':': ';',
  '"': "'",
  '<': ',',
  '>': '.',
  '~': '`',
}

const KEY_NAMES: Record<string, string> = {
  Delete: 'Del',
  Backspace: 'Bksp',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
}

/** A chord as the Settings tab and tooltips show it: `shift+n` → `Shift+N`, `?` → `Shift+/`. */
export function formatChord(chord: string): string {
  let rest = chord
  const parts: string[] = []
  if (rest.startsWith('ctrl+')) {
    parts.push('Ctrl')
    rest = rest.slice(5)
  }
  if (rest.startsWith('shift+') && rest.length > 6) {
    parts.push('Shift')
    rest = rest.slice(6)
  }
  if (rest in SHIFTED) {
    parts.push('Shift', SHIFTED[rest])
  } else if (rest in KEY_NAMES) {
    parts.push(KEY_NAMES[rest])
  } else {
    parts.push(rest.length === 1 ? rest.toUpperCase() : rest)
  }
  return parts.join('+')
}

/** Whether a stored string is a well-formed, bindable chord in the grammar. */
export function isValidChord(chord: string): boolean {
  if (typeof chord !== 'string' || chord.length === 0) return false
  let rest = chord
  if (rest.startsWith('ctrl+')) rest = rest.slice(5)
  if (rest.startsWith('shift+') && rest.length > 6) {
    rest = rest.slice(6)
    // The shift prefix belongs to letters and named keys only.
    if (!/^[a-z]$/.test(rest) && rest.length === 1) return false
  }
  if (rest.length === 0) return false
  if (UNBINDABLE.has(rest)) return false
  // A single character must be lowercase if it's a letter (canonical form).
  if (rest.length === 1) return !/[A-Z]/.test(rest)
  // A named key: as the event reports it (Delete, F9, ArrowUp).
  return /^[A-Z][a-zA-Z0-9]+$/.test(rest)
}

const COMMAND_IDS = new Set<string>(COMMANDS.map((c) => c.id))

/** Read back stored overrides: unknown commands, malformed chords, and reserved
 *  chords are dropped; `null` (explicitly unbound) is kept. */
export function sanitizeHotkeys(value: unknown): Partial<Record<HotkeyCommandId, string | null>> {
  const data = (value ?? {}) as Record<string, unknown>
  const out: Partial<Record<HotkeyCommandId, string | null>> = {}
  for (const [id, chord] of Object.entries(data)) {
    if (!COMMAND_IDS.has(id)) continue
    if (chord === null) {
      out[id as HotkeyCommandId] = null
    } else if (typeof chord === 'string' && isValidChord(chord) && !isReservedChord(chord)) {
      out[id as HotkeyCommandId] = chord
    }
  }
  return out
}

/** The full working keymap: defaults with the overrides on top, and a chord that
 *  ends up on two commands kept only by the first in COMMANDS order. */
export function resolveHotkeys(
  overrides: Partial<Record<HotkeyCommandId, string | null>>,
): Record<HotkeyCommandId, string | null> {
  const out = {} as Record<HotkeyCommandId, string | null>
  const used = new Set<string>()
  for (const { id } of COMMANDS) {
    const chord = id in overrides ? (overrides[id] ?? null) : DEFAULT_HOTKEYS[id]
    if (chord !== null && used.has(chord)) {
      out[id] = null
      continue
    }
    if (chord !== null) used.add(chord)
    out[id] = chord
  }
  return out
}

/** The command a chord triggers under the given resolved keymap, if any. */
export function commandForChord(
  bindings: Record<HotkeyCommandId, string | null>,
  chord: string,
): HotkeyCommandId | null {
  for (const { id } of COMMANDS) {
    if (bindings[id] === chord) return id
  }
  return null
}
