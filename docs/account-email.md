# Account email database contract

The console owns the account-email migration. The admin repo owns the server-only
worker, React Email source, template publisher, and deployment procedure.
This slice implements the welcome email in console issue #110.

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

## Erasure and verification

The ledger references `auth.users(id) ON DELETE CASCADE`. Queue rows cascade from
the ledger. Existing `delete_account()` therefore erases both without another client
call. A deleted account cannot prepare a previously claimed job.
Deletion cannot recall a provider request already in flight.

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
