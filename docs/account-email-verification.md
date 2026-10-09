# Verify signup and deletion email deployment

Only signup welcomes and authenticated account-deletion confirmations are wired
into the app. Terms, Privacy, combined updates, and case-by-case security notices
are prepared and sent manually in Resend. No automatic policy-publication job,
Cloudflare token, or legal baseline setup is required.

## Staging target and routing

Resolve Supabase's `develop` branch from the configured parent. Match its project
reference, URL, and database connection; never deploy to the production parent.
Keep credentials in ignored, owner-only files and out of logs.

Normal staging testing uses:

- `ACCOUNT_MAIL_MODE=staging`;
- `ACCOUNT_STAGING_RECIPIENT_MODE=registered`;
- `ACCOUNT_STAGING_PROJECT_REF` matching the runtime's staging `SUPABASE_URL`;
- reviewed welcome/deletion template IDs and revisions;
- a separate worker hook secret and the verified, tracking-disabled sending domain.

Welcome mail goes to the trusted registered account address. Deletion confirmation
uses the authenticated account address held only in memory after erasure. Both
retain `[Staging]` subjects and support Reply-To. Request bodies never choose
recipients or templates.

For a controlled smoke test instead, omit the registered-recipient setting and use
the explicitly confirmed test-inbox override. This is not normal staging behavior.
The reviewed templates contain live-site links; perform account test actions at
the isolated staging console URL.

## Deployment and automatic processing

1. Record clean coordinated source revisions and run applicable tests, type checks,
   lint, builds, fresh database authority, and hostile-boundary verification.
2. Apply reviewed database migrations to staging. Preserve capability checks,
   owner isolation, account erasure, and durable delivery identities.
3. Publish and pin the reviewed welcome/deletion templates explicitly. Verify domain
   readiness, disabled tracking, suppression, and the team's actual provider rate limit.
4. Deploy `account-mail` and `account-delete` with their own authentication checks.
5. Review pending work before changing routing. Retain uncertain or obsolete attempts
   for reconciliation; never invent replacement event identities.
6. Configure only the staging scheduler to POST `{}` once per minute. Store its URL
   and hook in Vault, never in browser code or plaintext cron commands. One invocation
   processes one queued welcome. Deletion confirmation is sent directly after erasure.
7. Keep `LEGAL_PUBLICATION_ENABLED=false`. Do not wire date changes or incident creation
   into automatic email delivery. Manual Resend sends need deliberate recipient review.
8. Leave production unchanged. Staging authorization does not authorize a production
   push, deployment, scheduler, or email send.

## Required evidence

- A supported-provider new signup gets one welcome at its registered staging address.
  Repeat sign-in, linking, and worker replay must not send another welcome.
- Wrong hooks, unsafe configuration, template drafts/drift, and enabled tracking fail closed.
- Concurrent workers produce one acceptance; retries preserve identity and payload.
  Ambiguous or expired attempts stay quarantined for provider reconciliation.
- Authenticated deletion removes owned content, shares, queue, and account-linked ledger
  before confirmation. Invalid tokens cannot erase an account. Mail failure still permits
  erasure; no confirmation recipient or retry remains persisted.
- Inspect From, Reply-To, staging subject, signature, links, HTML, plain text, mobile layout,
  and dark mode in the intended inbox clients. Provider acceptance alone is not delivery.
- Existing moderation delivery and human reply routing stay unchanged.

Use synthetic staging fixtures only for controlled-inbox checks, not while registered-
recipient delivery is active. Remove only those fixtures, preserving uncertain attempts
until reconciliation. Store addresses, identifiers, credentials, exports, message bodies,
and provider bodies privately; commit sanitized outcomes only.

## Pause and recovery

Disable the staging scheduler and set `ACCOUNT_MAIL_MODE=paused` to stop new delivery.
An already in-flight provider request cannot be recalled. Keep notified-version, legal,
and security history intact even though policy/security sends are now manual.

Before restoring a database, follow [recovery](./recovery.md) and run
`supabase/snippets/quarantine-account-mail-recovery.sql` before resuming any worker.
Unprovable sends stay quarantined. Do not clear history, replace a baseline, or create
new event identities to retry uncertain work.
