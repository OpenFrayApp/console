// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { AttackResolver } from './AttackResolver.tsx'
import { SaveResolver } from './SaveResolver.tsx'
import type { ResolverProps } from './resolverShared.ts'

/**
 * Resolve a creature's action against the board. Attacks pick one target, roll
 * to-hit, then editable damage to apply. Save / area actions pick any
 * number of targets, resolve each save (monsters auto-roll; the GM records a PC's
 * own roll), and apply per-target damage. Monster resistances/immunities are
 * applied automatically; a PC's are the GM's to enter. Damage is never applied
 * without a press, and conditions can be applied to the affected targets.
 */
export function ActionResolver(props: ResolverProps) {
  return props.action.toHit != null ? <AttackResolver {...props} /> : <SaveResolver {...props} />
}
