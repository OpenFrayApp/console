-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

create table public.share_identities (
  code text primary key,
  first_published_at timestamptz not null default now()
);
alter table public.share_identities enable row level security;
revoke all on table public.share_identities from public, anon, authenticated, service_role;
insert into public.share_identities (code)
  select code from public.shares on conflict (code) do nothing;

create table public.recovery_deletions (
  kind text not null,
  subject text not null,
  deleted_at timestamptz not null default now(),
  primary key (kind, subject),
  constraint recovery_deletion_kind check (kind in ('account', 'share')),
  constraint recovery_deletion_subject check (
    (kind = 'account' and subject ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$')
    or (kind = 'share' and length(subject) between 1 and 128)
  )
);
alter table public.recovery_deletions enable row level security;
revoke all on table public.recovery_deletions from public, anon, authenticated, service_role;

-- Record an account identity before the active auth row disappears.
create or replace function public.record_deleted_account() returns trigger
  language plpgsql security definer set search_path = public
  as $$
  begin
    insert into recovery_deletions (kind, subject, deleted_at)
      values ('account', old.id::text, now())
      on conflict (kind, subject) do update
        set deleted_at = greatest(recovery_deletions.deleted_at, excluded.deleted_at);
    return old;
  end
  $$;
revoke execute on function public.record_deleted_account()
  from public, anon, authenticated, service_role, report_ingress;

create trigger record_deleted_account_for_recovery
  before delete on auth.users
  for each row execute function public.record_deleted_account();

-- Record a share code before its published row disappears.
create or replace function public.record_revoked_share() returns trigger
  language plpgsql security definer set search_path = public
  as $$
  begin
    insert into recovery_deletions (kind, subject, deleted_at)
      values ('share', old.code, now())
      on conflict (kind, subject) do update
        set deleted_at = greatest(recovery_deletions.deleted_at, excluded.deleted_at);
    return old;
  end
  $$;
revoke execute on function public.record_revoked_share()
  from public, anon, authenticated, service_role, report_ingress;

create trigger record_revoked_share_for_recovery
  before delete on public.shares
  for each row execute function public.record_revoked_share();

-- Claim each share identity once so deletion and concurrent publication cannot reuse it.
create or replace function public.claim_share_code() returns trigger
  language plpgsql security definer set search_path = public
  as $$
  begin
    insert into share_identities (code) values (new.code) on conflict (code) do nothing;
    if not found then
      raise exception 'revoked share code cannot be reused';
    end if;
    return new;
  end
  $$;
revoke execute on function public.claim_share_code()
  from public, anon, authenticated, service_role, report_ingress;

create trigger claim_share_code
  before insert on public.shares
  for each row execute function public.claim_share_code();

-- Remove active rows named by the recovery ledger.
create or replace function public.apply_recovery_deletions() returns jsonb
  language plpgsql security definer set search_path = public
  as $$
  declare
    removed_accounts integer;
    removed_shares integer;
  begin
    delete from live_view_sessions;
    delete from encounter_writer_leases;

    delete from shares
      where code in (select subject from recovery_deletions where kind = 'share');
    get diagnostics removed_shares = row_count;

    delete from auth.users
      where id in (
        select subject::uuid from recovery_deletions where kind = 'account'
      );
    get diagnostics removed_accounts = row_count;

    return jsonb_build_object('accounts', removed_accounts, 'shares', removed_shares);
  end
  $$;
revoke execute on function public.apply_recovery_deletions()
  from public, anon, authenticated, service_role, report_ingress;

-- Rebuild cross-schema policies and triggers around an isolated public-schema restore.
create or replace function public.reconcile_recovery_dependencies(attach boolean) returns void
  language plpgsql set search_path = public
  as $$
  begin
    execute 'drop event trigger if exists ensure_rls';
    execute 'drop trigger if exists on_auth_user_created on auth.users';
    execute 'drop trigger if exists record_deleted_account_for_recovery on auth.users';
    execute 'drop policy if exists "live viewers receive traffic" on realtime.messages';
    execute 'drop policy if exists "live viewers announce presence" on realtime.messages';
    execute 'drop policy if exists "owners publish live traffic" on realtime.messages';
    if attach then
      execute 'create event trigger ensure_rls on ddl_command_end
        when tag in (''CREATE TABLE'', ''CREATE TABLE AS'', ''SELECT INTO'')
        execute function public.rls_auto_enable()';
      execute 'create trigger on_auth_user_created after insert on auth.users
        for each row execute function public.grant_gm_on_signup()';
      execute 'create trigger record_deleted_account_for_recovery before delete on auth.users
        for each row execute function public.record_deleted_account()';
      execute 'create policy "live viewers receive traffic" on realtime.messages
        for select to anon, authenticated using (
          topic = realtime.topic() and extension in (''broadcast'', ''presence'')
          and public.live_view_topic_active(realtime.topic())
        )';
      execute 'create policy "live viewers announce presence" on realtime.messages
        for insert to anon, authenticated with check (
          topic = realtime.topic() and extension = ''presence''
          and realtime.topic() like ''player:%:join''
          and public.live_view_topic_active(realtime.topic())
        )';
      execute 'create policy "owners publish live traffic" on realtime.messages
        for insert to authenticated with check (
          topic = realtime.topic() and extension in (''broadcast'', ''presence'')
          and realtime.topic() not like ''player:%:join''
          and public.live_view_topic_owned(realtime.topic())
        )';
    end if;
  end
  $$;
revoke execute on function public.reconcile_recovery_dependencies(boolean)
  from public, anon, authenticated, service_role, report_ingress;
select public.reconcile_recovery_dependencies(true);
