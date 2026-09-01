-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone
-- Canonical copy of the reviewed account-inspection authority.

-- One account, read whole: the link its players use, and what it has made. The tracked
-- migration order applies this after every table and moderation function it reads. A
-- `language sql` body is checked when the function is created, so the order is authoritative.
--
-- ── What this deliberately does not return ──────────────────────────────────────
-- Names and dates. Never `data`.
--
-- The definer-function rule says a function that reads `encounters` or `shares` reads
-- every account's rows at once, and these three functions do exactly that, so the trade is
-- worth writing down. A maintainer answering "who is this account and what have they been
-- doing" needs to know that somebody has ninety creatures and two campaigns. They do not need
-- to read a stranger's stat block to know it, and a screen that showed one would be reading
-- private work for no decision it helps make. What was actually published is public already,
-- and reported_share() in the moderation migration is the way to that.
--
-- Gated on `roles.grant`, the same capability as accounts() and capabilities_of(). One screen,
-- one gate: an account list where the rows cannot be opened would be worse than no screen. The
-- day there is a role that reads accounts without handing out roles, this becomes its own
-- capability and the gate below is the only line that changes.

-- ── The link, and the sizes ─────────────────────────────────────────────────────
-- One row, always, for whoever may ask. The counts are the whole library rather than the
-- length of the list below, so a list that stops at 500 still says how much it stopped short
-- of.
--
-- `player_code` is the name in openfray.app/p/<code>, which the Game Master claims on their
-- live encounter row and reads aloud at the table. Live first and newest after that: the
-- unique index makes at most one row live, and a saved fight carrying an old copy of the code
-- should never win over the row the console actually claims against.
--
-- Reads: encounters, creatures, campaigns, shares. All by owner_id, none by data.
create or replace function account_overview(who uuid)
  returns table (
    player_code text,
    creatures integer,
    campaigns integer,
    saved_fights integer,
    published integer
  )
  language sql security definer set search_path = public stable
  as $$
    select (select e.player_code
            from encounters e
            where e.owner_id = who and e.player_code is not null
            order by (e.kind = 'live') desc, e.updated_at desc
            limit 1),
           (select count(*)::int from creatures c where c.owner_id = who),
           (select count(*)::int from campaigns c where c.owner_id = who),
           (select count(*)::int from encounters e where e.owner_id = who and e.kind = 'saved'),
           (select count(*)::int from shares s where s.owner_id = who)
    where (select may('roles.grant'))
  $$;
revoke execute on function account_overview(uuid) from public;
grant execute on function account_overview(uuid) to authenticated;

-- ── What they have made ─────────────────────────────────────────────────────────
-- Three tables in one list, each row saying which kind it is, because the screen shows them
-- as three sections and a second round trip per section would buy nothing.
--
-- `at` is the last time the row changed, in every branch, which is why the three are
-- comparable in one list. `creatures` carries `updated_at` and no created date at all, so
-- there is no version of this that reads "created" throughout. `campaigns` has both and uses
-- the same column its neighbour does. `shares` has only `created_at`, and that is its last
-- change too: a published link is written once and never edited, only deleted.
--
-- Ordered inside the subquery's alias rather than by the `returns table` column names, which
-- a union does not put in scope. That mistake is the reason tests/sql exists at all.
--
-- ── The four provenance columns ─────────────────────────────────────────────────
-- `edition`, `license`, `source` and `imported` are read out of the payload, and they are
-- still not the payload: four scalars saying where a stat block came from and how it may be
-- reused. They are the questions a maintainer actually has about somebody's library, and the
-- ones the stat block itself cannot be opened to answer.
--
-- `imported` is the console's own flag and means "came from outside", which covers the
-- browser extension and a forum paste alike: `importCreature` sets it either way, because a
-- pasted block is the same trust level wearing a friendlier hat. `source` is what tells them
-- apart, since the extension stamps `<Book> - Manual import` and a hand-written creature is
-- `custom`. Both are here rather than one derived answer, because deriving "came from the
-- extension" out of a string that a Game Master can edit would be a guess presented as a
-- fact.
--
-- Compared as text rather than cast to boolean. A row whose `imported` is anything other
-- than `true` reads as false instead of raising, and one bad value in one row would
-- otherwise take the whole list down.
--
-- A campaign has an edition and nothing else: no license, no source, never imported. A share
-- is asked the same questions anyway, because a published creature's payload is the creature
-- and answers them; a published encounter's does not, and says so with nulls.
--
-- Reads: creatures, campaigns, shares. Names, dates, and where something came from.
--
-- Dropped before it is created, because `create or replace` cannot change the columns of a
-- `returns table` function and the error it raises names the return type rather than the
-- change. The explicit drop keeps a forward replacement deterministic.
drop function if exists account_made(uuid, integer);
create or replace function account_made(who uuid, limit_to integer default 500)
  returns table (
    kind text,
    name text,
    code text,
    at timestamptz,
    edition text,
    license text,
    source text,
    imported boolean
  )
  language sql security definer set search_path = public stable
  as $$
    select m.kind, m.name, m.code, m.at, m.edition, m.license, m.source, m.imported
    from (
      select 'creature'::text as kind,
             nullif(trim(c.name), '') as name,
             null::text as code,
             c.updated_at as at,
             nullif(trim(c.data ->> 'edition'), '') as edition,
             nullif(trim(c.data ->> 'license'), '') as license,
             nullif(trim(c.data ->> 'source'), '') as source,
             coalesce(c.data ->> 'imported' = 'true', false) as imported
      from creatures c where c.owner_id = who
      union all
      select 'campaign', nullif(trim(c.name), ''), null, c.updated_at,
             nullif(trim(c.data ->> 'edition'), ''), null, null, false
      from campaigns c where c.owner_id = who
      union all
      -- The published name is inside the payload, which is the one place a share keeps it.
      -- Reading one string out of it is not reading the page: the code beside it is what a
      -- reader would follow, and reported_share() is what shows the page itself.
      select 'share', nullif(trim(s.data ->> 'name'), ''), s.code, s.created_at,
             nullif(trim(s.data ->> 'edition'), ''),
             nullif(trim(s.data ->> 'license'), ''),
             nullif(trim(s.data ->> 'source'), ''),
             coalesce(s.data ->> 'imported' = 'true', false)
      from shares s where s.owner_id = who
    ) m
    where (select may('roles.grant'))
    order by m.kind, m.at desc
    limit least(coalesce(limit_to, 500), 2000)
  $$;
revoke execute on function account_made(uuid, integer) from public;
grant execute on function account_made(uuid, integer) to authenticated;

-- ── How much each account has made, for the whole list at once ──────────────────
-- The sidebar filters on "has a campaign", and account_overview() answers about one account
-- at a time, so asking it per row would be one round trip per person on the screen. This is
-- the same three counts for everybody, in one query and one pass over each table.
--
-- Only accounts that have made something get a row. An account with nothing is the common
-- case and its row would be three zeroes, so absent means none and the client says so once.
--
-- No names and no dates: this is arithmetic about a library, and it is the one function here
-- that touches every account's rows rather than one named person's. What it can answer is how
-- many, which is what a filter needs and the least it could be given.
--
-- `owner_id is not null` because `shares` allowed an anonymous publisher before an account
-- was required, and a project that still has such a row would otherwise group them all under
-- one null owner and report it as somebody.
--
-- Reads: creatures, campaigns, shares. Counts only.
create or replace function account_libraries()
  returns table (id uuid, creatures integer, campaigns integer, published integer)
  language sql security definer set search_path = public stable
  as $$
    select m.owner_id,
           count(*) filter (where m.kind = 'creature')::int,
           count(*) filter (where m.kind = 'campaign')::int,
           count(*) filter (where m.kind = 'share')::int
    from (
      select owner_id, 'creature' as kind from creatures
      union all
      select owner_id, 'campaign' from campaigns
      union all
      select owner_id, 'share' from shares
    ) m
    where (select may('roles.grant')) and m.owner_id is not null
    group by m.owner_id
  $$;
revoke execute on function account_libraries() from public;
grant execute on function account_libraries() to authenticated;

-- ── Checks worth doing by hand ──────────────────────────────────────────────────
-- The trap from roles.sql applies here too: `auth.uid()` is null in the SQL editor, so
-- may('roles.grant') is false there and both functions answer nothing whatever is applied.
-- Borrow a session to ask them properly:
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<admin uuid>', 'role', 'authenticated')::text, true);
--   select * from account_overview('<uuid>');
--   select kind, count(*) from account_made('<uuid>') group by kind;
--   select * from account_libraries() order by campaigns desc limit 5;
--   commit;
--
-- With the anon key, signed out:
--   select * from account_overview('<uuid>');  -- expect permission denied for function
-- Signed in holding no role, and as a moderator, who reads reports and not accounts:
--   select * from account_overview('<uuid>');  -- expect zero rows, never an error
--   select * from account_made('<uuid>');      -- expect zero rows
--
-- And that the tracked column names this function reads remain present:
--   select table_name, column_name from information_schema.columns
--   where table_schema = 'public'
--     and table_name in ('creatures', 'campaigns', 'encounters', 'shares')
--     and column_name in ('owner_id', 'name', 'updated_at', 'created_at', 'kind', 'player_code')
--   order by 1, 2;
