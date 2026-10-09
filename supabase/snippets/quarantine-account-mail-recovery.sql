-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

-- A recovery snapshot cannot prove whether pending work was accepted after the snapshot.
begin;
-- Acquire publication state before ledger locks, matching registration's lock order.
do $$
begin
  if to_regclass('account_mail.legal_state') is not null then
    update account_mail.legal_state set registration_paused=true;
  end if;
end;
$$;
lock table account_mail.ledger, account_mail.queue in share row exclusive mode;
update account_mail.ledger
set state='reconcile',failure='recovery',uncertain=true,in_flight=false,request_hash=null
where state='queued';
delete from account_mail.queue;
commit;
