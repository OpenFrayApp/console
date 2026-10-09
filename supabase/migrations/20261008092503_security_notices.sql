-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

insert into public.capabilities(capability,description)
  values ('security.notify','Review and confirm selected security notices') on conflict do nothing;
insert into public.role_capabilities(role,capability)
  values ('admin','security.notify') on conflict do nothing;

create table account_mail.security_notices (
  id uuid primary key,
  digest text not null check (digest ~ '^[a-f0-9]{64}$'),
  template_id uuid not null,
  template_revision uuid not null,
  reviewer uuid references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now()+interval '1 hour',
  confirmed_at timestamptz,
  recipient_count integer not null check (recipient_count between 1 and 1000)
);
create table account_mail.security_recipients (
  notice_id uuid not null references account_mail.security_notices(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  primary key(notice_id,owner_id)
);
alter table account_mail.security_notices enable row level security;
alter table account_mail.security_recipients enable row level security;
revoke all on account_mail.security_notices,account_mail.security_recipients from public,anon,authenticated,service_role;
alter table account_mail.ledger add column security_id uuid references account_mail.security_notices(id);
alter table account_mail.ledger drop constraint ledger_message_check;
alter table account_mail.ledger add constraint ledger_message_check check (
  (event='welcome' and template='openfray-welcome-v1' and publication_id is null
    and security_id is null and terms_date is null and privacy_date is null)
  or (event='legal/'||publication_id::text and publication_id is not null and security_id is null and (
    (template='openfray-terms-v1' and terms_date is not null and privacy_date is null)
    or (template='openfray-privacy-v1' and terms_date is null and privacy_date is not null)
    or (template='openfray-legal-v1' and terms_date is not null and privacy_date is not null)
  ))
  or (security_id is not null and event='security/'||security_id::text
    and template ~ '^openfray-security-v1-[a-f0-9]{64}$' and publication_id is null
    and terms_date is null and privacy_date is null)
);

/** Freeze an authorized operator's exact rendered version and selected affected accounts. */
create function public.preview_security_notice(p_id uuid,p_digest text,p_template_id uuid,
  p_template_revision uuid,p_accounts uuid[]) returns integer
language plpgsql security definer set search_path = public as $$
declare prior account_mail.security_notices; selected uuid[];
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid())
    or not coalesce(public.may('security.notify'),false) then raise exception 'Unauthorized'; end if;
  if p_id is null or p_digest is null or p_digest !~ '^[a-f0-9]{64}$'
    or p_template_id is null or p_template_revision is null or p_accounts is null
    or cardinality(p_accounts) not between 1 and 1000
    or cardinality(p_accounts)<>(select count(distinct a) from unnest(p_accounts) a) then
    raise exception 'Invalid review'; end if;
  select array_agg(a order by a) into selected from unnest(p_accounts) a;
  -- The identity lock also fences concurrent first previews before the row exists.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into prior from account_mail.security_notices where id=p_id for update;
  if found then
    if prior.digest<>p_digest or prior.template_id<>p_template_id
      or prior.template_revision<>p_template_revision or prior.reviewer is distinct from auth.uid()
      or prior.confirmed_at is not null
      or selected is distinct from (select array_agg(owner_id order by owner_id)
        from account_mail.security_recipients where notice_id=p_id) then raise exception 'Review changed'; end if;
    update account_mail.security_notices set expires_at=now()+interval '1 hour' where id=p_id;
    return prior.recipient_count;
  end if;
  perform id from auth.users where id=any(selected) order by id for key share;
  if (select count(*) from auth.users where id=any(selected) and account_mail.usable_mailbox(email))<>cardinality(selected) then
    raise exception 'Invalid selection'; end if;
  insert into account_mail.security_notices(id,digest,template_id,template_revision,reviewer,recipient_count)
    values(p_id,p_digest,p_template_id,p_template_revision,auth.uid(),cardinality(selected));
  insert into account_mail.security_recipients select p_id,unnest(selected);
  return cardinality(selected);
end;
$$;

/** Queue only the reviewed selection after explicit facts and recipient confirmation. */
create function public.confirm_security_notice(p_id uuid,p_digest text,p_accounts uuid[],p_reviewed boolean)
returns text language plpgsql security definer set search_path = public as $$
declare notice account_mail.security_notices; selected uuid[];
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid())
    or not coalesce(public.may('security.notify'),false) then raise exception 'Unauthorized'; end if;
  select * into notice from account_mail.security_notices where id=p_id for update;
  if not found then raise exception 'Review required'; end if;
  if p_reviewed is distinct from true or p_digest is distinct from notice.digest
    or (notice.confirmed_at is null and notice.reviewer is distinct from auth.uid()) then raise exception 'Review changed'; end if;
  if notice.confirmed_at is not null then return 'already_confirmed'; end if;
  if notice.expires_at<now() then raise exception 'Review expired'; end if;
  select array_agg(a order by a) into selected from unnest(p_accounts) a;
  perform id from auth.users where id=any(selected) order by id for key share;
  if cardinality(selected) is distinct from notice.recipient_count
    or selected is distinct from (select array_agg(owner_id order by owner_id)
      from account_mail.security_recipients where notice_id=p_id)
    or (select count(*) from auth.users where id=any(selected) and account_mail.usable_mailbox(email))<>notice.recipient_count then
    raise exception 'Review changed'; end if;
  with deliveries as (
    insert into account_mail.ledger(owner_id,event,template,security_id)
      select owner_id,'security/'||p_id::text,'openfray-security-v1-'||notice.digest,p_id
      from account_mail.security_recipients where notice_id=p_id returning id
  ) insert into account_mail.queue(id) select id from deliveries;
  update account_mail.security_notices set confirmed_at=now(),reviewer=null where id=p_id;
  delete from account_mail.security_recipients where notice_id=p_id;
  return 'queued';
end;
$$;
revoke all on function public.preview_security_notice(uuid,text,uuid,uuid,uuid[]),
  public.confirm_security_notice(uuid,text,uuid[],boolean) from public,anon,authenticated,service_role;
grant execute on function public.preview_security_notice(uuid,text,uuid,uuid,uuid[]),
  public.confirm_security_notice(uuid,text,uuid[],boolean) to authenticated;

alter function public.claim_account_mail() set schema account_mail;
alter function account_mail.claim_account_mail() rename to claim_delivery;
revoke all on function account_mail.claim_delivery() from public,anon,authenticated,service_role;
/** Extend the shared fenced lease with the incident's immutable hosted template identity. */
create function public.claim_account_mail()
returns table(id uuid,claim uuid,recipient text,template text,terms_date text,privacy_date text,
  template_id uuid,template_revision uuid)
language sql security definer set search_path = public as $$
  select job.*,s.template_id,s.template_revision from account_mail.claim_delivery() job
    join account_mail.ledger l on l.id=job.id
    left join account_mail.security_notices s on s.id=l.security_id;
$$;
revoke all on function public.claim_account_mail() from public,anon,authenticated,service_role;
grant execute on function public.claim_account_mail() to service_role;
