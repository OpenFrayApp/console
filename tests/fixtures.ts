// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

// Shared test fixtures for the component suites: override-based factories for the
// canonical Goblin template, its combatant, a lightweight PC, the canonical
// Fireball, and a stubbed AuthState. Bespoke shapes stay in their own test files;
// these carry only the boilerplate every suite repeats.

import { vi } from 'vitest'
import type { Creature } from '../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../src/schema/combatant.ts'
import type { Spell } from '../src/schema/spell.ts'
import type { AuthState } from '../src/auth/useAuth.ts'

/** The canonical Goblin template (AC 15, 7 HP, DEX 14) component tests build on. */
export function creature(over: Partial<Creature> = {}): Creature {
  return {
    id: 'srd:goblin',
    source: 'srd-5.2',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp: 7,
    speed: { walk: 30 },
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    senses: { passivePerception: 9 },
    ...over,
  }
}

/** A Goblin combatant with the resource and visibility boilerplate filled in. */
export function monster(over: Partial<MonsterCombatant> = {}): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'g1',
    creatureId: 'srd:goblin',
    creature: creature(),
    label: 'Goblin (A)',
    initiative: 17,
    status: 'active',
    hp: { current: 7, max: 7, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
    ...over,
  }
}

/** A lightweight player character — no abilities, so the app never rolls for them. */
export function pc(over: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    isPC: true,
    kind: 'pc',
    combatantId: 'p1',
    name: 'Thalia',
    initiative: 18,
    ac: 16,
    status: 'active',
    hp: { current: 30, max: 30, temp: 0 },
    concentration: null,
    effects: [],
    ...over,
  }
}

/** The canonical Fireball — display fields only; overrides add mechanics. */
export function spell(over: Partial<Spell> = {}): Spell {
  return {
    id: 'srd-5.2:fireball',
    source: 'srd-5.2',
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    castingTime: 'action',
    range: '150 feet',
    components: { verbal: true, somatic: true, material: false },
    duration: 'instantaneous',
    concentration: false,
    ritual: false,
    text: '',
    ...over,
  }
}

/** A configured AuthState whose actions are vi.fn() stubs — anonymous until overridden. */
export function authState(over: Partial<AuthState> = {}): AuthState {
  return {
    user: null,
    displayName: null,
    shareLicense: null,
    loading: false,
    identityExpired: false,
    configured: true,
    signInWithProvider: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => ({ error: null })),
    setDisplayName: vi.fn(async () => ({ error: null })),
    setShareLicense: vi.fn(async () => ({ error: null })),
    ...over,
  }
}
