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
  | {
      status: 'loaded'
      id: string
      encounter: Encounter
      playerCode: string | null
      revision: number | null
      updatedAt: string
    }
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
  const newest = (columns: string) =>
    supabase!.from('encounters').select(columns).order('updated_at', { ascending: false }).limit(1)
  let { data, error } = await newest('id, state, player_code, revision, updated_at')
    .eq('kind', 'live')
    .maybeSingle()
  if (error && MISSING_SCHEMA.includes((error as { code?: string }).code ?? '')) {
    ;({ data, error } = await newest('id, state, player_code, updated_at')
      .eq('kind', 'live')
      .maybeSingle())
  }
  if (error && MISSING_SCHEMA.includes((error as { code?: string }).code ?? '')) {
    ;({ data, error } = await newest('id, state, player_code, updated_at').maybeSingle())
  }
  if (error) return { status: 'failed' }
  if (!data) return { status: 'empty' }
  const row = data as unknown as Record<string, unknown>
  return {
    status: 'loaded',
    id: row.id as string,
    encounter: row.state as Encounter,
    playerCode: (row.player_code as string | null) ?? null,
    revision: typeof row.revision === 'number' ? row.revision : null,
    updatedAt: row.updated_at as string,
  }
}

/**
 * How a claim went. `unavailable` is the deployment case — the column the codes live in
 * hasn't been added to this project yet — and it matters because retrying will never
 * fix it, so the GM shouldn't be told to try again.
 */
export type ClaimResult = 'ok' | 'taken' | 'unavailable' | 'failed'

/**
 * No such column, or no such table: the schema change hasn't been applied.
 *
 * Both dialects, because two things answer. Postgres raises `42703`/`42P01` when a statement
 * reaches it; PostgREST answers `PGRST204`/`PGRST205` out of its own schema cache without
 * asking the database at all, and in practice the cache answers first. Only the Postgres
 * codes were listed here, which is fine for a claim that fails but not for the `kind` filter
 * below — a project mid-deploy would have been told its live fight was simply gone.
 */
const MISSING_SCHEMA = ['42703', '42P01', 'PGRST204', 'PGRST205']

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

/** The result of acquiring or replacing one encounter's active writer lease. */
export type CloudLeaseResult =
  | { status: 'acquired'; revision: number; leaseToken: string }
  | { status: 'read-only'; revision: number }
  | { status: 'identity-expired' }
  | { status: 'failed' }

/** Every authoritative outcome from an atomic revision write. */
export type CloudWriteResult =
  | { status: 'saved'; id: string; revision: number; leaseToken: string }
  | { status: 'stale'; revision: number }
  | { status: 'lease-lost'; revision: number }
  | { status: 'identity-expired' }
  | { status: 'failed' }

/** Whether a provider error means the authenticated identity can no longer write. */
function identityExpired(error: unknown): boolean {
  const candidate = error as { code?: string; status?: number } | null
  return candidate?.code === '28000' || candidate?.code === 'PGRST301' || candidate?.status === 401
}

/** Accept one bounded lease response from the database function. */
function leaseResult(data: unknown, error: unknown): CloudLeaseResult {
  if (error) return identityExpired(error) ? { status: 'identity-expired' } : { status: 'failed' }
  if (!data || typeof data !== 'object') return { status: 'failed' }
  const result = data as Record<string, unknown>
  if (
    result.status === 'acquired' &&
    typeof result.revision === 'number' &&
    typeof result.leaseToken === 'string'
  ) {
    return { status: 'acquired', revision: result.revision, leaseToken: result.leaseToken }
  }
  if (result.status === 'read-only' && typeof result.revision === 'number') {
    return { status: 'read-only', revision: result.revision }
  }
  return { status: 'failed' }
}

/** Ask the database for writer authority without displacing a current lease. */
export async function acquireCloudWriter(id: string, clientId: string): Promise<CloudLeaseResult> {
  if (!supabase) return { status: 'failed' }
  const { data, error } = await supabase.rpc('claim_encounter_writer', {
    want_encounter: id,
    want_writer: clientId,
  })
  return leaseResult(data, error)
}

/** Explicitly checkpoint the cloud copy and replace its current writer lease. */
export async function takeOverCloudWriter(id: string, clientId: string): Promise<CloudLeaseResult> {
  if (!supabase) return { status: 'failed' }
  const { data, error } = await supabase.rpc('takeover_encounter_writer', {
    want_encounter: id,
    want_writer: clientId,
  })
  return leaseResult(data, error)
}

/** Persist one compare-and-swap revision while the caller holds the writer lease. */
export async function saveCloudEncounter(
  ownerId: string,
  id: string | null,
  expectedRevision: number,
  writerId: string,
  encounter: Encounter,
  updatedAt = new Date().toISOString(),
): Promise<CloudWriteResult> {
  if (!supabase) return { status: 'failed' }
  const { data, error } = await supabase.rpc('save_encounter_revision', {
    want_owner: ownerId,
    want_encounter: id,
    expected_revision: expectedRevision,
    want_writer: writerId,
    want_state: encounter,
    want_updated_at: updatedAt,
  })
  if (error) return identityExpired(error) ? { status: 'identity-expired' } : { status: 'failed' }
  if (!data || typeof data !== 'object') return { status: 'failed' }
  const result = data as Record<string, unknown>
  if (
    result.status === 'saved' &&
    typeof result.id === 'string' &&
    typeof result.revision === 'number' &&
    typeof result.leaseToken === 'string'
  ) {
    return {
      status: 'saved',
      id: result.id,
      revision: result.revision,
      leaseToken: result.leaseToken,
    }
  }
  if (
    (result.status === 'stale' || result.status === 'lease-lost') &&
    typeof result.revision === 'number'
  ) {
    return { status: result.status, revision: result.revision }
  }
  return { status: 'failed' }
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

/**
 * Surface a failed write without throwing — the UI has already moved on, and the Game Master
 * is told in words that something didn't land. The console line is what says *why*: a policy,
 * a constraint, a column. Swallowing it means the next person to hit this has nothing to go
 * on but "try again", which is the failure `cloudPlayers` already learned to avoid.
 */
function warn(action: string, error: unknown): void {
  if (error) console.error(`[openfray] ${action} failed`, error)
}

/** Whether an error is the schema not being there yet, rather than a real failure. */
const isMissingSchema = (error: unknown): boolean => MISSING_SCHEMA.includes(pgCode(error))

/** Turn a write's error into a result the UI can say something true about. */
const wrote = (action: string, error: unknown): WriteResult => {
  if (!error) return 'ok'
  if (isMissingSchema(error)) return 'unavailable'
  warn(action, error)
  return 'failed'
}

/** Every fight this user has saved, newest first. */
export async function listSavedFights(): Promise<SavedFights> {
  if (!supabase) return { status: 'unavailable' }
  const { data, error } = await supabase
    .from('encounters')
    .select('id, name, campaign_id, updated_at')
    .eq('kind', 'saved')
    .order('updated_at', { ascending: false })
  if (error) {
    if (isMissingSchema(error)) return { status: 'unavailable' }
    warn('listing saved fights', error)
    return { status: 'failed' }
  }
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
  // A unique violation here can only be the old one-row-per-account index still standing:
  // a saved fight is by definition a second row for this owner. That is a deploy step, not
  // a passing failure, so it reads as "not set up" rather than sending the Game Master
  // round the retry loop for ever. (See the index swap in local/saved-encounters.sql.)
  if (pgCode(error) === '23505') {
    warn('saving a fight', error)
    return 'unavailable'
  }
  return wrote('saving a fight', error)
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
  warn('reading a saved fight', error)
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
  return wrote('renaming a saved fight', error)
}

/**
 * Delete a saved fight. The `kind` filter is what keeps a stray id from taking the live row
 * with it — Row-Level Security scopes this to the owner, but the owner's own session is
 * exactly who could delete the wrong one.
 */
export async function deleteSavedFight(id: string): Promise<WriteResult> {
  if (!supabase) return 'unavailable'
  const { error } = await supabase.from('encounters').delete().eq('id', id).eq('kind', 'saved')
  return wrote('deleting a saved fight', error)
}
