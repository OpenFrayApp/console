// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { AbilityScores, Edition, Senses, Speeds } from './primitives.ts'
import type { CharacterDetails, PlayerCharacter } from './combatant.ts'

/** The 5e ability modifier for a score (10–11 → 0, 14 → +2, 8 → −1). */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * A durable player character a signed-up user keeps in their party roster — the
 * board facts the DM wants on a PC, saved once and reused across encounters.
 * Stored as one JSONB blob per row in the `players` table, isolated to the owner
 * by Row-Level Security. Anonymous users have no roster (they add ephemeral PCs to
 * the current fight instead), so they never create one of these.
 *
 * This is a *template* (like a library Creature): adding it to combat instantiates
 * a fresh, mutable {@link PlayerCharacter} via {@link rosterPcToCombatant}. Editing
 * the roster entry never touches a fight in progress.
 *
 * Still lightweight, still not a character sheet: the DM transcribes these facts;
 * the app never derives class, level, or what an ability does. The ability scores
 * are stored so a PC can carry a real Dexterity for initiative tiebreaks later.
 */
export interface RosterPc extends CharacterDetails {
  /** Stable id, generated client-side; matches the row's `data->>id`. */
  id: string
  name: string
  ac: number
  /** Maximum hit points; a fresh combatant starts at full. */
  maxHp: number
  /** Edition this PC is written for. Display metadata only; nothing branches on it. */
  edition?: Edition
  /** Passive Perception + any darkvision/blindsight/etc., like a creature's senses. */
  senses?: Senses
  languages?: string[]
  speed?: Speeds
  resistances?: string[]
  immunities?: string[]
  vulnerabilities?: string[]
  /** The six ability scores (signed-in form only). Stored, not yet derived from. */
  abilities?: AbilityScores
  /** The campaign this PC belongs to, or null/absent when unassigned. A stored tag. */
  campaignId?: string | null
}

/**
 * Instantiate a roster PC into a fresh combatant for the encounter — a new id, full
 * HP, no carried-over combat state. The template stays untouched (snapshot, don't
 * reference). The initiative modifier is derived from Dexterity; the campaign tag is
 * roster metadata and does not travel onto the combatant.
 */
export function rosterPcToCombatant(pc: RosterPc): PlayerCharacter {
  const maxHp = Math.max(1, Math.floor(pc.maxHp) || 1)
  return {
    isPC: true,
    kind: 'pc',
    combatantId: crypto.randomUUID(),
    name: pc.name,
    initiative: 0, // rolled/entered when combat begins
    initiativeMod: pc.abilities ? abilityMod(pc.abilities.dex) : 0,
    ac: Math.max(0, Math.floor(pc.ac) || 0),
    senses: pc.senses,
    languages: pc.languages,
    resistances: pc.resistances,
    immunities: pc.immunities,
    vulnerabilities: pc.vulnerabilities,
    speed: pc.speed,
    abilities: pc.abilities,
    // Carry the DM's character notes onto the combatant so the encounter shows the
    // same stat block as the compendium (display-only; the campaign tag stays behind).
    alignment: pc.alignment,
    race: pc.race,
    faith: pc.faith,
    personalityTraits: pc.personalityTraits,
    ideals: pc.ideals,
    bonds: pc.bonds,
    flaws: pc.flaws,
    backstory: pc.backstory,
    dmNotes: pc.dmNotes,
    status: 'active',
    hp: { current: maxHp, max: maxHp, temp: 0 },
    concentration: null,
    effects: [],
  }
}
