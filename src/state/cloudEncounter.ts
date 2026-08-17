// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { supabase } from '../lib/supabase.ts'
import type { Encounter } from '../schema/encounter.ts'

/**
 * Cloud persistence for signed-in users: the live encounter is one autosaved
 * JSONB blob in the `encounters` table, isolated to the owner by Row-Level
 * Security (the database checks `owner_id = auth.uid()`, never this code). The
 * local-first pattern is unchanged — the UI mutates in memory and renders at once;
 * these calls run in the background. Anonymous users never reach here (the client
 * is null), so their state stays in `sessionStorage`.
 */

/**
 * What the load found. `empty` and `failed` are kept apart on purpose: they used to
 * both come back as null, and the caller read that as "this user has no row" and
 * inserted one — so a single failed read orphaned the GM's encounter and started a
 * duplicate. A failure now says so, and the caller declines to write rather than
 * guessing.
 */
export type LoadedEncounter =
  | { status: 'loaded'; id: string; encounter: Encounter; playerCode: string | null }
  | { status: 'empty' }
  | { status: 'failed' }

/**
 * The user's most recent **live** encounter.
 *
 * The table holds two kinds of row now: the one autosaved fight, and the fights the Game
 * Master has saved to come back to (below). Only the live one is hydrated at startup, so
 * the filter is what stops a saved snapshot being mistaken for the session in progress.
 *
 * A project that hasn't had the `kind` column added yet answers `42703`, and the query runs
 * again without the filter — every row is a live one there, so the old behaviour is exactly
 * right. Going dark on the GM's fight because a deploy step is pending would be the worst
 * possible way to fail.
 */
export async function loadCloudEncounter(): Promise<LoadedEncounter> {
  if (!supabase) return { status: 'failed' }
  const newest = () =>
    supabase!
      .from('encounters')
      .select('id, state, player_code')
      .order('updated_at', { ascending: false })
      .limit(1)
  let { data, error } = await newest().eq('kind', 'live').maybeSingle()
  if (error && MISSING_SCHEMA.includes((error as { code?: string }).code ?? '')) {
    ;({ data, error } = await newest().maybeSingle())
  }
  if (error) return { status: 'failed' }
  if (!data) return { status: 'empty' }
  return {
    status: 'loaded',
    id: data.id,
    encounter: data.state as Encounter,
    playerCode: (data.player_code as string | null) ?? null,
  }
}

/**
 * How a claim went. `unavailable` is the deployment case — the column the codes live in
 * hasn't been added to this project yet — and it matters because retrying will never
 * fix it, so the GM shouldn't be told to try again.
 */
export type ClaimResult = 'ok' | 'taken' | 'unavailable' | 'failed'

/** Postgres: no such column, or no such table. The schema change hasn't been applied. */
const MISSING_SCHEMA = ['42703', '42P01']

/**
 * Claim a share code for this GM's encounter row. Uniqueness is a database index, and
 * the write is how we ask: Row-Level Security stops one GM from ever *reading*
 * another's row, so a lookup would come back empty and wrongly call every name free.
 * A `23505` unique violation is the real answer, and it settles a race between two GMs
 * claiming the same name at the same moment without a read policy or a round trip.
 */
export async function claimPlayerCode(id: string, code: string): Promise<ClaimResult> {
  if (!supabase) return 'unavailable'
  const { error } = await supabase.from('encounters').update({ player_code: code }).eq('id', id)
  if (!error) return 'ok'
  const pg = (error as { code?: string }).code
  if (pg === '23505') return 'taken'
  return pg && MISSING_SCHEMA.includes(pg) ? 'unavailable' : 'failed'
}

/**
 * Upsert the encounter. With an `id` it updates that row; without one it inserts
 * (owner_id auto-fills from the session) and returns the new id to reuse. Returns
 * the row id, or the passed id on failure — persistence is best-effort, never a
 * gatekeeper for the UI.
 *
 * `kind` is deliberately not written here: the column defaults to `live`, so the autosave
 * keeps working unchanged on a project where the column hasn't been added yet. Sending it
 * would turn a pending deploy step into a fight that stops saving.
 */
export async function saveCloudEncounter(
  id: string | null,
  encounter: Encounter,
): Promise<string | null> {
  if (!supabase) return id
  const updatedAt = new Date().toISOString()
  if (id) {
    const { error } = await supabase
      .from('encounters')
      .update({ state: encounter, updated_at: updatedAt })
      .eq('id', id)
    return error ? id : id
  }
  const { data, error } = await supabase
    .from('encounters')
    .insert({ state: encounter, updated_at: updatedAt })
    .select('id')
    .single()
  return error || !data ? null : (data.id as string)
}

/**
 * Saved fights: the same table, the same blob, `kind = 'saved'`.
 *
 * A saved fight is the whole encounter as it stood — player characters, hit points, effects,
 * the log — so a Game Master running several campaigns can come back to Tuesday's game and
 * find the board where they left it. That is why it reuses the live row's shape rather than
 * inventing one: "everything as it was" is the JSONB we already autosave, and a second shape
 * would be a second thing to keep in step with the combat schema.
 *
 * Every row still carries `owner_id` and the database still enforces it. Nothing here relaxes
 * that boundary; it only adds rows the loader above declines to hydrate.
 */

/** How a write went. `unavailable` means the deploy step is pending, so retrying won't help. */
export type WriteResult = 'ok' | 'unavailable' | 'failed'

/** A saved fight as the list shows it — the blob stays in the database until it's restored. */
export interface SavedFightSummary {
  id: string
  name: string
  /** The campaign it was saved under, so restoring can bring its house rules back. */
  campaignId: string | null
  /** When it was saved, ISO — the list's second line. */
  savedAt: string
}

/** What the list found, keeping "none saved" and "not deployed yet" apart. */
export type SavedFights =
  { status: 'ok'; fights: SavedFightSummary[] } | { status: 'unavailable' } | { status: 'failed' }

/** Read a Postgres error code out of whatever Supabase handed back. */
const pgCode = (error: unknown): string => (error as { code?: string } | null)?.code ?? ''

/** Whether an error is the schema not being there yet, rather than a real failure. */
const isMissingSchema = (error: unknown): boolean => MISSING_SCHEMA.includes(pgCode(error))

/** Turn a write's error into a result the UI can say something true about. */
const wrote = (error: unknown): WriteResult =>
  !error ? 'ok' : isMissingSchema(error) ? 'unavailable' : 'failed'

/** Every fight this user has saved, newest first. */
export async function listSavedFights(): Promise<SavedFights> {
  if (!supabase) return { status: 'unavailable' }
  const { data, error } = await supabase
    .from('encounters')
    .select('id, name, campaign_id, updated_at')
    .eq('kind', 'saved')
    .order('updated_at', { ascending: false })
  if (error) return isMissingSchema(error) ? { status: 'unavailable' } : { status: 'failed' }
  return {
    status: 'ok',
    fights: (data ?? []).map((row) => ({
      id: row.id as string,
      name: (row.name as string | null) ?? 'Untitled',
      campaignId: (row.campaign_id as string | null) ?? null,
      savedAt: row.updated_at as string,
    })),
  }
}

/**
 * Save the fight as it stands, as a new row. Always an insert: saving twice keeps both, so
 * "save before the boss" and "save after" are two things to come back to rather than one
 * overwriting the other.
 */
export async function saveFight(
  name: string,
  encounter: Encounter,
  campaignId: string | null,
): Promise<WriteResult> {
  if (!supabase) return 'unavailable'
  const { error } = await supabase.from('encounters').insert({
    kind: 'saved',
    name,
    campaign_id: campaignId,
    state: encounter,
    updated_at: new Date().toISOString(),
  })
  return wrote(error)
}

/** The saved blob, to restore onto the board. Null when it's gone or unreadable. */
export async function loadSavedFight(id: string): Promise<Encounter | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('encounters')
    .select('state')
    .eq('id', id)
    .eq('kind', 'saved')
    .maybeSingle()
  return error || !data ? null : (data.state as Encounter)
}

/** Rename a saved fight. */
export async function renameSavedFight(id: string, name: string): Promise<WriteResult> {
  if (!supabase) return 'unavailable'
  const { error } = await supabase
    .from('encounters')
    .update({ name })
    .eq('id', id)
    .eq('kind', 'saved')
  return wrote(error)
}

/**
 * Delete a saved fight. The `kind` filter is what keeps a stray id from taking the live row
 * with it — Row-Level Security scopes this to the owner, but the owner's own session is
 * exactly who could delete the wrong one.
 */
export async function deleteSavedFight(id: string): Promise<WriteResult> {
  if (!supabase) return 'unavailable'
  const { error } = await supabase.from('encounters').delete().eq('id', id).eq('kind', 'saved')
  return wrote(error)
}
