# Account email database contract

The console owns the account-email migration. The admin repo owns the server-only
worker, React Email source, template publisher, and deployment procedure.
Only signup welcomes and authenticated deletion confirmations are automatic.
Terms, Privacy, combined policy updates, and case-by-case security notices are
prepared, reviewed, and sent manually in Resend. The parent’s
[manual notice guide](https://github.com/OpenFrayApp/openfray/blob/develop/docs/legal-publication.md)
is authoritative for this workflow and repository ownership.
Changing a policy date does not authorize or trigger sending.
Source merge, service deployment, and delivery activation are separate actions.

## Account creation

`20261008062712_account_mail.sql` installs an INSERT-only trigger on `auth.users`.
It queues a welcome for each new account with a usable address. It performs no
network request and does not backfill accounts that existed before installation.
The trigger freezes installation time and ignores historical Auth records replayed during recovery.
Sign-ins and linked providers update existing records and create no welcome event.
Missing or unusable addresses skip the welcome without rejecting account creation.

`account_mail.ledger` has a unique `(event, owner_id)` identity. It pins
`openfray-welcome-v3` and retains terminal state for the account’s lifetime.
`account_mail.queue` holds due work and temporary recipient snapshots.
Both tables have RLS, no client policies, and no API-role schema or table grants.
Do not add `account_mail` to PostgREST’s exposed schemas or Realtime publications.

## Version cutover

`20261008135619_account_mail_v3_cutover.sql` changes new welcome and legal jobs to v3.
It keeps the original account-installation cutoff, legal dates, and confirmed security identities.
Legacy terminal records remain valid. Existing queued work moves to `reconcile` with
`template_cutover`, retaining its event identity and attempt count. Queue addresses and
request hashes are removed. Interrupted attempts retain their uncertainty.

Pause sending, scheduling, and legal registration, then wait for active invocations to finish.
Apply the migration and deploy the admin’s v3 worker and deletion handler with reviewed mappings.
The v3 worker refuses obsolete generic jobs; it never substitutes a newer template for them.
Legal bodies declare no variables. Publication eligibility and worker date validation remain unchanged.
Review quarantined work through a protected operator connection before any resume.

## Worker boundary

Only `service_role` can execute these public RPCs:

- `claim_account_mail()` leases one due job using `FOR UPDATE SKIP LOCKED`.
- `prepare_account_mail(id, claim, hash)` fences expired claims and freezes the
  exact outbound request before contacting Resend.
- `finish_account_mail(id, claim, outcome, provider_id)` records a sanitized result.

The security-definer functions use a fixed search path and fully qualified private
objects. Ordinary account holders cannot claim jobs, enumerate addresses, select templates,
or enqueue messages. The capability-gated security operator RPCs are the explicit exception
for reviewed security selections. The service role also has no direct private-table access.
Existing moderation grants and routing are unchanged.

Claims last two minutes. The worker’s provider requests time out after 15 seconds.
A stale worker cannot prepare or settle a replacement claim. Queue and ledger locks
follow the ledger-first deletion order. No database transaction spans a provider call.

Retries use the same job UUID, recipient snapshot, template identity, and payload hash.
Changing routing or template configuration during a retry quarantines the job.
There are at most six attempts, with exponential delays from one minute to 16 minutes.
The worker refuses retries after 23 hours from the first prepared attempt, allowing
margin inside Resend’s 24-hour idempotency window.

`accepted` means Resend accepted the request. It does not mean mailbox delivery.
An interrupted attempt remains ambiguous until retried within the safe window.
Expired ambiguous jobs move to `reconcile`. They are never automatically resent.
Unresolved uncertainty survives later rate limits or rejections until acceptance or
operator reconciliation resolves it. A lost in-flight attempt also preserves uncertainty.
Jobs with only definitive failures become `failed` after rejection or retry exhaustion.
The ledger retains only allowlisted failure categories, not provider response bodies.
Terminal jobs drop the queue’s address and the recipient-derived request hash.

## Retained legal and security contracts

Legal registration is disabled with `LEGAL_PUBLICATION_ENABLED=false`; the parent
has no post-deployment registration job. Legal baselines and the security operator
command are not part of current setup. Their RPCs, capabilities, templates, and
history remain in source and the database. Keep those records for recovery and
replay protection; manual sending does not remove the older technical paths.

`register_legal_publication(revision, published_at, terms, privacy, baseline)`
remains service-role-only. Browser roles cannot register publications or read
history, recipients, or sending state. Its locked singleton records document dates
independently. Known dates and repeated revisions cannot create another delivery.
Publication history contains no recipient identifiers and survives account erasure.

Retained legal jobs pin their document dates and template identity. Simultaneous
Terms/Privacy changes select `openfray-legal-v3`; individual changes select
`openfray-terms-v3` or `openfray-privacy-v3`. Eligibility uses account creation
time and a usable server-held address. Erasure prevents preparing a claimed job.

`preview_security_notice(id, digest, template_id, template_revision, accounts)`
and `confirm_security_notice(id, digest, accounts, reviewed)` remain gated by
a current account and `may('security.notify')`. Explicit capability denials apply.
Service credentials cannot execute these operator RPCs. Reviews freeze an explicit
selection of 1–1000 eligible accounts and expire after one hour.

Retained security deliveries use a unique `security/<incident UUID>` identity
and pin their content digest, hosted template ID, and revision. Confirmed,
recipient-free version history prevents replay. Account erasure removes private
review selections, queued deliveries, and account-linked ledger entries.
No incident prose or address enters the security review tables.

Both delivery types retain the queue’s claim fencing, request hashes, retry bounds,
and sanitized outcomes. Keep uncertain attempts quarantined. An in-flight provider
request cannot be recalled by erasure. A fresh legal baseline or new incident
identity is not a retry or recovery procedure.

Follow [database recovery](./recovery.md) before resuming workers on a restored
database. Preserve dates published after the snapshot and reconcile them before
clearing `registration_paused`; leave configured legal registration disabled.
Recovery must retain publication, notified-version, confirmed security, and
uncertain-attempt history.

## Erasure and verification

The ledger references `auth.users(id) ON DELETE CASCADE`. Queue rows cascade from
the ledger. Existing `delete_account()` therefore erases both without another client
call. A deleted account cannot prepare a previously claimed job.
Deletion cannot recall a provider request already in flight.

## Deletion confirmation

Issue #112 uses the admin-owned `account-delete` Edge Function. The console sends
an empty object with its current session. The handler verifies that token with Auth,
holds the trusted address in memory, and calls `delete_account()` with the caller’s
JWT and anon key. It accepts no recipient, account ID, or template from the caller.
No service-role key or admin deletion API selects the target.

`20261008090545_account_deletion_single_winner.sql` locks the caller’s Auth row.
An absent account fails, so concurrent requests and replays cannot both report
successful erasure. Existing cleanup, cascading mail erasure, and recovery tombstones
remain in the same transaction. A failed deletion rolls back and attempts no mail.

Only after a successful RPC does the handler attempt the reviewed hosted
`openfray-deletion-v3` template. It uses the welcome path’s domain checks,
tracking restrictions, explicit mode, confirmed staging inbox, and pinned revision.
The entire provider phase has a 15-second deadline and at most one send request.
Missing addresses or mail configuration skip that attempt without blocking erasure.
Mail rejection, timeout, or process interruption cannot undo the committed deletion.

This confirmation bypasses the queue and ledger entirely. Its address, provider result,
and retry state are never persisted or logged by the handler. There is no later retry.
A process interruption or lost console response can leave deletion complete without
confirmation. Check the account before retrying; an absent account cannot send again.
The console treats `deleted: true` as success independently of mail delivery and
clears its identity before local sign-out. The typed-email guard is unchanged.

Application erasure does not recall existing provider delivery records, mailbox copies,
or voluntarily submitted feedback. Replies reach `info@openfray.app` and do not
create an account. Recovery keeps the existing identifier-only deletion tombstone,
which contains no confirmation address or delivery retry record.
The admin deployment guide documents the authorized staging-account and inbox checks.

Run the focused tests, fresh schema/type verification, and hostile boundary suite:

```bash
npx vitest run tests/database/accountMail.test.ts tests/database/securityNotices.test.ts tests/database/migrations.test.ts
npm run db:types
npm run db:verify
npm run db:boundary
npm run db:mail-concurrency
```

Generate types from a fresh local reset after applying the migration. The authority
verifier hashes both `public` and `account_mail`. The boundary suite checks the
trusted trigger, private grants, RPC restrictions, and account-erasure cascade.
The concurrency check uses two PostgreSQL sessions against the fixed local database
and requires `psql` and an empty queue. Encrypted backups include the private queue
and ledger data, preserving pending attempts and durable acceptance records.
Before reopening a restored database, suspend workers and run
`supabase/snippets/quarantine-account-mail-recovery.sql` through a protected operator
connection. It quarantines all restored pending work, including unattempted snapshots
whose jobs may have been accepted after the backup. The manual local restore tool runs
this gate automatically. See [Database recovery](./recovery.md) for hosted restore safeguards.
The admin deployment guide covers staging delivery and manual reconciliation.
Production activation requires separate authorization. Use the coordinated
[deployment verification procedure](./account-email-verification.md) for issue #114.
