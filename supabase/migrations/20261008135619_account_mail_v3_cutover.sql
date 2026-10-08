-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

begin;

-- Deploy with sending and publication registration paused; drain all in-flight invocations first.
lock table account_mail.ledger, account_mail.queue in access exclusive mode;
alter table account_mail.ledger drop constraint ledger_failure_check;
alter table account_mail.ledger add constraint ledger_failure_check check (
  failure in ('transient','ambiguous','rejected','payload_changed','exhausted',
    'window_expired','no_address','recovery','template_cutover')
);
-- Pending versions require review even when no attempt was recorded. Preserve their event identities.
update account_mail.ledger set state='reconcile',failure='template_cutover',
  uncertain=uncertain or in_flight,in_flight=false,request_hash=null
  where state='queued';
delete from account_mail.queue where id in
  (select id from account_mail.ledger where state='reconcile' and failure='template_cutover');

alter table account_mail.ledger drop constraint ledger_message_check;
alter table account_mail.ledger add constraint ledger_message_check check (
  (event='welcome' and template in ('openfray-welcome-v1','openfray-welcome-v3') and publication_id is null
    and security_id is null and terms_date is null and privacy_date is null)
  or (event='legal/'||publication_id::text and publication_id is not null and security_id is null and (
    (template in ('openfray-terms-v1','openfray-terms-v3') and terms_date is not null and privacy_date is null)
    or (template in ('openfray-privacy-v1','openfray-privacy-v3') and terms_date is null and privacy_date is not null)
    or (template in ('openfray-legal-v1','openfray-legal-v3') and terms_date is not null and privacy_date is not null)
  ))
  or (security_id is not null and event='security/'||security_id::text
    and template ~ '^openfray-security-v1-[a-f0-9]{64}$' and publication_id is null
    and terms_date is null and privacy_date is null)
);


/** Queue one welcome from a new trusted account without contacting a provider. */
create or replace function account_mail.on_account_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare delivery uuid;
begin
  if new.created_at is null or new.created_at < tg_argv[0]::timestamptz
    or not account_mail.usable_mailbox(new.email)
    then return new; end if;
  insert into account_mail.ledger(owner_id,event,template)
    values(new.id,'welcome','openfray-welcome-v3')
    on conflict (event,owner_id) do nothing returning id into delivery;
  if delivery is not null then
    insert into account_mail.queue(id) values(delivery);
  end if;
  return new;
end;
$$;
revoke all on function account_mail.on_account_created() from public, anon, authenticated, service_role;


/** Register a verified publication and snapshot its eligible account IDs atomically. */
create or replace function public.register_legal_publication(p_revision text, p_published_at timestamptz,
  p_terms date, p_privacy date, p_baseline boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare initialized boolean; prior account_mail.legal_publications; publication uuid;
  terms_changed boolean; privacy_changed boolean; outcome text; selected_template text;
begin
  if p_revision is null or p_revision !~ '^[a-f0-9]{40}$' or p_published_at is null
    or p_published_at > now() or p_terms is null or p_privacy is null or p_baseline is null
    or p_terms > (p_published_at at time zone 'UTC')::date
    or p_privacy > (p_published_at at time zone 'UTC')::date then
    raise exception 'Invalid publication';
  end if;
  select s.initialized into initialized from account_mail.legal_state s where singleton for update;
  if (select registration_paused from account_mail.legal_state where singleton) then
    raise exception 'Publication history requires recovery reconciliation';
  end if;
  select * into prior from account_mail.legal_publications where revision=p_revision;
  if found then
    if prior.terms_date<>p_terms or prior.privacy_date<>p_privacy then
      raise exception 'Publication identity changed';
    end if;
    return prior.result;
  end if;
  if not initialized and not p_baseline then raise exception 'Explicit baseline required'; end if;
  if initialized and p_baseline then raise exception 'Baseline already initialized'; end if;
  terms_changed := not exists(select 1 from account_mail.legal_history where document='terms' and updated_date=p_terms);
  privacy_changed := not exists(select 1 from account_mail.legal_history where document='privacy' and updated_date=p_privacy);
  outcome := case when not initialized then 'baseline'
    when terms_changed and privacy_changed then 'combined'
    when terms_changed then 'terms' when privacy_changed then 'privacy' else 'unchanged' end;
  insert into account_mail.legal_publications(revision,published_at,terms_date,privacy_date,result)
    values(p_revision,p_published_at,p_terms,p_privacy,outcome) returning id into publication;
  insert into account_mail.legal_history values ('terms',p_terms,publication),('privacy',p_privacy,publication)
    on conflict(document,updated_date) do nothing;
  update account_mail.legal_state set initialized=true where singleton;
  if outcome not in ('baseline','unchanged') then
    selected_template := case outcome when 'terms' then 'openfray-terms-v3'
      when 'privacy' then 'openfray-privacy-v3' else 'openfray-legal-v3' end;
    with deliveries as (
      insert into account_mail.ledger(owner_id,event,template,publication_id,terms_date,privacy_date)
        select u.id,'legal/'||publication::text,selected_template,publication,
          case when terms_changed then p_terms end,case when privacy_changed then p_privacy end
        from auth.users u where u.created_at<=p_published_at and account_mail.usable_mailbox(u.email)
        on conflict(event,owner_id) do nothing returning id
    ) insert into account_mail.queue(id) select id from deliveries;
  end if;
  return outcome;
end;
$$;
revoke all on function public.register_legal_publication(text,timestamptz,date,date,boolean)
  from public,anon,authenticated,service_role;
grant execute on function public.register_legal_publication(text,timestamptz,date,date,boolean) to service_role;

commit;

