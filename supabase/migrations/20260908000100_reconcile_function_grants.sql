-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

-- Hosted defaults grant API roles explicitly; revoking PUBLIC leaves those grants intact.
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
  public.roles_of(uuid),
  public.save_encounter_revision(uuid, uuid, bigint, uuid, jsonb, timestamptz),
  public.share(text),
  public.start_live_view(uuid, text, text),
  public.stop_all_live_views(),
  public.stop_live_view(text),
  public.takeover_encounter_writer(uuid, uuid)
from public, anon, authenticated;

grant execute on function
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
  public.grant_role(uuid, text, text),
  public.live_view_topic_active(text),
  public.live_view_topic_owned(text),
  public.may(text),
  public.may_publish_more(),
  public.may_use_reserved_byline(),
  public.my_capabilities(),
  public.report_share(text, text, text, text),
  public.reported_share(text),
  public.reports_for(text),
  public.reports_open(),
  public.reports_queue(integer),
  public.restore_capability(uuid, text),
  public.revoke_role(uuid, text),
  public.save_encounter_revision(uuid, uuid, bigint, uuid, jsonb, timestamptz),
  public.share(text),
  public.start_live_view(uuid, text, text),
  public.stop_all_live_views(),
  public.stop_live_view(text),
  public.takeover_encounter_writer(uuid, uuid)
to authenticated;

grant execute on function
  public.live_view_topic_active(text),
  public.report_share(text, text, text, text),
  public.share(text)
to anon;
