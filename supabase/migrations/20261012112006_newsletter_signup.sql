-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

create schema newsletter;
revoke all on schema newsletter from public, anon, authenticated, service_role, report_ingress;

create table newsletter.workflows (
  id uuid primary key default gen_random_uuid(),
  generation uuid not null default gen_random_uuid(),
  email text not null unique,
  authorization_expires_at timestamptz,
  state text not null default 'ready' check (state in
    ('ready','create_pending','activate_ready','activate_pending','retry_activate','subscribed','failed','cleanup')),
  attempts integer not null default 0 check (attempts between 0 and 2),
  provider_id uuid,
  revision integer not null default 0,
  check (state='cleanup' or authorization_expires_at is not null)
);
create table newsletter.subscriptions (
  lifecycle uuid primary key references newsletter.workflows(id),
  owner_id uuid not null references auth.users(id) on delete restrict,
  email text not null,
  consent_at timestamptz not null default clock_timestamp(),
  source text not null check (source='signup'),
  wording_version text not null check (wording_version='newsletter-signup-v1')
);
create index newsletter_subscriptions_owner on newsletter.subscriptions(owner_id);
create table newsletter.signup_intents (
  capability_hash text primary key,
  attempt_hash text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  owner_id uuid,
  lifecycle uuid,
  result text check (result='failed'),
  check (expires_at=issued_at+interval '10 minutes')
);
create index newsletter_intents_expiry on newsletter.signup_intents(expires_at);
create table newsletter.cancellation_fences (
  email_hash text primary key,
  cutoff timestamptz not null,
  expires_at timestamptz not null,
  check (expires_at=cutoff+interval '10 minutes')
);
alter table newsletter.workflows enable row level security;
alter table newsletter.subscriptions enable row level security;
alter table newsletter.signup_intents enable row level security;
alter table newsletter.cancellation_fences enable row level security;
revoke all on all tables in schema newsletter from public, anon, authenticated, service_role, report_ingress;

/** Hash purpose-specific capability material without retaining browser secrets. */
create function newsletter.hash(value text) returns text
language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(value,'UTF8')),'hex');
$$;

/** Serialize every lifecycle decision for one normalized trusted address. */
create function newsletter.lock_address(address text) returns void
language sql set search_path = public as $$
  select pg_advisory_xact_lock(hashtextextended(address,141));
$$;

/** Issue an expiring signup-only capability before the originating OAuth handoff. */
create function public.issue_newsletter_signup_intent(p_attempt_hash text)
returns table(capability text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare token text; issued timestamptz := clock_timestamp();
begin
  if p_attempt_hash is null or p_attempt_hash !~ '^[a-f0-9]{64}$' then return; end if;
  token := newsletter.hash(gen_random_uuid()::text || gen_random_uuid()::text || gen_random_uuid()::text);
  insert into newsletter.signup_intents(capability_hash,attempt_hash,issued_at,expires_at)
    values(newsletter.hash(token),p_attempt_hash,issued,issued+interval '10 minutes');
  return query select token,issued+interval '10 minutes';
end;
$$;

/** Consume a checked attempt once using only the current authenticated account address. */
create function public.consume_newsletter_signup_intent(p_capability text, p_attempt_proof text)
returns table(lifecycle uuid, status text)
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); address text; intent newsletter.signup_intents;
  work newsletter.workflows; cutoff timestamptz;
begin
  if me is null then return query select null::uuid,'invalid'::text; return; end if;
  select lower(trim(u.email)) into address from auth.users u where u.id=me for update;
  if not found or address is null or length(address)>254 or address !~
    '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$'
    or p_capability is null or p_capability !~ '^[a-f0-9]{64}$'
    or p_attempt_proof is null or p_attempt_proof !~ '^[a-f0-9]{64}$' then
    return query select null::uuid,'invalid'::text; return;
  end if;
  perform newsletter.lock_address(address);
  select * into intent from newsletter.signup_intents i
    where i.capability_hash=newsletter.hash(p_capability) for update;
  if not found or intent.expires_at<=clock_timestamp()
    or intent.attempt_hash<>newsletter.hash(p_attempt_proof)
    or (intent.consumed and intent.owner_id is distinct from me) then
    return query select null::uuid,'invalid'::text; return;
  end if;
  if intent.consumed then
    if intent.result='failed' then return query select null::uuid,'failed'::text; return; end if;
    select w.* into work from newsletter.workflows w join newsletter.subscriptions s on s.lifecycle=w.id
      where w.id=intent.lifecycle and s.owner_id=me;
    if not found then return query select null::uuid,'invalid'::text; return; end if;
    return query select work.id,work.state; return;
  end if;
  select f.cutoff into cutoff from newsletter.cancellation_fences f
    where f.email_hash=newsletter.hash(address) and f.expires_at>clock_timestamp();
  if intent.issued_at<=cutoff then
    return query select null::uuid,'invalid'::text; return;
  end if;
  select * into work from newsletter.workflows w where w.email=address for update;
  if found then
    if work.state='cleanup' or not exists (
      select 1 from newsletter.subscriptions s where s.lifecycle=work.id and s.owner_id=me
    ) then
      update newsletter.signup_intents set consumed=true,owner_id=me where capability_hash=intent.capability_hash;
      return query select null::uuid,'unavailable'::text; return;
    end if;
  else
    insert into newsletter.workflows(email,authorization_expires_at) values(address,intent.expires_at) returning * into work;
    insert into newsletter.subscriptions(lifecycle,owner_id,email,source,wording_version)
      values(work.id,me,address,'signup','newsletter-signup-v1');
  end if;
  update newsletter.signup_intents set consumed=true,owner_id=me,lifecycle=work.id
    where capability_hash=intent.capability_hash;
  return query select work.id,work.state;
end;
$$;

revoke all on all functions in schema newsletter from public, anon, authenticated, service_role, report_ingress;
revoke all on function public.issue_newsletter_signup_intent(text),
  public.consume_newsletter_signup_intent(text,text) from public, anon, authenticated, service_role, report_ingress;
grant execute on function public.issue_newsletter_signup_intent(text) to service_role;
grant execute on function public.consume_newsletter_signup_intent(text,text) to authenticated;

create table newsletter.operations (
  id uuid primary key default gen_random_uuid(),
  lifecycle uuid not null references newsletter.workflows(id) on delete cascade,
  generation uuid not null,
  kind text not null check (kind in ('create','activate','delete')),
  state text not null default 'in_flight' check (state in ('in_flight','unknown','accepted','rejected')),
  provider_id uuid,
  revision integer not null
);
create index newsletter_operations_lifecycle on newsletter.operations(lifecycle);
alter table newsletter.operations enable row level security;
revoke all on newsletter.operations from public, anon, authenticated, service_role, report_ingress;

/** End failed or expired authorization while preserving unresolved provider cleanup. */
create function newsletter.end_signup(p_lifecycle uuid) returns void
language plpgsql set search_path = public as $$
begin
  update newsletter.workflows set state='cleanup',attempts=0,authorization_expires_at=null,generation=gen_random_uuid()
    where id=p_lifecycle and state not in ('cleanup','subscribed');
  if not found then return; end if;
  delete from newsletter.subscriptions where lifecycle=p_lifecycle;
  update newsletter.signup_intents set lifecycle=null,result='failed' where lifecycle=p_lifecycle;
end;
$$;
revoke all on function newsletter.end_signup(uuid) from public, anon, authenticated, service_role, report_ingress;

/** Persist one fenced provider substep without replenishing the two-attempt signup budget. */
create function public.prepare_newsletter_signup(p_lifecycle uuid)
returns table(operation uuid, generation uuid, action text, recipient text, provider_id uuid, attempt integer)
language plpgsql security definer set search_path = public as $$
declare work newsletter.workflows; op newsletter.operations; address text; kind text;
begin
  select w.email into address from newsletter.workflows w where w.id=p_lifecycle;
  if not found then return; end if;
  perform newsletter.lock_address(address);
  select * into work from newsletter.workflows w where w.id=p_lifecycle for update;
  if not found then return; end if;
  if work.authorization_expires_at<=clock_timestamp() then perform newsletter.end_signup(work.id); return; end if;
  if work.state not in ('ready','activate_ready','retry_activate')
    or not exists (select 1 from newsletter.subscriptions s where s.lifecycle=work.id)
    or (work.state<>'activate_ready' and work.attempts>=2) then return; end if;
  kind := case when work.state='ready' then 'create' else 'activate' end;
  update newsletter.workflows w set
    attempts=w.attempts+case when work.state='activate_ready' then 0 else 1 end,
    state=case when kind='create' then 'create_pending' else 'activate_pending' end
    where w.id=work.id returning * into work;
  insert into newsletter.operations(lifecycle,generation,kind,provider_id,revision)
    values(work.id,work.generation,kind,work.provider_id,work.revision) returning * into op;
  return query select op.id,work.generation,kind,work.email,work.provider_id,work.attempts;
end;
$$;

/** Settle only the named provider operation and never reactivate canceled consent. */
create function public.finish_newsletter_signup(p_operation uuid, p_generation uuid, p_outcome text, p_provider_id uuid default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare work newsletter.workflows; op newsletter.operations; address text;
begin
  if p_outcome is null or p_outcome not in ('accepted','rejected','unknown') then return false; end if;
  select w.email into address from newsletter.workflows w join newsletter.operations o on o.lifecycle=w.id
    where o.id=p_operation;
  if not found then return false; end if;
  perform newsletter.lock_address(address);
  select w.* into work from newsletter.workflows w join newsletter.operations o on o.lifecycle=w.id
    where o.id=p_operation for update of w;
  select * into op from newsletter.operations o where o.id=p_operation for update;
  if not found or op.generation is distinct from p_generation or op.kind='delete'
    or op.state not in ('in_flight','unknown')
    or (p_outcome='accepted' and p_provider_id is null)
    or (op.kind='activate' and p_provider_id is distinct from op.provider_id)
    or (op.kind='create' and p_outcome<>'accepted' and p_provider_id is not null) then return false; end if;
  if work.authorization_expires_at<=clock_timestamp() and work.state not in ('cleanup','subscribed') then
    perform newsletter.end_signup(work.id);
    work.state := 'cleanup';
  end if;
  update newsletter.operations set state=p_outcome,
    provider_id=case when p_outcome='accepted' then p_provider_id else op.provider_id end where id=op.id;
  if p_outcome='unknown' then return true; end if;
  update newsletter.workflows set revision=revision+1,
    provider_id=case when op.kind='create' and p_outcome='accepted' then p_provider_id else provider_id end
    where id=work.id;
  if work.state='cleanup' then return true; end if;
  if not exists (select 1 from newsletter.subscriptions s where s.lifecycle=work.id) then return false; end if;
  update newsletter.workflows set state=case
    when p_outcome='accepted' and op.kind='create' then 'activate_ready'
    when p_outcome='accepted' then 'subscribed'
    when work.attempts>=2 then 'failed'
    when op.kind='create' then 'ready' else 'retry_activate' end where id=work.id;
  if p_outcome='accepted' and op.kind='activate' then
    delete from newsletter.operations where lifecycle=work.id;
  elsif p_outcome='rejected' and work.attempts>=2 then
    perform newsletter.end_signup(work.id);
  end if;
  return true;
end;
$$;

revoke all on function public.prepare_newsletter_signup(uuid), public.finish_newsletter_signup(uuid,uuid,text,uuid)
  from public, anon, authenticated, service_role, report_ingress;
grant execute on function public.prepare_newsletter_signup(uuid), public.finish_newsletter_signup(uuid,uuid,text,uuid)
  to service_role;

/** Reject only pre-cancellation intents during their original maximum ten-minute lifetime. */
create function newsletter.cancel_address(address text) returns void
language plpgsql set search_path = public as $$
declare canceled timestamptz;
begin
  perform newsletter.lock_address(address);
  canceled := clock_timestamp();
  insert into newsletter.cancellation_fences(email_hash,cutoff,expires_at)
    values(newsletter.hash(address),canceled,canceled+interval '10 minutes')
    on conflict(email_hash) do update set cutoff=excluded.cutoff,expires_at=excluded.expires_at;
end;
$$;

/** Remove lifecycle evidence while retaining independent provider settlement ownership. */
create function public.cancel_newsletter_signup(p_lifecycle uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare work newsletter.workflows; me uuid; current_address text; address text;
begin
  select s.owner_id into me from newsletter.subscriptions s where s.lifecycle=p_lifecycle;
  if not found then return false; end if;
  select lower(trim(u.email)) into current_address from auth.users u where u.id=me for update;
  select w.* into work from newsletter.workflows w where w.id=p_lifecycle;
  if not found then return false; end if;
  for address in select distinct a from unnest(array[work.email,current_address]) a where a is not null order by a loop
    perform newsletter.lock_address(address);
  end loop;
  select w.* into work from newsletter.workflows w where w.id=p_lifecycle for update;
  if not found or work.state='cleanup' then return false; end if;
  perform newsletter.cancel_address(work.email);
  if current_address is not null and current_address<>work.email then
    perform newsletter.cancel_address(current_address);
  end if;
  update newsletter.workflows set state='cleanup',attempts=0,authorization_expires_at=null,generation=gen_random_uuid(),revision=revision+1
    where id=work.id;
  delete from newsletter.subscriptions where lifecycle=work.id;
  -- A consumed capability cannot authorize a second lifecycle, even after this receipt is pruned.
  update newsletter.signup_intents set owner_id=null,lifecycle=null where lifecycle=work.id;
  return true;
end;
$$;

/** Prepare an exact-id deletion whose acknowledgement is bound to the settlement revision. */
create function public.prepare_newsletter_cleanup(p_lifecycle uuid)
returns table(operation uuid, generation uuid, provider_id uuid, action text)
language plpgsql security definer set search_path = public as $$
declare work newsletter.workflows; op newsletter.operations; address text;
begin
  select w.email into address from newsletter.workflows w where w.id=p_lifecycle;
  if not found then return; end if;
  perform newsletter.lock_address(address);
  select * into work from newsletter.workflows w where w.id=p_lifecycle for update;
  if not found or work.state<>'cleanup' then return; end if;
  if work.provider_id is null then
    if exists (select 1 from newsletter.operations o where o.lifecycle=work.id and o.kind<>'delete'
      and o.state in ('in_flight','unknown')) then return; end if;
    delete from newsletter.workflows where id=work.id;
    return query select null::uuid,work.generation,null::uuid,'complete'::text; return;
  end if;
  -- Retrying deletion targets only this lifecycle's exact ID and supersedes any earlier proof.
  delete from newsletter.operations where lifecycle=work.id and kind='delete';
  insert into newsletter.operations(lifecycle,generation,kind,provider_id,revision)
    values(work.id,work.generation,'delete',work.provider_id,work.revision) returning * into op;
  return query select op.id,work.generation,work.provider_id,'delete'::text;
end;
$$;

/** Complete cleanup only with removal begun after every create and activation settled. */
create function public.finish_newsletter_cleanup(p_operation uuid, p_generation uuid, p_provider_id uuid, p_outcome text)
returns boolean language plpgsql security definer set search_path = public as $$
declare work newsletter.workflows; op newsletter.operations; address text;
begin
  if p_outcome is null or p_outcome not in ('removed','unknown') then return false; end if;
  select w.email into address from newsletter.workflows w join newsletter.operations o on o.lifecycle=w.id
    where o.id=p_operation;
  if not found then return false; end if;
  perform newsletter.lock_address(address);
  select w.* into work from newsletter.workflows w join newsletter.operations o on o.lifecycle=w.id
    where o.id=p_operation for update of w;
  select * into op from newsletter.operations o where o.id=p_operation for update;
  if not found or work.state<>'cleanup' or op.kind<>'delete'
    or work.generation is distinct from p_generation or op.generation is distinct from p_generation
    or op.provider_id is distinct from p_provider_id or work.provider_id is distinct from p_provider_id
    or op.revision<>work.revision then return false; end if;
  if p_outcome='unknown' then
    update newsletter.operations set state='unknown' where id=op.id; return false;
  end if;
  if exists (select 1 from newsletter.operations o where o.lifecycle=work.id and o.kind<>'delete'
    and o.state in ('in_flight','unknown')) then return false; end if;
  delete from newsletter.workflows where id=work.id;
  return true;
end;
$$;

/** Delete expired attempt receipts and cancellation cutoffs without touching unresolved provider work. */
create function public.prune_newsletter_signup_intents() returns void
language plpgsql security definer set search_path = public as $$
declare work record;
begin
  for work in select w.id,w.email from newsletter.workflows w
    where w.authorization_expires_at<=clock_timestamp() and w.state not in ('cleanup','subscribed') order by w.email loop
    perform newsletter.lock_address(work.email);
    perform newsletter.end_signup(work.id);
  end loop;
  delete from newsletter.signup_intents where expires_at<=clock_timestamp();
  delete from newsletter.cancellation_fences where expires_at<=clock_timestamp();
end;
$$;

revoke all on function newsletter.cancel_address(text) from public, anon, authenticated, service_role, report_ingress;
revoke all on function public.cancel_newsletter_signup(uuid), public.prepare_newsletter_cleanup(uuid),
  public.finish_newsletter_cleanup(uuid,uuid,uuid,text), public.prune_newsletter_signup_intents()
  from public, anon, authenticated, service_role, report_ingress;
grant execute on function public.cancel_newsletter_signup(uuid), public.prepare_newsletter_cleanup(uuid),
  public.finish_newsletter_cleanup(uuid,uuid,uuid,text), public.prune_newsletter_signup_intents() to service_role;

/** Discard an unconsumed canceled OAuth attempt without exposing whether it existed. */
create function public.discard_newsletter_signup_intent(p_capability text, p_attempt_proof text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from newsletter.signup_intents where capability_hash=newsletter.hash(p_capability)
    and attempt_hash=newsletter.hash(p_attempt_proof) and not consumed;
end;
$$;
revoke all on function public.discard_newsletter_signup_intent(text,text)
  from public, anon, authenticated, service_role, report_ingress;
grant execute on function public.discard_newsletter_signup_intent(text,text) to service_role;

/** Page through cleanup identities without authorizing provider work or renewing signup attempts. */
create function public.pending_newsletter_cleanup(p_after uuid default null)
returns table(lifecycle uuid)
language sql stable security definer set search_path = public as $$
  select id from newsletter.workflows where state='cleanup' and (p_after is null or id>p_after)
    order by id limit 100;
$$;
revoke all on function public.pending_newsletter_cleanup(uuid)
  from public, anon, authenticated, service_role, report_ingress;
grant execute on function public.pending_newsletter_cleanup(uuid) to service_role;
