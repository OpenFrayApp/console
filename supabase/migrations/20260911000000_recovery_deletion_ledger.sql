-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

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

-- Keep a revoked share identity from becoming active again.
create or replace function public.reject_reused_share_code() returns trigger
  language plpgsql security definer set search_path = public
  as $$
  begin
    if exists (
      select 1 from recovery_deletions where kind = 'share' and subject = new.code
    ) then
      raise exception 'revoked share code cannot be reused';
    end if;
    return new;
  end
  $$;
revoke execute on function public.reject_reused_share_code()
  from public, anon, authenticated, service_role, report_ingress;

create trigger reject_reused_share_code
  before insert on public.shares
  for each row execute function public.reject_reused_share_code();

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
