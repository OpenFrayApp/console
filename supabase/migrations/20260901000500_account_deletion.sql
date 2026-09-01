-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

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
