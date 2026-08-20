// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { supabase } from '../lib/supabase.ts'
import { TEMPLATE_LIMITS } from '../schema/encounterTemplate.ts'
import { randomShareCode } from './shareCode.ts'

/**
 * Published shares: the one table behind every `/s/<code>` link.
 *
 * It is deliberately unlike everything else in `state/`. Those tables hold what a Game
 * Master owns and keeps; this one holds what a Game Master has decided to hand out, at an
 * address a stranger can open.
 *
 * That is not a hole in rule 8. What that rule protects is the fight: an anonymous session
 * still never reaches the database. A published encounter is not a fight — no hit points, no
 * effects, no log, no session — it is prep, decontextualised on purpose and published on
 * purpose. The privacy that matters is preserved: nothing about a board, and nothing about
 * the publisher beyond the byline they typed.
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

export type ShareKind = 'encounter' | 'creature'

/** How a publish went. `tooBig` is the one the Game Master can act on by trimming. */
export type PublishResult =
  | { status: 'ok'; code: string }
  | { status: 'tooBig' }
  /** Publishing needs an account, and there is none. */
  | { status: 'signInFirst' }
  /** The account holds no capability to publish this. Somebody took it away. */
  | { status: 'notAllowed' }
  | { status: 'unavailable' }
  | { status: 'failed' }

/** What a code resolved to. `missing` is a code that never existed, or has been unpublished. */
export type FetchedShare =
  | {
      status: 'ok'
      kind: string
      data: unknown
      /**
       * Whether the publisher holds a byline grant — one of ours. The database works it out
       * from the row's owner, never from the byline: a byline is a claim anyone can type,
       * and the page uses this to decide whether it is looking at a stranger's words.
       */
      official: boolean
    }
  | { status: 'missing' }
  /** The code was used, and the page was taken down. Different from never having existed. */
  | { status: 'takenDown' }
  | { status: 'unavailable' }
  | { status: 'failed' }

/** A link the signed-in publisher can copy again or take down. */
export interface ShareSummary {
  code: string
  name: string
  createdAt: string
  /** What is behind it, so a list of links can say which is which. */
  kind: string
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

/** Say why a write failed, since the Game Master only ever sees "couldn't". */
function warn(action: string, error: unknown): void {
  if (error) console.error(`[openfray] ${action} failed`, error)
}

/** The size of a payload as the database will measure it, in bytes rather than characters. */
const byteSize = (value: string): number => new TextEncoder().encode(value).length

/**
 * Publish something under a fresh code, and hand back the code.
 *
 * `owner_id` is never sent: the column defaults to `auth.uid()`, which stamps a signed-in
 * publisher. Writing it here would be the one way a client could claim to be someone else,
 * so the client simply doesn't have an opinion.
 *
 * A `23505` means two publishers drew the same ten characters at the same moment. At 49 bits
 * that will realistically never happen; the retry costs a line and settles it if it does.
 */
export async function publishShare(kind: ShareKind, data: unknown): Promise<PublishResult> {
  if (!supabase) return { status: 'unavailable' }

  // Publishing needs an account. The policy refuses a row with nobody's name on it, so this
  // only decides which sentence a Game Master reads: one about signing in, or Postgres saying
  // a row-level security check failed.
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return { status: 'signInFirst' }

  const json = JSON.stringify(data)
  // Refused here, with a sentence the Game Master can act on, rather than in Postgres as a
  // constraint violation they can't read.
  if (byteSize(json) > TEMPLATE_LIMITS.publishBytes) return { status: 'tooBig' }

  for (let attempt = 0; attempt < 2; attempt++) {
    const code = randomShareCode()
    const { error } = await supabase.from('shares').insert({ code, kind, data })
    if (!error) return { status: 'ok', code }
    if (pgCode(error) === '23505') continue
    if (isMissingSchema(error)) return { status: 'unavailable' }
    // The insert policy asks whether this account may publish this kind of thing, and a
    // refusal arrives as a row-level security violation. Said as itself, because the alternative
    // is a Game Master reading "couldn't publish that" and trying again all evening.
    if (pgCode(error) === '42501') return { status: 'notAllowed' }
    warn('publishing a share', error)
    return { status: 'failed' }
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
  if (error) {
    if (isMissingSchema(error)) return { status: 'unavailable' }
    warn('reading a share', error)
    return { status: 'failed' }
  }
  if (!data || typeof data !== 'object') return { status: 'missing' }
  const row = data as {
    kind?: unknown
    data?: unknown
    official?: unknown
    taken_down?: unknown
  }
  // A tombstone, which is what is left of a page a moderator removed. Absent on a project
  // whose `share()` predates them, and then a removed page reads as missing, which is what
  // it read as before.
  if (row.taken_down === true) return { status: 'takenDown' }
  if (typeof row.kind !== 'string' || row.data === undefined) return { status: 'missing' }
  // Absent on a project whose `share()` predates the flag: unknown means treat it as a
  // stranger's, which is the safe direction to be wrong in.
  return { status: 'ok', kind: row.kind, data: row.data, official: row.official === true }
}

/** What the publisher's own list found. */
export type MyShares =
  { status: 'ok'; shares: ShareSummary[] } | { status: 'unavailable' } | { status: 'failed' }

/** Every link this signed-in publisher still has up, newest first. */
export async function listMyShares(): Promise<MyShares> {
  if (!supabase) return { status: 'unavailable' }
  // `name:data->>name` reads one field out of the blob rather than dragging every published
  // payload back to draw a list. A creature has no `name` at the top of its template, so its
  // row comes back null and the caller names it from its kind.
  const { data, error } = await supabase
    .from('shares')
    .select('code, kind, created_at, name:data->>name')
    .order('created_at', { ascending: false })
  if (error) {
    if (isMissingSchema(error)) return { status: 'unavailable' }
    warn('listing your shares', error)
    return { status: 'failed' }
  }
  return {
    status: 'ok',
    shares: (data ?? []).map((row) => ({
      code: row.code as string,
      kind: (row.kind as string | null) ?? 'encounter',
      name: (row.name as string | null) ?? 'Untitled',
      createdAt: row.created_at as string,
    })),
  }
}

/**
 * Whether this account may publish under one of the reserved names — the app's own, and the
 * maintainer's.
 *
 * The answer lives in the database, never here: a row granting the capability, looked up by
 * `auth.uid()` inside a `security definer` function. Nothing in this repository names the
 * person it belongs to, which is the point — the alternative was an email or a user id in
 * public client-side code.
 *
 * False on any failure, including a project without the function, so the reserved list holds
 * everywhere it hasn't been deliberately lifted.
 */
export async function mayUseReservedByline(): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('may_use_reserved_byline')
  if (error) {
    if (!isMissingSchema(error)) warn('checking byline permission', error)
    return false
  }
  return data === true
}

/** What a report can be answered with. Both are decisions; only one deletes anything. */
export type Resolution = 'taken_down' | 'dismissed'

/** How answering a report went. `wrong` is a token that matched no undecided report. */
export type ResolveResult = 'ok' | 'wrong' | 'unavailable' | 'failed'

/**
 * Answer a report with the token from its mail: take the encounter down, or leave it up.
 *
 * The token is the whole authorisation, and it only ever matches the one report that
 * carried it — so nothing here needs an account, a session, or a key that could do anything
 * else. It matches only while that report is undecided, which makes it single-use: a mail
 * forwarded or opened twice cannot answer the same report twice.
 *
 * The decision is written before anything else happens, because it is what the reply to the
 * reporter is sent from. That ordering is the same one the report itself follows, and for
 * the same reason: a broken mail hop should cost a message, never the decision.
 *
 * `wrong` covers every way a token can fail to match — stale, already answered, or simply
 * not ours — because the page says one thing to its reader in all of them.
 */
export async function resolveReport(
  code: string,
  secret: string,
  decision: Resolution,
): Promise<ResolveResult> {
  if (!supabase) return 'unavailable'
  const { data, error } = await supabase.rpc('resolve_report', {
    want: code,
    secret,
    decision,
  })
  if (error) {
    if (isMissingSchema(error)) return 'unavailable'
    warn('answering a report', error)
    return 'failed'
  }
  return data === true ? 'ok' : 'wrong'
}

/**
 * Take a link down. Only the owner's own rows can go through here — the delete policy
 * compares against `auth.uid()` — and this is one of the two ways a link ends, the other
 * being a moderator's takedown. Nothing ages one out: a link left in a blog post or a video
 * description has to still work when somebody follows it.
 */
export async function unpublish(code: string): Promise<'ok' | 'unavailable' | 'failed'> {
  if (!supabase) return 'unavailable'
  const { error } = await supabase.from('shares').delete().eq('code', code)
  if (!error) return 'ok'
  if (isMissingSchema(error)) return 'unavailable'
  warn('unpublishing a share', error)
  return 'failed'
}
