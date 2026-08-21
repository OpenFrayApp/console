// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
} from 'react'
import { cx } from '../../lib/cx.ts'
import { FIELD_W } from './fieldStyles.ts'

/**
 * The console's interface primitives. Every button, chip, field and select in the app
 * is one of these, so the same thing looks the same everywhere — the class strings
 * used to be pasted per component and had drifted apart in padding, radius, weight,
 * and which of them bothered with a dark hover.
 */

/**
 * What a button is for. `quiet` is the underlined text link a dialog closes with;
 * `link` is the indigo "+ Add another row" link in a form, where size sets only the
 * text size (`sm` → text-xs, `md` → text-sm).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet' | 'link'

/** `sm` for dense rows, `md` everywhere else, `lg` for a page's own call to action. */
export type ButtonSize = 'sm' | 'md' | 'lg'

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'rounded px-2 py-1 text-xs font-medium',
  md: 'rounded-md px-3 py-1.5 text-sm font-medium',
  lg: 'rounded-md px-4 py-2 text-sm font-semibold',
}

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
  secondary:
    'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
  // Applying damage and deleting are the irreversible steps, so they're outlined
  // rather than filled — present, but never the brightest thing on screen.
  danger:
    'border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/50',
  quiet: 'text-slate-500 hover:underline dark:text-slate-400',
  link: 'text-indigo-600 hover:underline dark:text-indigo-400',
}

/**
 * The look both Button and LinkButton wear, so the two can never drift apart. Every
 * one of them clears the 44px touch floor on a coarse pointer: the sizes above are
 * drawn for a mouse (`sm` is 26px tall), and this is the single place that holds for
 * the whole app.
 */
function buttonClass(variant: ButtonVariant, size: ButtonSize) {
  const base =
    variant === 'quiet'
      ? 'text-sm'
      : variant === 'link'
        ? size === 'sm'
          ? 'text-xs'
          : 'text-sm'
        : `${BUTTON_SIZE[size]} disabled:opacity-50`
  // A label belongs on one line, and this is where that is said. Setting it on a
  // container instead leaks into every popover and modal rendered from inside it.
  return cx('tap-y whitespace-nowrap', base, BUTTON_VARIANT[variant])
}

/** A button. Pick the variant by what pressing it does, the size by how dense the row is. */
export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={cx(buttonClass(variant, size), className)} {...rest} />
}

/**
 * A link wearing the Button look, for the controls that have to be an anchor — only a
 * real link opens a new tab, and a button can only imitate one.
 */
export function LinkButton({
  variant = 'secondary',
  size = 'md',
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <a className={cx(buttonClass(variant, size), className)} {...rest} />
}

/**
 * The square icon-only header button (the settings gear, the player-view screen, the
 * board's corner controls). `active` is the emerald "on" state the share control
 * lights up with; layout extras (`relative`, …) ride on className.
 */
export function IconButton({
  size = 9,
  active = false,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: 8 | 9; active?: boolean }) {
  return (
    <button
      type={type}
      className={cx(
        'tap flex items-center justify-center rounded-md border disabled:opacity-50',
        size === 8 ? 'h-8 w-8' : 'h-9 w-9',
        active
          ? 'border-emerald-400 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300'
          : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
        className,
      )}
      {...rest}
    />
  )
}

/** How a chip reads once it's on: the outcome it stands for. */
export type ChipTone = 'selected' | 'good' | 'bad' | 'warn'

const CHIP_TONE: Record<ChipTone, string> = {
  selected: 'border-indigo-400 text-indigo-700 dark:border-indigo-500 dark:text-indigo-300',
  good: 'border-emerald-400 text-emerald-700 dark:text-emerald-300',
  bad: 'border-rose-400 text-rose-700 dark:text-rose-300',
  warn: 'border-amber-400 text-amber-700 dark:border-amber-700 dark:text-amber-300',
}

const CHIP_OFF =
  'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

/**
 * A small bordered toggle: a target, a condition, a save's outcome. `sm` is for a
 * resolved row that has to stay on one line; `md` is the tap target everywhere else.
 */
export function Chip({
  active = false,
  tone = 'selected',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  tone?: ChipTone
  size?: 'sm' | 'md'
}) {
  return (
    <button
      type={type}
      className={cx(
        'rounded border',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
        active ? `font-medium ${CHIP_TONE[tone]}` : CHIP_OFF,
        'disabled:opacity-50',
        className,
      )}
      {...rest}
    />
  )
}

/**
 * One button in a tab strip, filled while its tab is the open one. Put the strip in a
 * `role="tablist"` and give each button the id its panel points back at.
 */
export function TabButton({
  active,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cx(
        'rounded-md px-2.5 py-1 text-sm font-medium',
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        className,
      )}
      {...rest}
    />
  )
}

// The shared field base; Field/Select stay in step with every form's inputs.
const CONTROL = FIELD_W

/** A text input. Width is the caller's — everything else matches every other field. */
export function Field({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL, className)} {...rest} />
}

/** A select, sized and bordered like Field so a row of both lines up. */
export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(CONTROL, className)} {...rest} />
}

/**
 * The one badge: a source, an edition, "Custom", a challenge rating. The caller passes
 * the text and the color classes — `librarySourceBadgeClass` / `editionBadgeClass` and
 * friends — and everything else (radius, padding, weight, size) is the same everywhere,
 * so a badge in the compendium list, the Settings panel and every picker match.
 */
export function Badge({
  tone,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: string }) {
  return (
    <span
      className={cx('rounded px-1.5 py-0.5 text-[10px] font-medium', tone, className)}
      {...rest}
    />
  )
}

/** The indigo "Custom" tone, for anything the Game Master authored themselves. */
export const CUSTOM_TONE =
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'

/**
 * The badge set every list row and picker row carries, in one order: Custom, then where
 * it came from, then which edition. Rendering these separately per list is how they
 * drifted — the compendium showed all three, the campaign list showed bare text, the
 * preset list showed only a source.
 */
export function EntryBadges({
  custom = false,
  source,
  sourceTone,
  edition,
  editionTone,
}: {
  /** The Game Master's own work, rather than a library's. */
  custom?: boolean
  /** Compact source label ("Core", "ToB3", "B&B"); absent on custom entries. */
  source?: string
  sourceTone?: string
  /** Edition label ("5.5e" / "5e"). */
  edition?: string
  editionTone?: string
}) {
  return (
    <>
      {custom && <Badge tone={CUSTOM_TONE}>Custom</Badge>}
      {source && <Badge tone={sourceTone}>{source}</Badge>}
      {edition && <Badge tone={editionTone}>{edition}</Badge>}
    </>
  )
}
