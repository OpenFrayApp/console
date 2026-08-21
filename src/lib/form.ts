// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

// Parsing for free-text form fields. Forms bind inputs as strings and convert on
// submit; these are the conversions, shared by every add/edit form. The autofill
// suppression bag lives with them, for the same fields.

/** Parse a field as a non-negative integer; blank or invalid input becomes 0. */
export const parseNonNegativeInt = (v: string): number => Math.max(0, Math.floor(Number(v) || 0))

/** Parse a field as an integer that may be negative (a modifier); blank/invalid → 0. */
export const parseSignedInt = (v: string): number => Math.floor(Number(v) || 0)

/** Split a comma-separated field into trimmed, non-empty entries. */
export const parseList = (v: string): string[] =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

/** Whether the field holds anything beyond whitespace. */
export const hasValue = (v: string): boolean => v.trim() !== ''

/** Spread on a free-text field: these are not credential fields, so keep password-manager
 *  and browser-autofill popups off them, where they would cover the inputs. */
export const NO_AUTOFILL = { autoComplete: 'off', 'data-1p-ignore': true } as const
