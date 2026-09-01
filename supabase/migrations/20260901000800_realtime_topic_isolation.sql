-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

-- Accept only the lobby, join, and PIN-derived board channels built by the client.
create or replace function public.live_view_topic_active(want_topic text) returns boolean
  language sql stable security definer set search_path = public
  as $$
    select want_topic ~ '^player:[a-f0-9]{64}:(lobby|join|board:[a-f0-9]{64})$'
      and exists (
        select 1 from live_view_sessions
        where capability_hash = split_part(want_topic, ':', 2)
      )
  $$;

create or replace function public.live_view_topic_owned(want_topic text) returns boolean
  language sql stable security definer set search_path = public
  as $$
    select want_topic ~ '^player:[a-f0-9]{64}:(lobby|join|board:[a-f0-9]{64})$'
      and exists (
        select 1 from live_view_sessions
        where capability_hash = split_part(want_topic, ':', 2)
          and owner_id = auth.uid()
      )
  $$;

-- Bind each authorized Realtime operation to the row for the requested private channel.
drop policy "live viewers receive traffic" on realtime.messages;
create policy "live viewers receive traffic" on realtime.messages
  for select to anon, authenticated
  using (
    topic = realtime.topic()
    and extension in ('broadcast', 'presence')
    and public.live_view_topic_active(realtime.topic())
  );

drop policy "live viewers announce presence" on realtime.messages;
create policy "live viewers announce presence" on realtime.messages
  for insert to anon, authenticated
  with check (
    topic = realtime.topic()
    and extension = 'presence'
    and realtime.topic() like 'player:%:join'
    and public.live_view_topic_active(realtime.topic())
  );

drop policy "owners publish live traffic" on realtime.messages;
create policy "owners publish live traffic" on realtime.messages
  for insert to authenticated
  with check (
    topic = realtime.topic()
    and extension in ('broadcast', 'presence')
    and realtime.topic() not like 'player:%:join'
    and public.live_view_topic_owned(realtime.topic())
  );
