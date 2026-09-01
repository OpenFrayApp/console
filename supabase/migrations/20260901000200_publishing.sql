-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

create table public.byline_grants (
  owner_id uuid primary key references auth.users on delete cascade,
  note text,
  granted_at timestamptz not null default now()
);
alter table public.byline_grants enable row level security;
revoke all on table public.byline_grants from anon, authenticated;

create or replace function public.may_use_reserved_byline() returns boolean
  language sql stable security definer set search_path = public
  as $$
    select exists (select 1 from byline_grants where owner_id = auth.uid())
  $$;
revoke execute on function public.may_use_reserved_byline() from public, anon;
grant execute on function public.may_use_reserved_byline() to authenticated;

create table public.shares (
  code text primary key,
  kind text not null,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  constraint share_size check (pg_column_size(data) <= 65536)
);
create index shares_owner on public.shares (owner_id, created_at desc);
alter table public.shares enable row level security;
revoke all on table public.shares from anon, authenticated;
grant select, insert, delete on table public.shares to authenticated;

create or replace function public.may_publish_more() returns boolean
  language sql stable security definer set search_path = public
  as $$
    select (select count(*) from shares where owner_id = auth.uid()) < 200
  $$;
revoke execute on function public.may_publish_more() from public, anon;
grant execute on function public.may_publish_more() to authenticated;

create policy "publish your own" on public.shares
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and may('share.' || kind)
    and may_publish_more()
  );
create policy "read your own" on public.shares
  for select to authenticated using (owner_id = auth.uid());
create policy "delete your own" on public.shares
  for delete to authenticated using (owner_id = auth.uid());

create table public.share_tombstones (
  code text primary key,
  taken_down_at timestamptz not null default now()
);
alter table public.share_tombstones enable row level security;
revoke all on table public.share_tombstones from anon, authenticated;

create or replace function public.share(want text) returns jsonb
  language sql stable security definer set search_path = public
  as $$
    select coalesce(
      (
        select jsonb_build_object(
          'kind', kind,
          'data', data,
          'official', exists (
            select 1 from byline_grants grants where grants.owner_id = shares.owner_id
          )
        )
        from shares
        where code = want
      ),
      (
        select jsonb_build_object('taken_down', true)
        from share_tombstones
        where code = want
      )
    )
  $$;
revoke execute on function public.share(text) from public;
grant execute on function public.share(text) to anon, authenticated;

create table public.share_reports (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  reason text not null,
  message text,
  reply_to text,
  reporter_id uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  resolution text,
  resolved_at timestamptz,
  constraint report_message_length check (message is null or length(message) <= 1000),
  constraint report_reply_length check (reply_to is null or length(reply_to) <= 254),
  constraint report_reason_known check (
    reason in ('spam', 'sexual', 'hate', 'impersonation', 'copyright', 'other')
  ),
  constraint report_resolution_known check (
    resolution is null or resolution in ('taken_down', 'dismissed')
  )
);
alter table public.share_reports enable row level security;
revoke all on table public.share_reports from anon, authenticated;

create or replace function public.report_share(
  want text,
  why text,
  note text default null,
  reply_to text default null
) returns void
  language sql security definer set search_path = public
  as $$
    insert into share_reports (code, reason, message, reply_to)
    values (want, why, nullif(btrim(note), ''), nullif(btrim(reply_to), ''))
  $$;
revoke execute on function public.report_share(text, text, text, text) from public;
grant execute on function public.report_share(text, text, text, text) to anon, authenticated;
