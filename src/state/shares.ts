// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { supabase } from '../lib/supabase.ts'
import { TEMPLATE_LIMITS } from '../schema/encounterTemplate.ts'
import { randomShareCode } from './shareCode.ts'

/**
 * Published shares: the one table behind every `/s/<code>` link.
 *
 * It is deliberately unlike everything else in `state/`. Those tables hold what a Game
 * Master owns and Row-Level Security keeps each row to its owner; this one holds what a Game
 * Master has decided to hand out, so **anyone may insert** — signed in or not — and a row
 * carries an owner only when there was one to carry.
 *
 * That is not a hole in rule 8. What that rule protects is the fight: an anonymous session
 * still never reaches the database. A published encounter is not a fight — no hit points, no
 * effects, no log, no session — it is prep, decontextualised on purpose and published on
 * purpose. The privacy that matters is preserved: nothing about a board, and no identity
 * unless the publisher had one.
 *
 * Reading is by code through a `security definer` function, never a select policy: a policy
 * that lets a stranger read one row by code lets them list every row, and these are
 * Game-Master-authored. The owner policies are for the publisher's own list and unpublish,
 * and both compare against `auth.uid()`, which is null for an anonymous client — and
 * `null = null` is not true, so a signed-out client matches no row at all.
 *
 * `kind` is what makes `/s/` a namespace rather than a prefix: a shared creature or campaign
 * later is a new kind and a new branch in the page, not a second table or URL shape.
 */

export type ShareKind = 'encounter'

/** How a publish went. `tooBig` is the one the Game Master can act on by trimming. */
export type PublishResult =
  | { status: 'ok'; code: string }
  | { status: 'tooBig' }
  | { status: 'unavailable' }
  | { status: 'failed' }

/** What a code resolved to. `missing` is a code that never existed, or has expired. */
export type FetchedShare =
  | { status: 'ok'; kind: string; data: unknown }
  | { status: 'missing' }
  | { status: 'unavailable' }
  | { status: 'failed' }

/** A link the signed-in publisher can copy again or take down. */
export interface ShareSummary {
  code: string
  name: string
  createdAt: string
}

/**
 * The schema change hasn't been applied yet: no such table, column or function.
 *
 * Two dialects, because two things answer. Postgres raises `42P01`/`42703`/`42883` when a
 * statement reaches it; PostgREST answers `PGRST202`/`PGRST204`/`PGRST205` from its own
 * schema cache without ever asking the database. In practice the cache answers first — a
 * missing table comes back as `PGRST205` and never as `42P01` — so a list with only the
 * Postgres codes would tell a Game Master to try again forever.
 */
const MISSING_SCHEMA = ['42703', '42P01', '42883', 'PGRST202', 'PGRST204', 'PGRST205']

const pgCode = (error: unknown): string => (error as { code?: string } | null)?.code ?? ''
const isMissingSchema = (error: unknown): boolean => MISSING_SCHEMA.includes(pgCode(error))

/** The size of a payload as the database will measure it, in bytes rather than characters. */
const byteSize = (value: string): number => new TextEncoder().encode(value).length

/**
 * Publish something under a fresh code, and hand back the code.
 *
 * `owner_id` is never sent: the column defaults to `auth.uid()`, which stamps a signed-in
 * publisher and leaves an anonymous one null. Writing it here would be the one way a client
 * could claim to be someone else, so the client simply doesn't have an opinion.
 *
 * A `23505` means two publishers drew the same ten characters at the same moment. At 49 bits
 * that will realistically never happen; the retry costs a line and settles it if it does.
 */
export async function publishShare(kind: ShareKind, data: unknown): Promise<PublishResult> {
  if (!supabase) return { status: 'unavailable' }
  const json = JSON.stringify(data)
  // Refused here, with a sentence the Game Master can act on, rather than in Postgres as a
  // constraint violation they can't read.
  if (byteSize(json) > TEMPLATE_LIMITS.publishBytes) return { status: 'tooBig' }

  for (let attempt = 0; attempt < 2; attempt++) {
    const code = randomShareCode()
    const { error } = await supabase.from('shares').insert({ code, kind, data })
    if (!error) return { status: 'ok', code }
    if (pgCode(error) === '23505') continue
    return isMissingSchema(error) ? { status: 'unavailable' } : { status: 'failed' }
  }
  return { status: 'failed' }
}

/**
 * Read one share by its code, through the database function that returns exactly one row.
 * The caller validates the data against the kind it claims — never the other way round.
 */
export async function fetchShare(code: string): Promise<FetchedShare> {
  if (!supabase) return { status: 'unavailable' }
  const { data, error } = await supabase.rpc('share', { want: code })
  if (error) return isMissingSchema(error) ? { status: 'unavailable' } : { status: 'failed' }
  if (!data || typeof data !== 'object') return { status: 'missing' }
  const row = data as { kind?: unknown; data?: unknown }
  if (typeof row.kind !== 'string' || row.data === undefined) return { status: 'missing' }
  return { status: 'ok', kind: row.kind, data: row.data }
}

/** What the publisher's own list found; anonymous publishers have no list to find. */
export type MyShares =
  { status: 'ok'; shares: ShareSummary[] } | { status: 'unavailable' } | { status: 'failed' }

/** Every link this signed-in publisher still has up, newest first. */
export async function listMyShares(): Promise<MyShares> {
  if (!supabase) return { status: 'unavailable' }
  // `name:data->>name` reads one field out of the blob instead of dragging every published
  // encounter's cast back to draw a list of names.
  const { data, error } = await supabase
    .from('shares')
    .select('code, created_at, name:data->>name')
    .order('created_at', { ascending: false })
  if (error) return isMissingSchema(error) ? { status: 'unavailable' } : { status: 'failed' }
  return {
    status: 'ok',
    shares: (data ?? []).map((row) => ({
      code: row.code as string,
      name: (row.name as string | null) ?? 'Untitled',
      createdAt: row.created_at as string,
    })),
  }
}

/**
 * Take a link down. Only the owner's own rows can go — the delete policy compares against
 * `auth.uid()` — so an anonymous publisher can't unpublish, which is why the publish
 * confirmation says a signed-out link stands until it expires.
 */
export async function unpublish(code: string): Promise<'ok' | 'unavailable' | 'failed'> {
  if (!supabase) return 'unavailable'
  const { error } = await supabase.from('shares').delete().eq('code', code)
  if (!error) return 'ok'
  return isMissingSchema(error) ? 'unavailable' : 'failed'
}
