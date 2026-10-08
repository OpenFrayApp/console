-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

-- A recovery snapshot cannot prove whether pending work was accepted after the snapshot.
begin;
lock table account_mail.ledger, account_mail.queue in share row exclusive mode;
update account_mail.ledger
set state='reconcile',failure='recovery',uncertain=true,in_flight=false,request_hash=null
where state='queued';
delete from account_mail.queue;
commit;
