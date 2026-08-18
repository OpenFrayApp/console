// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/**
 * Making a string safe to put on screen when we did not write it — not escaping (React
 * already does that), but the characters that survive escaping intact and still make a line
 * read as something else. Shared by both untrusted-input parsers.
 */

/** Control ranges, zero-width marks, and the bidi overrides that print a name backwards.
 *  Tab and newline are deliberately absent — prose keeps its lines. */
const UNSAFE_TEXT =
  /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g // eslint-disable-line no-control-regex

/** A one-line string with the tricks stripped and the edges trimmed. */
export const cleanLine = (raw: string): string =>
  raw.replace(UNSAFE_TEXT, '').replace(/\s+/g, ' ').trim()

/** Prose, which keeps its newlines but loses the same tricks. */
export const cleanProse = (raw: string): string =>
  raw
    .replace(/\r\n?/g, '\n')
    .replace(UNSAFE_TEXT, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
