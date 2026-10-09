-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

create schema account_mail;
revoke all on schema account_mail from public, anon, authenticated, service_role;

create table account_mail.ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event text not null check (event = 'welcome'),
  template text not null check (template = 'openfray-welcome-v1'),
  state text not null default 'queued' check (state in ('queued','accepted','failed','reconcile','skipped')),
  attempts integer not null default 0 check (attempts between 0 and 6),
  first_attempt_at timestamptz,
  uncertain boolean not null default false,
  in_flight boolean not null default false,
  request_hash text,
  provider_id uuid,
  failure text check (failure in ('transient','ambiguous','rejected','payload_changed','exhausted','window_expired','no_address','recovery')),
  created_at timestamptz not null default now(),
  unique(event, owner_id)
);
create table account_mail.queue (
  id uuid primary key references account_mail.ledger(id) on delete cascade,
  recipient text,
  due_at timestamptz not null default now(),
  claim uuid,
  lease_until timestamptz
);
alter table account_mail.ledger enable row level security;
alter table account_mail.queue enable row level security;
revoke all on all tables in schema account_mail from public, anon, authenticated, service_role;

/** Accept one bare ASCII mailbox without recipient-list or header syntax. */
create function account_mail.usable_mailbox(address text) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(length(address)<=254 and address ~
    '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$',false);
$$;
revoke all on function account_mail.usable_mailbox(text) from public, anon, authenticated, service_role;

/** Queue one welcome from a new trusted account without contacting a provider. */
create function account_mail.on_account_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare delivery uuid;
begin
  if new.created_at is null or new.created_at < tg_argv[0]::timestamptz
    or not account_mail.usable_mailbox(new.email)
    then return new; end if;
  insert into account_mail.ledger(owner_id,event,template)
    values(new.id,'welcome','openfray-welcome-v1')
    on conflict (event,owner_id) do nothing returning id into delivery;
  if delivery is not null then
    insert into account_mail.queue(id) values(delivery);
  end if;
  return new;
end;
$$;
revoke all on function account_mail.on_account_created() from public, anon, authenticated, service_role;

-- Freeze installation time so historical Auth records replayed during recovery stay ineligible.
do $$
begin
  execute format('create trigger queue_account_welcome after insert on auth.users
    for each row execute function account_mail.on_account_created(%L)',now()::text);
end;
$$;

/** Lease one due delivery and quarantine outcomes that cannot safely be retried. */
create function public.claim_account_mail()
returns table(id uuid, claim uuid, recipient text, template text)
language plpgsql security definer set search_path = public as $$
declare job record; address text; token uuid;
begin
  for job in
    select q.id, q.recipient, l.owner_id, l.template, l.attempts, l.first_attempt_at, l.uncertain, l.in_flight
    from account_mail.ledger l join account_mail.queue q on l.id=q.id
    where l.state='queued' and q.due_at <= now() and (q.lease_until is null or q.lease_until < now())
    order by q.due_at, q.id for update of l,q skip locked limit 1
  loop
    if job.first_attempt_at <= now()-interval '23 hours' or job.attempts >= 6 then
      update account_mail.ledger l set
        state=case when job.uncertain or job.in_flight then 'reconcile' else 'failed' end,
        uncertain=job.uncertain or job.in_flight,in_flight=false,request_hash=null,
        failure=case when job.attempts >= 6 then 'exhausted' else 'window_expired' end
        where l.id=job.id;
      delete from account_mail.queue q where q.id=job.id;
      return;
    end if;
    select coalesce(job.recipient,u.email) into address from auth.users u where u.id=job.owner_id;
    if not account_mail.usable_mailbox(address) then
      update account_mail.ledger l set state='skipped',failure='no_address' where l.id=job.id;
      delete from account_mail.queue q where q.id=job.id;
      return;
    end if;
    update account_mail.ledger l set uncertain=l.uncertain or l.in_flight,in_flight=false where l.id=job.id;
    token := gen_random_uuid();
    update account_mail.queue q set recipient=address, claim=token, lease_until=now()+interval '2 minutes'
      where q.id=job.id;
    return query select job.id, token, address, job.template;
  end loop;
end;
$$;

/** Fence stale workers and persist a stable request identity before any network send. */
create function public.prepare_account_mail(p_id uuid, p_claim uuid, p_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
declare prior text;
begin
  if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  perform 1 from account_mail.ledger l join account_mail.queue q on q.id=l.id
    where q.id=p_id and q.claim=p_claim and q.lease_until>now() and l.state='queued' for update of l,q;
  if not found then return false; end if;
  select request_hash into prior from account_mail.ledger where id=p_id;
  if prior is not null and prior <> p_hash then
    update account_mail.ledger set state='reconcile',failure='payload_changed',request_hash=null where id=p_id;
    delete from account_mail.queue where id=p_id;
    return false;
  end if;
  update account_mail.ledger set request_hash=p_hash,first_attempt_at=coalesce(first_attempt_at,now()),
    attempts=attempts+1,uncertain=uncertain or in_flight,in_flight=true,failure='ambiguous' where id=p_id and attempts<6
    and (first_attempt_at is null or first_attempt_at>now()-interval '23 hours');
  return found;
end;
$$;

/** Record sanitized acceptance or a bounded retry, using the current lease token only. */
create function public.finish_account_mail(p_id uuid, p_claim uuid, p_outcome text, p_provider_id uuid default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare tries integer; unresolved boolean;
begin
  if p_outcome is null or p_outcome not in ('accepted','transient','ambiguous','rejected')
    or (p_outcome='accepted' and p_provider_id is null) then return false; end if;
  perform 1 from account_mail.ledger l join account_mail.queue q on q.id=l.id
    where q.id=p_id and q.claim=p_claim and l.state='queued' and l.in_flight for update of l,q;
  if not found then return false; end if;
  select attempts,uncertain into tries,unresolved from account_mail.ledger where id=p_id;
  if tries=0 then return false; end if;
  update account_mail.ledger set state=case
    when p_outcome='accepted' then 'accepted'
    when p_outcome='rejected' and unresolved then 'reconcile'
    when p_outcome='rejected' then 'failed'
    when tries>=6 and (unresolved or p_outcome='ambiguous') then 'reconcile'
    when tries>=6 then 'failed' else 'queued' end,
    uncertain=case when p_outcome='accepted' then false else unresolved or p_outcome='ambiguous' end,
    in_flight=false,
    provider_id=case when p_outcome='accepted' then p_provider_id end,
    request_hash=case when p_outcome in ('accepted','rejected') or tries>=6 then null else request_hash end,
    failure=case when p_outcome='accepted' then null else p_outcome end where id=p_id;
  if p_outcome in ('accepted','rejected') or tries>=6 then
    delete from account_mail.queue where id=p_id;
  else
    update account_mail.queue set claim=null,lease_until=null,
      due_at=now()+make_interval(secs => least(3600,60*power(2,tries-1)::integer)) where id=p_id;
  end if;
  return true;
end;
$$;

revoke all on function public.claim_account_mail(), public.prepare_account_mail(uuid,uuid,text),
  public.finish_account_mail(uuid,uuid,text,uuid) from public, anon, authenticated, service_role;
grant execute on function public.claim_account_mail(), public.prepare_account_mail(uuid,uuid,text),
  public.finish_account_mail(uuid,uuid,text,uuid) to service_role;
