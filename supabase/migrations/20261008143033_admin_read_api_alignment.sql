-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

begin;

/** Read account identity only for callers holding roles.grant. */
create or replace function accounts(limit_to integer, who uuid)
  returns table (
    id uuid,
    email text,
    created_at timestamptz,
    last_sign_in_at timestamptz,
    full_name text,
    display_name text,
    providers text[],
    signed_in_with text,
    roles text[],
    denials text[]
  )
  language sql security definer set search_path = public stable
  as $$
    select u.id,
           u.email::text,
           u.created_at,
           u.last_sign_in_at,
           -- Three keys because three providers disagree, and the same order the console
           -- reads them in: Supabase's own display_name, then the full_name / name that
           -- Google and Discord actually write. Blank is absent, so an empty string set by
           -- hand reads as no name rather than as a name nobody can see.
           nullif(
             trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')),
             ''
           ) as full_name,
           nullif(trim(u.raw_user_meta_data ->> 'display_name'), '') as display_name,
           coalesce(
             (select array_agg(distinct i.provider order by i.provider)
              from auth.identities i where i.user_id = u.id),
             '{}'
           ) as providers,
           (select i.provider
            from auth.identities i
            where i.user_id = u.id
            order by i.last_sign_in_at desc nulls last, i.provider
            limit 1) as signed_in_with,
           coalesce(
             (select array_agg(r.role order by r.role) from user_roles r where r.owner_id = u.id),
             '{}'
           ) as roles,
           coalesce(
             (select array_agg(d.capability order by d.capability)
              from capability_denials d where d.owner_id = u.id),
             '{}'
           ) as denials
    from auth.users u
    where (select may('roles.grant')) and (who is null or u.id = who)
    order by u.created_at
    limit least(coalesce(limit_to, 200), 500)
  $$;
revoke execute on function accounts(integer, uuid) from public, anon, authenticated, service_role, report_ingress;
grant execute on function accounts(integer, uuid) to authenticated;

/** Keep the list API while sharing the permission-gated account lookup. */
create or replace function accounts(limit_to integer default 200)
  returns table (
    id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
    full_name text, display_name text, providers text[], signed_in_with text,
    roles text[], denials text[]
  )
  language sql security invoker set search_path = public stable
  as $$ select * from accounts(limit_to, null::uuid) $$;
revoke execute on function accounts(integer) from public, anon, authenticated, service_role, report_ingress;
grant execute on function accounts(integer) to authenticated;


/** List published pages across owners for readers holding shares.read. */
create or replace function published_shares(
  search_for text default '',
  before_at timestamptz default null,
  before_code text default null
)
  returns table (
    code text, kind text, name text, created_at timestamptz, owned boolean,
    publisher_id uuid, publisher_name text
  )
  language sql security definer set search_path = public stable
  as $$
    select s.code, s.kind, s.data ->> 'name', s.created_at, s.owner_id is not null,
           u.id,
           coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
                    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
                    nullif(trim(u.raw_user_meta_data ->> 'name'), ''))
    from shares s
    left join auth.users u on u.id = s.owner_id and (select may('roles.grant'))
    where (select may('shares.read'))
      and (before_at is null or (s.created_at, s.code) < (before_at, before_code))
      and (coalesce(search_for, '') = ''
        or strpos(lower(s.code), lower(search_for)) > 0
        or strpos(lower(coalesce(s.data ->> 'name', '')), lower(search_for)) > 0)
    order by s.created_at desc, s.code desc
    limit 51
  $$;
revoke execute on function published_shares(text, timestamptz, text) from public, anon, authenticated, service_role, report_ingress;
grant execute on function published_shares(text, timestamptz, text) to authenticated;

/** Read one published page's metadata without a search window or pagination cap. */
create or replace function published_share(want text)
  returns table (
    code text, kind text, name text, created_at timestamptz, owned boolean,
    publisher_id uuid, publisher_name text
  )
  language sql security definer set search_path = public stable
  as $$
    select s.code, s.kind, s.data ->> 'name', s.created_at, s.owner_id is not null,
           u.id,
           coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
                    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
                    nullif(trim(u.raw_user_meta_data ->> 'name'), ''))
    from shares s
    left join auth.users u on u.id = s.owner_id and (select may('roles.grant'))
    where s.code = want and (select may('shares.read'))
  $$;
revoke execute on function published_share(text) from public, anon, authenticated, service_role, report_ingress;
grant execute on function published_share(text) to authenticated;


notify pgrst, 'reload schema';
commit;
