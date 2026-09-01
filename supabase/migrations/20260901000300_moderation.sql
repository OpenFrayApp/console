-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone
-- Canonical copy of the reviewed moderation authority.

-- The reports queue: what was reported, grouped by the page it is about, and answering it.
-- The tracked migration order applies this after roles, publishing, and report storage.

-- ── Retiring the mail interface ─────────────────────────────────────────────────
-- The dashboard used to read mail: replies on a report thread arrived at a webhook and were
-- stored beside the report. Nothing writes to any of it now. A reporter is answered by one
-- mail when their report is decided, and if they write back it reaches a person's mailbox
-- rather than this database.
--
-- Dropped rather than left dormant. A table nothing writes to is a table somebody will read
-- next year and believe.

-- The queue answered one report at a time before it grouped them, and that function still
-- resolves a single row by id with reports.resolve behind it. A privileged function nothing
-- calls is worse than a table nothing writes to: it still works.
drop function if exists answer_report(uuid, text);

drop function if exists inbound_queue(integer);
drop function if exists mail_thread(text);
drop function if exists mark_mail_handled(uuid);
drop function if exists inbound_waiting();
drop table if exists outbound_mail;
drop table if exists inbound_mail;
alter table share_reports drop column if exists thread_token;
delete from capabilities where capability in ('mail.read', 'mail.reply');

-- `action_token` and resolve_report() go too. The statements stay safe on a fresh project
-- and on the hosted baseline that previously carried them.
--
-- They were the other way of answering a report. A mail carried a one-click takedown link
-- signed by a per-report token, and the shared page read it out of the link's fragment. The
-- mail stopped carrying it when this dashboard took over, which left a mutation any
-- anonymous client could call, holding a secret nobody sent any more, and doing the job in a
-- way answer_reports() deliberately does not: no may('shares.takedown'), no audit line, and
-- no notice to whoever published the page. The terms promise that last one.
drop function if exists resolve_report(text, text, text);
alter table share_reports drop column if exists action_token;

-- ── The queue ───────────────────────────────────────────────────────────────────
-- One row per reported page, not per report. Three people reporting the same encounter is
-- one decision, and a list that shows it three times is a list that gets the same page taken
-- down twice.
--
-- Ordered by when the page was last reported, most recent first. On the report date, never on
-- the date somebody answered: what has just come in is what a moderator is looking for, and
-- an answer is a thing that happened to a report rather than a property of the page.
--
-- Nothing sorts open before answered any more. The sidebar splits them into their own
-- sections, so a key doing it here would only decide the order inside each one, on a
-- distinction the section has already made.

drop function if exists reports_queue(integer);
create or replace function reports_queue(limit_to integer default 100)
  returns table (
    code text,
    reports integer,
    still_open integer,
    reasons text[],
    first_at timestamptz,
    last_at timestamptz,
    still_published boolean
  )
  language sql security definer set search_path = public stable
  as $$
    select r.code,
           count(*)::int as reports,
           count(*) filter (where r.resolution is null)::int as still_open,
           array_agg(distinct r.reason order by r.reason) as reasons,
           min(r.created_at) as first_at,
           max(r.created_at) as last_at,
           exists (select 1 from shares s where s.code = r.code) as still_published
    from share_reports r
    where (select may('reports.read'))
    group by r.code
    order by max(r.created_at) desc
    limit least(coalesce(limit_to, 100), 500)
  $$;
revoke execute on function reports_queue(integer) from public;
grant execute on function reports_queue(integer) to authenticated;

-- Every report filed against one page, newest first: the one that arrived last is the one a
-- moderator has not read yet, and a page reported for months should not make them scroll.
drop function if exists reports_for(text);
create or replace function reports_for(want text)
  returns table (
    id uuid,
    reason text,
    message text,
    reply_to text,
    created_at timestamptz,
    resolution text,
    resolved_at timestamptz
  )
  language sql security definer set search_path = public stable
  as $$
    select r.id, r.reason, r.message, r.reply_to, r.created_at, r.resolution, r.resolved_at
    from share_reports r
    where r.code = want and (select may('reports.read'))
    order by r.created_at desc
  $$;
revoke execute on function reports_for(text) from public;
grant execute on function reports_for(text) to authenticated;

-- How many pages have something unanswered, for a heading that does not need the queue.
create or replace function reports_open() returns integer
  language sql security definer set search_path = public stable
  as $$
    select case when (select may('reports.read'))
      then (select count(distinct code)::int from share_reports where resolution is null)
      else 0 end
  $$;
revoke execute on function reports_open() from public;
grant execute on function reports_open() to authenticated;

-- ── What is left when a page is taken down ──────────────────────────────────────
-- A code and a date, and nothing else. It exists so a reader following the link afterwards
-- can be told which of two things happened: without it, a page removed last week and a code
-- somebody mistyped are the same answer, and the shared page has to hedge across both.
--
-- The publishing migration creates the same table first and reads it in share(). Keeping
-- `if not exists` makes this forward migration safe on the hosted baseline.
--
-- Only a takedown writes here. An author unpublishing their own link has not had it taken
-- down, and neither has an anonymous link that aged out of the nightly sweep.

create table if not exists share_tombstones (
  code text primary key,
  taken_down_at timestamptz not null default now()
);
alter table share_tombstones enable row level security;
revoke all on table share_tombstones from anon, authenticated;

-- ── Telling the author ──────────────────────────────────────────────────────────
-- A queue of one line each, watched by a database webhook that sends the mail and deletes
-- the row. A queue rather than a record: the address is somebody's own, and once they have
-- been told there is no reason to keep it. What happened is already in the audit log.
--
-- The address is written here rather than looked up later, because the row it comes from is
-- about to be deleted: a page that has been taken down has no owner_id to follow any more.
-- Only a page published by a signed-in account has an address at all, so an anonymous one
-- queues nothing and nobody is written to.
--
-- A row surviving means the mail did not go. That is the retry, and it is visible.

create table if not exists takedown_notices (
  id uuid primary key default gen_random_uuid(),
  -- One notice per page. A page is taken down once, and `on conflict do nothing` makes a
  -- second attempt quiet rather than a duplicate mail.
  code text not null unique,
  to_address text not null,
  created_at timestamptz not null default now()
);
alter table takedown_notices enable row level security;
revoke all on table takedown_notices from anon, authenticated;

-- ── Answering ───────────────────────────────────────────────────────────────────
-- One decision closes every open report against the page, because that is what the decision
-- is about. Each row it closes fires the database webhook that mails its own reporter, so
-- three people who reported the same encounter each hear back once, and none of them learns
-- that the others exist.
--
-- Taking a page down deletes it. There is nothing to restore afterwards, which is why the
-- log line carries the code: it is the only thing that remembers.

create or replace function answer_reports(want text, decision text) returns integer
  language plpgsql security definer set search_path = public
  as $$
  declare
    closed integer;
    author uuid;
    author_address text;
  begin
    if decision not in ('taken_down', 'dismissed') then return 0; end if;
    if not (select may('reports.resolve')) then return 0; end if;

    update share_reports
      set resolution = decision, resolved_at = now()
      where code = want and resolution is null;
    get diagnostics closed = row_count;
    if closed = 0 then return 0; end if;

    if decision = 'taken_down' then
      if not (select may('shares.takedown')) then
        -- Answering and unpublishing are separate capabilities, so a role that may close a
        -- report cannot delete a page by choosing this outcome.
        raise exception 'shares.takedown is required to take a page down';
      end if;

      -- The owner is read out of the row being deleted, because afterwards there is nothing
      -- left to read it from. Nothing deleted means the page was already gone, and then
      -- there is nobody to tell and nothing to mark.
      delete from shares where code = want returning owner_id into author;

      if found then
        insert into share_tombstones (code) values (want) on conflict (code) do nothing;
      end if;

      if author is not null then
        select email into author_address from auth.users where id = author;
        if author_address is not null then
          insert into takedown_notices (code, to_address) values (want, author_address)
          on conflict (code) do nothing;
        end if;
      end if;
    end if;

    perform note_action('report.' || decision, want, jsonb_build_object('reports', closed));
    return closed;
  end
  $$;
revoke execute on function answer_reports(text, text) from public;
grant execute on function answer_reports(text, text) to authenticated;

-- ── What a reader sees on the page ──────────────────────────────────────────────
-- The reported payload itself, so a decision is made against the words rather than against a
-- code. Read with the definer's rights because a moderator has no other way in: the table's
-- policies answer to an owner, and this reader is not the owner.

create or replace function reported_share(want text)
  returns table (kind text, data jsonb, created_at timestamptz, owned boolean)
  language sql security definer set search_path = public stable
  as $$
    select s.kind, s.data, s.created_at, s.owner_id is not null
    from shares s
    where s.code = want and (select may('shares.read'))
  $$;
revoke execute on function reported_share(text) from public;
grant execute on function reported_share(text) to authenticated;

-- ── Checks worth doing by hand ──────────────────────────────────────────────────
-- With the anon key, signed out:
--   select * from reports_queue();     -- expect permission denied for function
-- Signed in holding no role:
--   select * from reports_queue();     -- expect zero rows, never an error
--   select reports_open();             -- expect 0
--   select answer_reports('<code>', 'dismissed');  -- expect 0, rows untouched
-- And what a reader who follows the link afterwards is told:
--   select * from share_tombstones where code = '<code>';  -- expect one row
--   select share('<code>');  -- expect {"taken_down": true} rather than null
--
-- And what the author is told:
--   select code, to_address from takedown_notices;  -- expect one line per owned page
--   -- the webhook sends it and deletes the row, so a row that stays is a mail that did not
--
-- As a moderator, with two reports against one page:
--   select code, last_at from reports_queue();  -- expect newest reported first
--   select reason from reports_for('<code>');                        -- expect newest first
--   select answer_reports('<code>', 'dismissed');                    -- expect 2
--   select answer_reports('<code>', 'dismissed');                    -- expect 0: none open
--   select action, target, detail from audit_recent() limit 1;       -- expect report.dismissed
-- And the outcome that deletes:
--   select answer_reports('<code>', 'taken_down');  -- expect the count, and the share gone
--   select * from shares where code = '<code>';     -- expect no rows
