// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Encounter } from '../../src/schema/encounter.ts'
import type { SessionSnapshot } from '../../src/state/persistence.ts'

/** Build a valid encounter for recovery behavior. */
export function recoveryEncounter(id = 'local'): Encounter {
  return {
    encounterId: id,
    ownerId: null,
    round: 0,
    activeIndex: 0,
    combatants: [],
    log: [],
  }
}

/** Build a valid recovery snapshot with optional interface-state overrides. */
export function recoverySnapshot(
  id = 'local',
  overrides: Partial<SessionSnapshot> = {},
): SessionSnapshot {
  return {
    encounter: recoveryEncounter(id),
    theme: 'dark',
    view: 'encounter',
    selectedId: null,
    ...overrides,
  }
}
