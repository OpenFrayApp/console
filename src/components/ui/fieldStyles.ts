// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/**
 * The one field style for dense forms — inputs, selects and textareas alike, which is
 * why these are class strings rather than components. The dark background sits one
 * step lighter than the slate-900 panels, so a field keeps a visible boundary.
 */

// Width-less base, so explicit sizes (`${FIELD_W} w-16`) win cleanly in flex rows.
export const FIELD_W =
  'rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800'
export const FIELD = `w-full ${FIELD_W}`
export const LABEL =
  'text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500'
