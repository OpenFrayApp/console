-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

-- Future postgres-owned public objects require explicit grants in their creating migration.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;

-- Normalize only application objects; extension and provider-owned schemas keep their grants.
revoke all on table
  public.audit_log,
  public.byline_grants,
  public.campaigns,
  public.capabilities,
  public.capability_denials,
  public.creatures,
  public.effects,
  public.encounter_revisions,
  public.encounter_writer_leases,
  public.encounters,
  public.live_view_sessions,
  public.players,
  public.role_capabilities,
  public.role_inherits,
  public.share_reports,
  public.share_tombstones,
  public.shares,
  public.spells,
  public.takedown_notices,
  public.user_roles
from service_role;

revoke all on sequence public.audit_log_id_seq from public, anon, authenticated, service_role;

revoke execute on function
  public.account_libraries(),
  public.account_made(uuid, integer),
  public.account_overview(uuid),
  public.accounts(integer),
  public.answer_reports(text, text),
  public.audit_recent(integer),
  public.capabilities_of(uuid),
  public.claim_encounter_writer(uuid, uuid),
  public.delete_account(),
  public.deny_capability(uuid, text, text),
  public.grant_gm_on_signup(),
  public.grant_role(uuid, text, text),
  public.live_view_topic_active(text),
  public.live_view_topic_owned(text),
  public.may(text),
  public.may_publish_more(),
  public.may_use_reserved_byline(),
  public.my_capabilities(),
  public.note_action(text, text, jsonb),
  public.report_share(text, text, text, text),
  public.reported_share(text),
  public.reports_for(text),
  public.reports_open(),
  public.reports_queue(integer),
  public.restore_capability(uuid, text),
  public.revoke_role(uuid, text),
  public.rls_auto_enable(),
  public.roles_of(uuid),
  public.save_encounter_revision(uuid, uuid, bigint, uuid, jsonb, timestamptz),
  public.share(text),
  public.start_live_view(uuid, text, text),
  public.stop_all_live_views(),
  public.stop_live_view(text),
  public.takeover_encounter_writer(uuid, uuid)
from service_role;

-- The report worker filters earlier reports and deletes sent notices using webhook IDs.
grant select (id, code, reason, resolution, created_at) on public.share_reports to service_role;
grant select (id), delete on public.takedown_notices to service_role;
