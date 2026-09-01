-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone
-- Forward correction for the hosted project that predates tracked migrations.

do $$
begin
  if exists (select 1 from public.shares where owner_id is null) then
    raise exception 'Ownerless shares must be reviewed before the authority cutover';
  end if;
end $$;

alter table public.shares alter column owner_id set not null;

revoke all on table public.encounters from anon, authenticated;
revoke all on table public.creatures from anon, authenticated;
revoke all on table public.players from anon, authenticated;
revoke all on table public.campaigns from anon, authenticated;
revoke all on table public.spells from anon, authenticated;
revoke all on table public.effects from anon, authenticated;
revoke all on table public.shares from anon, authenticated;

grant select, insert, update, delete on table public.encounters to authenticated;
grant select, insert, update, delete on table public.creatures to authenticated;
grant select, insert, update, delete on table public.players to authenticated;
grant select, insert, update, delete on table public.campaigns to authenticated;
grant select, insert, update, delete on table public.spells to authenticated;
grant select, insert, update, delete on table public.effects to authenticated;
grant select, insert, delete on table public.shares to authenticated;

drop policy if exists "players_owner_all" on public.players;
drop policy if exists "publish your own" on public.shares;
create policy "publish your own" on public.shares
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and may('share.' || kind)
    and may_publish_more()
  );

create or replace function public.answer_reports(want text, decision text) returns integer
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
        raise exception 'shares.takedown is required to take a page down';
      end if;

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
revoke execute on function public.answer_reports(text, text) from public;
grant execute on function public.answer_reports(text, text) to authenticated;

create or replace function public.delete_account() returns void
  language plpgsql security definer set search_path = public
  as $$
  declare
    me uuid := auth.uid();
    my_address text;
  begin
    if me is null then
      raise exception 'delete_account() needs a signed-in caller';
    end if;

    select email into my_address from auth.users where id = me;
    delete from campaigns where owner_id = me;
    delete from creatures where owner_id = me;
    delete from effects where owner_id = me;
    delete from encounters where owner_id = me;
    delete from players where owner_id = me;
    delete from shares where owner_id = me;
    delete from spells where owner_id = me;
    delete from byline_grants where owner_id = me;

    if my_address is not null and to_regclass('public.takedown_notices') is not null then
      delete from takedown_notices where to_address = my_address;
    end if;
    delete from auth.users where id = me;
  end
  $$;
revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
