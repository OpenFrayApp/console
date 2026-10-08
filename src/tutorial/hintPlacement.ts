// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

export interface HintBoundary {
  left: number
  top: number
  right: number
  bottom: number
}

/** Place a hint outside its task surface, falling back to the reserved bottom dock. */
export function placeTutorialHint(
  viewport: HintBoundary,
  hint: { width: number; height: number },
  target: HintBoundary | null,
): { left: number; top: number; docked: boolean } {
  /** Keep horizontal placement within the safe viewport. */
  const clampX = (left: number) =>
    Math.max(viewport.left, Math.min(left, viewport.right - hint.width))
  /** Keep vertical placement within the safe viewport. */
  const clampY = (top: number) =>
    Math.max(viewport.top, Math.min(top, viewport.bottom - hint.height))
  if (
    target &&
    target.right > viewport.left &&
    target.left < viewport.right &&
    target.bottom > viewport.top &&
    target.top < viewport.bottom
  ) {
    const candidates = [
      { left: target.right + 12, top: clampY(target.top) },
      { left: target.left - hint.width - 12, top: clampY(target.top) },
      { left: clampX(target.left), top: target.bottom + 12 },
      { left: clampX(target.left), top: target.top - hint.height - 12 },
    ]
    const fit = candidates.find(
      (candidate) =>
        candidate.left >= viewport.left &&
        candidate.top >= viewport.top &&
        candidate.left + hint.width <= viewport.right &&
        candidate.top + hint.height <= viewport.bottom,
    )
    if (fit) return { ...fit, docked: false }
  }
  return {
    left: clampX((viewport.left + viewport.right - hint.width) / 2),
    top: clampY(viewport.bottom - hint.height),
    docked: true,
  }
}
