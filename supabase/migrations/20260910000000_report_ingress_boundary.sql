-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

-- PostgREST may assume this role only from the server-held, separately signed ingress token.
do $do$
begin
  if not exists (select 1 from pg_roles where rolname = 'report_ingress') then
    create role report_ingress
      nosuperuser nocreatedb nocreaterole noreplication nologin noinherit nobypassrls;
  elsif exists (
    select 1 from pg_roles where rolname = 'report_ingress'
      and (rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolcanlogin
        or rolinherit or rolbypassrls)
  ) then
    raise exception 'report_ingress has unsafe attributes and requires privileged remediation';
  end if;
end
$do$;

do $do$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    grant report_ingress to authenticator;
  end if;
end
$do$;

grant usage on schema public to report_ingress;
revoke all on all tables in schema public from report_ingress;
revoke all on all sequences in schema public from report_ingress;
revoke execute on all functions in schema public from report_ingress;

alter table public.share_reports
  add column network_key text,
  add column duplicate_key text;

create index share_reports_code_created_at
  on public.share_reports (code, created_at desc);
create index share_reports_network_created_at
  on public.share_reports (network_key, created_at desc)
  where network_key is not null;
create index share_reports_duplicate_created_at
  on public.share_reports (duplicate_key, created_at desc)
  where duplicate_key is not null;

revoke execute on function public.report_share(text, text, text, text)
  from public, anon, authenticated, service_role, report_ingress;

-- Atomically recheck publication, enforce report quotas, and insert one bounded report.
create function public.accept_share_report(
  want text,
  why text,
  note text,
  reply_to text,
  network_key text,
  duplicate_key text
) returns text
  language plpgsql security definer set search_path = public
  as $$
  begin
    if want is null
      or why is null
      or network_key is null
      or duplicate_key is null
      or length(want) < 6
      or length(want) > 32
      or want !~ '^[abcdefghjkmnpqrstuvwxyz23456789]+$'
      or why not in ('spam', 'sexual', 'hate', 'impersonation', 'copyright', 'other')
      or length(coalesce(note, '')) > 1000
      or length(coalesce(reply_to, '')) > 254
      or length(want) + length(why) + length(coalesce(note, '')) + length(coalesce(reply_to, '')) > 1299
      or network_key !~ '^[0-9a-f]{64}$'
      or duplicate_key !~ '^[0-9a-f]{64}$'
    then
      return 'invalid';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(network_key, 0));
    perform pg_advisory_xact_lock(hashtextextended(want, 1));

    perform 1 from public.shares where code = want for key share;
    if not found then return 'missing'; end if;
    if exists (
      select 1 from public.share_reports
      where share_reports.duplicate_key = accept_share_report.duplicate_key
        and created_at >= now() - interval '24 hours'
    ) then
      return 'duplicate';
    end if;
    if (
      select count(*) from public.share_reports
      where code = want and created_at >= now() - interval '1 hour'
    ) >= 10 then
      return 'share_limited';
    end if;
    if (
      select count(*) from public.share_reports
      where share_reports.network_key = accept_share_report.network_key
        and created_at >= now() - interval '1 hour'
    ) >= 5 or (
      select count(*) from public.share_reports
      where share_reports.network_key = accept_share_report.network_key
        and created_at >= now() - interval '24 hours'
    ) >= 20 then
      return 'network_limited';
    end if;

    insert into public.share_reports (
      code, reason, message, reply_to, network_key, duplicate_key
    ) values (
      want,
      why,
      nullif(btrim(note), ''),
      nullif(btrim(reply_to), ''),
      accept_share_report.network_key,
      accept_share_report.duplicate_key
    );
    return 'accepted';
  end
  $$;
revoke execute on function public.accept_share_report(text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.accept_share_report(text, text, text, text, text, text)
  to report_ingress;
