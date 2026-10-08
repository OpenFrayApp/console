# Account email database contract

The console owns the account-email migration. The admin repo owns the server-only
worker, React Email source, template publisher, and deployment procedure.
Welcome emails are defined in console issue #110; published legal-date notices in #111.

## Account creation

`20261008062712_account_mail.sql` installs an INSERT-only trigger on `auth.users`.
It queues a welcome for each new account with a usable address. It performs no
network request and does not backfill accounts that existed before installation.
The trigger freezes installation time and ignores historical Auth records replayed during recovery.
Sign-ins and linked providers update existing records and create no welcome event.
Missing or unusable addresses skip the welcome without rejecting account creation.

`account_mail.ledger` has a unique `(event, owner_id)` identity. It pins
`openfray-welcome-v1` and retains terminal state for the account’s lifetime.
`account_mail.queue` holds due work and temporary recipient snapshots.
Both tables have RLS, no client policies, and no API-role schema or table grants.
Do not add `account_mail` to PostgREST’s exposed schemas or Realtime publications.

## Worker boundary

Only `service_role` can execute these public RPCs:

- `claim_account_mail()` leases one due job using `FOR UPDATE SKIP LOCKED`.
- `prepare_account_mail(id, claim, hash)` fences expired claims and freezes the
  exact outbound request before contacting Resend.
- `finish_account_mail(id, claim, outcome, provider_id)` records a sanitized result.

The security-definer functions use a fixed search path and fully qualified private
objects. Browser roles cannot claim jobs, enumerate addresses, select templates,
or enqueue messages. The service role also has no direct private-table access.
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

## Legal publication

`register_legal_publication(revision, published_at, terms, privacy, baseline)` is
service-role-only. The admin handler verifies live metadata before invoking it.
The parent deployment job separately verifies successful Pages production publication.
Browser roles cannot register publications or read history, recipients, or sending state.

A locked singleton serializes registration and baseline initialization. The first call
requires explicit baseline approval and records both dates without queuing historical mail.
Later registrations remember each document/date independently, including baseline dates.
Known dates never send again, even after rollback or same-date wording edits.
A repeated Git revision must carry the same legal dates and creates no second event.

New dates create one publication and one account delivery per eligible recipient.
A simultaneous Terms/Privacy change selects `openfray-legal-v1`; individual changes select
`openfray-terms-v1` or `openfray-privacy-v1`. Each ledger entry pins its dates and template.
Accounts must exist with a usable server-held address and creation time at or before publication.
Later accounts receive no historical notices. The worker rechecks existence when claiming,
and erasure prevents preparing a previously claimed job. Addresses are resolved at delivery.

Legal deliveries use the existing private queue, claim fencing, request hashes, retries,
and long-term acceptance ledger. Publication history contains no recipient identifiers
and survives account erasure so future deployments cannot replay an old document date.
Recovery must preserve this history alongside the queue and ledger. The quarantine
snippet pauses registration until an operator reconciles dates published after the snapshot.
Resume only after restoring those history entries and clearing `registration_paused`.
A fresh baseline would discard replay protection and is not a recovery procedure. See the parent’s
[legal publication procedure](https://github.com/OpenFrayApp/openfray/blob/main/docs/legal-publication.md)
for the explicit baseline and activation gates.

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
`openfray-deletion-v1` template. It uses the welcome path’s domain checks,
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
npx vitest run tests/database/accountMail.test.ts tests/database/migrations.test.ts
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
Production activation requires separate authorization.
