# Newsletter signup persistence

This is the #141 database contract. Newsletter delivery remains disabled.
Admin owns the server handler and provider adapter. Site owns the checked OAuth attempt.
Neither caller is implemented by this migration.

Activation requires #142–#145, including withdrawal, account erasure, provider review,
and integrated publication checks. Existing account deletion and service mail are unchanged.
The subscription foreign key deliberately restricts identity deletion until the later
capture, fence, and removal transaction is implemented. Do not enable signup before that transaction exists.

## Caller identity and attempt

The server verifies the caller with current Auth `getUser` before forwarding the caller JWT.
Only `consume_newsletter_signup_intent` grants execution to `authenticated`.
It derives identity from `auth.uid()` and email from the locked `auth.users` row.
No browser request accepts an owner, recipient, consent timestamp, source, or wording override.

Only a checked sign-up choice requests an intent. Unchecked choices and sign-in make no newsletter call.
The browser generates a 32-byte random proof, encoded as 64 lowercase hexadecimal characters.
The server passes its SHA-256 hash to the issuance RPC. The proof, capability, and originating
OAuth attempt stay together in per-tab session storage. Do not put either secret in a URL or log.

Issuance returns a server-generated, 64-character capability and an expiry exactly ten minutes
from issuance. The capability authorizes signup consumption only. The database stores its hash.
This lifetime matches the site's OAuth attempt window. It is unrelated to future confirmation links.

The callback must match the original attempt and install the verified Auth session before consumption.
It consumes once, then discards the browser intent. Failed, canceled, and abandoned handoffs discard
browser material. Explicit cancellation also makes a best-effort discard request to the server.
A missing discard request cannot extend the original expiry.

The server must rate-limit issuance and validate same-origin requests before exposing its service-only RPC.
Issuance itself never grants consent. The proof binds the browser attempt; it is not an OAuth identity assertion.

## RPC signatures

All functions below live in `public` for PostgREST transport. Only consumption grants
`authenticated` execution. Every other function grants execution only to `service_role`.
`PUBLIC`, `anon`, and `report_ingress` receive no execution grants.

| Function                           | Arguments                                                                              | Result                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `issue_newsletter_signup_intent`   | `p_attempt_hash text`                                                                  | Rows: `capability text, expires_at timestamptz`                                                         |
| `consume_newsletter_signup_intent` | `p_capability text, p_attempt_proof text`                                              | One row: `lifecycle uuid, status text`                                                                  |
| `discard_newsletter_signup_intent` | `p_capability text, p_attempt_proof text`                                              | `void`                                                                                                  |
| `prepare_newsletter_signup`        | `p_lifecycle uuid`                                                                     | Rows: `operation uuid, generation uuid, action text, recipient text, provider_id uuid, attempt integer` |
| `finish_newsletter_signup`         | `p_operation uuid, p_generation uuid, p_outcome text, p_provider_id uuid default null` | `boolean`                                                                                               |
| `cancel_newsletter_signup`         | `p_lifecycle uuid`                                                                     | `boolean`                                                                                               |
| `pending_newsletter_cleanup`       | `p_after uuid default null`                                                            | Up to 100 rows: `lifecycle uuid`                                                                        |
| `prepare_newsletter_cleanup`       | `p_lifecycle uuid`                                                                     | Rows: `operation uuid, generation uuid, provider_id uuid, action text`                                  |
| `finish_newsletter_cleanup`        | `p_operation uuid, p_generation uuid, p_provider_id uuid, p_outcome text`              | `boolean`                                                                                               |
| `prune_newsletter_signup_intents`  | None                                                                                   | `void`                                                                                                  |

Invalid issuance returns no row. Discard always returns void and deletes only a matching,
unconsumed intent. It reveals no existence, identity, or subscription status.
Consumed receipts remain until their original expiry.

Consumption returns `invalid` for a missing, mismatched, canceled, expired, or wrong-owner capability.
It returns `unavailable` when another association or unresolved cleanup blocks the address.
Neither result authorizes provider I/O. An unavailable intent is consumed without granting future entitlement.
Expired and invalid capabilities cannot create a new intent or lifecycle.

Other statuses describe the current lifecycle: `ready`, `create_pending`, `activate_ready`,
`activate_pending`, `retry_activate`, or `subscribed`. A terminal failure receipt returns
`failed` with no lifecycle. Only `subscribed` establishes provider acceptance.
Replays query current association; they never return historical success after consent removal.
A duplicate explicit choice cannot reset an accepted subscription or replenish an existing attempt budget.

These preparation results are server work instructions, not browser status payloads.
The handler must sanitize results and establish provider-backed status for #142.

## Provider operation protocol

A successful preparation persists the operation identity before network I/O.
The returned generation and operation must be passed unchanged to its finish call.
An empty preparation result authorizes no provider call. It does not establish success or absence.

There are at most two signup attempts. An attempt may contain an ineligible create substep
and an exact-ID activation substep. Activation after a successful create uses the same attempt number.
A definite failed substep permits the second attempt. Preparation cannot replenish the budget.

For `action=create`, create the contact unsubscribed and outside the newsletter segment.
For `action=activate`, use only the returned exact provider ID and the configured newsletter segment.
Do not target activation by email. Do not reset an existing accepted subscriber during reconciliation.
Do not modify bounce, complaint, or team-wide suppression.

Finish outcomes are:

- `accepted`: The original operation definitively completed. Supply the exact provider UUID.
- `rejected`: The original operation definitively did not take effect. For activation, retain its exact provider UUID.
- `unknown`: The original operation may still complete. For activation, retain its exact provider UUID.

For create, `rejected` and `unknown` require a null provider ID.
A later definitive result may settle the same unknown operation. Duplicate definitive results return false.
A successful finish boolean means the settlement was recorded, not that subscription succeeded.
Only accepted activation of current, unexpired consent produces `subscribed`.

Contact creation has no established idempotency guarantee. A timeout, aborted request, lease expiry,
or missing GET result is never a definite rejection. An unknown create blocks another create.
A provider event cannot issue an intent, create consent, or authorize a new operation.

The server gets only one automatic signup retry. If that retry cannot safely proceed, report failure
and cancel the lifecycle. Do not leave an unknown outcome authorized after presenting terminal failure.
Cancellation preserves cleanup ownership, so late acceptance can only trigger removal.
Later account-page retry requires double opt-in under #142.

All preparation and finish calls enforce the original intent expiry for pending signup authorization.
No callback or retry extends that expiry. At expiry, or after the second definite rejection,
consent evidence is removed. Unknown operations remain only for cleanup.
Accepted subscriptions are not expired by pruning an old signup receipt.

## Cancellation and cleanup

The service-only cancellation primitive accepts an existing lifecycle selector.
It derives the original address and current account address from trusted rows.
It removes consent and invalidates consumed receipts without deleting the account.
It is not the authenticated withdrawal endpoint or the all-address erasure transaction.
Those remain #143 and #144 work.

Cancellation writes a temporary hash-only cutoff for each derived address.
An unbound intent issued at or before that cutoff cannot consume for the address.
The cutoff expires exactly ten minutes after cancellation, when every pre-cutoff intent is expired.
Cleanup retries do not extend it. Repeated cancellation of an already removed association does not extend it.
This temporary coordination survives identity deletion and contains no wording or consent history.

All decisions serialize on normalized email. Consumption and cancellation also lock the Auth account
before address locks. Multiple address locks use lexical order.
Fresh explicit intent can start a new lifecycle only after old cleanup is definitively complete.
No timeout releases an unresolved operation.

Cleanup preparation returns `delete` with an exact provider ID and a new deletion operation.
Another preparation supersedes that deletion proof. The finish outcome is `removed` or `unknown`.
Unknown deletion returns false and retains cleanup. Retry only that lifecycle's exact provider ID.

Removal acknowledgement succeeds only after every create and activation definitively settled,
with unchanged generation, operation, provider ID, and settlement revision.
A late create or activation invalidates an earlier deletion proof, even if its acknowledgement arrives later.
Prepare and confirm another deletion after settlement.

If no provider ID exists and every operation definitively failed, preparation removes the workflow
and returns `complete` with null operation/provider IDs. It performs no provider call.
An unresolved create with no ID returns no row and remains cleanup-pending.

Successful final cleanup deletes operations and coordination. It leaves no consent archive or
permanent suppression record. Provider logs, backups, and external suppression are outside this claim.
Provider outages cannot guarantee immediate external mutation. Production activation remains blocked
until the provider guarantees and truthful cleanup-pending presentation receive explicit review.

## Persistence and maintenance

The private `newsletter` schema enables RLS on every table and grants no direct API-role access:

- `subscriptions`: Active/request evidence, original address, owner, timestamp, source, and wording version.
- `workflows`: Per-address signup coordination, expiry, attempt budget, and exact provider identity.
- `operations`: Pre-I/O identities, settlement, and cleanup revision.
- `signup_intents`: Hashed capability/proof and bounded consume/failure receipt.
- `cancellation_fences`: Address hash, cancellation cutoff, and bounded expiry.

Cleanup discovery returns only lifecycle UUIDs in ascending order, capped at 100.
Pass the last UUID as `p_after` for the next page. Empty output ends the scan.
The UUID-typed cursor authorizes no provider action. Restart scans from the beginning.
Discovery changes no state or attempt budget, and remains available after identity removal.

Run pruning and cleanup through the server's reviewed maintenance path before activation.
Pruning removes expired receipts/cutoffs and closes expired pending authorization.
It never settles unknown provider work. This migration installs no scheduler or provider trigger.
Cleanup retains only the information required to settle outstanding operations.

The authority dump and encrypted data backup include `newsletter`.
Restore procedures must quarantine restored newsletter work before any provider worker starts.
Reconcile removal and external provider state before reopening signup. Database restoration alone
cannot establish that previously withdrawn consent is current. Integrated recovery remains a release gate.

## Later ticket compatibility

#142 adds separate high-entropy, hashed, purpose-bound confirmation capabilities.
Their expiry must be exactly seven days, with `now >= expires_at` rejected and expired requests removed.
Pending confirmation must authorize no eligible provider contact before consumption.
This migration does not implement confirmation, confirmation delivery, or account status.

The original subscription address remains linked after an account email change.
There is no consent transfer. #143 must expose all associated addresses and no-sign-in withdrawal.
It must also fence the current trusted address when no subscription exists.

#144 must capture all associated addresses, fence work, remove consent, and delete identity in one
reviewed transaction while leaving independent cleanup available. Preserve the existing caller-JWT
`delete_account()` authorization. Do not weaken service-mail delivery or deletion confirmation.

## Verification

`tests/database/newsletter.test.ts` exercises the actual RPC and role seam in PGlite.
`tests/database/migrations.test.ts` rebuilds the complete lineage and injects hostile privilege drift.
`supabase/tests/database-boundary.sql` checks exact execution grants, private RLS, and hostile actors.
Authority and backup script tests include the new private schema.

Real generated types must come from the Supabase CLI against the complete local lineage.
A separately isolated local run does not authorize resetting another worktree's shared database.
No hosted database or provider call is needed for these tests.
