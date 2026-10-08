# Verify account email deployment

Console issue #114 coordinates the console, admin, site, and deployment workspace.
Local tests do not prove deployed delivery. Keep production activation blocked until
staging evidence passes and the maintainer separately authorizes the production target.

## Resolve and authorize the target

Confirm the test inbox, staging project, and permission to publish, deploy, and send.
Resolve a Supabase branch from its parent before using any hosted command:

```bash
supabase branches list --project-ref "$PARENT_PROJECT_REF" --output json
```

Use the `develop` branch’s `project_ref`, not the parent reference. Match its Supabase
URL and database connection to that identity. Keep branch credentials in an ignored,
owner-only file. Never print branch connection details or use production credentials.
A database branch is a separate staging target even though its dashboard belongs to
one parent project.

## Prepare coordinated revisions

Record the console, admin, site, and workspace commit IDs. Require clean source trees
before recording final evidence. Build the workspace with the selected console and
site revisions; an older submodule checkout does not verify the coordinated release.

Run each repository’s applicable tests, type checks, lint, formatting, and prose checks.
Run the console browser suite, fresh database authority check, hostile boundary suite,
and mail concurrency check. Run the admin’s `email:typecheck` and offline publisher
for welcome, deletion, Terms, Privacy, combined, and synthetic security templates.
Build and assemble the console, site, and handbook together. Builds send no email.

Use the existing [database contract](./account-email.md), the admin’s
[deployment procedure](https://github.com/OpenFrayApp/admin/blob/main/docs/account-email.md),
and the workspace’s [legal publication procedure](https://github.com/OpenFrayApp/openfray/blob/main/docs/legal-publication.md).

## Deployment order

1. Keep the account worker scheduler disabled and legal registration disabled.
2. Apply the complete reviewed database lineage to the authorized staging branch.
   Confirm the migration head, private-schema grants, erasure cascade, and hostile boundary.
3. Review the React Email source and derived HTML/text. Publish templates explicitly
   with matching environment approval. Record their IDs and published revisions.
4. Verify domain readiness, disabled tracking, suppression, and the team’s actual rate limit.
   Use a server key with domain/template read access and sending permission.
   A sending-only key returns `restricted_api_key` and cannot pass worker safety checks.
5. Configure explicit staging mode, confirmed To/Reply-To override, pinned templates,
   and separate worker/publication hook secrets. Never supply recipient overrides in requests.
6. Deploy `account-mail`, `legal-publication`, and `account-delete` to staging.
   Keep their own authentication checks; deployment disables only the platform JWT verifier.
7. Verify `account-delete` authentication and erasure before releasing the updated console.
   Deploy legal copy and metadata together on an isolated HTTPS staging origin.
8. Temporarily approve the first legal baseline. Verify no historical jobs, then remove approval.
9. Run the staging matrix below manually. Enable no recurring sender during verification.
10. Leave production disabled. Passing staging evidence permits an authorization request;
    it does not authorize production configuration, publication, deployment, or sending.

Account messages use `OpenFray <comms@notifications.openfray.app>`, the reviewed
signature, and production console/document links. Staging overrides To and Reply-To
with the confirmed inbox and prefixes subjects. Existing moderation sender and reply
routing stay unchanged.

## Staging evidence matrix

Record each result as passed, failed, or blocked. Include source revisions and sanitized
outcomes only. Store actual selections and rendered security reviews privately and remove
them after reconciliation. Do not record addresses, credentials, account exports, message
bodies, provider bodies, or database connection details in committed evidence.

| Check                 | Required deployed evidence                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuration         | Correct branch, complete lineage, verified DNS/domain, readable published templates, disabled tracking, suppression retained, usable secrets, and actual rate limit.                                                                                                                                                                                                |
| Fail-closed routes    | Wrong worker hooks, missing mail mode/mapping, and template draft/drift block sending. Wrong publication hooks, disabled registration, and invalid live metadata block registration. Valid publications can queue while sending is blocked. Invalid deletion tokens prevent erasure; unsafe mail configuration only skips confirmation after authenticated erasure. |
| Welcome               | One supported-provider new account receives one welcome; repeat sign-in, linking, worker replay, and pre-installation accounts receive no extra welcome.                                                                                                                                                                                                            |
| Retry and concurrency | Concurrent workers produce one acceptance; transient retries preserve identity/payload; ambiguous expired work remains quarantined.                                                                                                                                                                                                                                 |
| Legal publication     | Baseline, Terms-only, Privacy-only, and combined outcomes match live published dates and individually routed messages.                                                                                                                                                                                                                                              |
| Legal replay          | Content-only, failed deployment, repeated deployment, rollback, and post-publication accounts produce no historical or duplicate notices.                                                                                                                                                                                                                           |
| Deletion              | Erasure removes saved content, shares, queue, and account-linked ledger before confirmation; simulated send failure still deletes; no confirmation recipient or retry persists.                                                                                                                                                                                     |
| Security              | A currently authorized operator reviews synthetic facts and exact affected-account selection; confirmation/replay sends only the selected notices.                                                                                                                                                                                                                  |
| Moderation            | Existing report notification, report outcome, takedown, and human reply routing remain unchanged.                                                                                                                                                                                                                                                                   |
| Mailbox               | Inspect From, Reply-To, staging subject, signature, links, HTML, derived text, mobile layout, and dark mode in the intended clients.                                                                                                                                                                                                                                |
| Rollback              | Pausing and restoring compatible source preserve notified-version history and prevent obsolete pending work from resuming.                                                                                                                                                                                                                                          |

Provider acceptance alone cannot pass a mailbox-delivery check. Resend test addresses
can exercise suppression outcomes; never send to invented addresses at real providers.
Use synthetic staging accounts and fixtures. Remove them without touching existing users.

## Pause, rollback, and recovery

Disable the scheduler first. Set `ACCOUNT_MAIL_MODE=paused` and
`LEGAL_PUBLICATION_ENABLED=false` in the target project. The unknown mail mode blocks
sending, including deletion confirmation, while authenticated deletion still succeeds.
Pause the workspace’s publication job too. A request already in flight cannot be recalled.

Keep the ledger, legal history, and confirmed security identities intact. Never delete
notified-version history, initialize a replacement baseline, or generate replacement event
identities to retry an uncertain send. Keep pinned older template mappings available for
reconciliation. A frontend rollback must retain its compatible deletion handler; do not
release a client that calls an absent handler.

Review every pending job before resuming after a long pause or source rollback. Quarantine
obsolete or uncertain work through a protected operator connection and retain its ledger
identity. Do not let an old unattempted notice become current merely because its first
attempt timestamp is empty. Resume only reviewed, still-applicable work.

After restoring a database, run `supabase/snippets/quarantine-account-mail-recovery.sql`
before any worker resumes. Restore notified legal dates and confirmed security identities
from provider/operator evidence. Reconcile publication history before clearing its pause.
Unprovable sends stay quarantined. See [database recovery](./recovery.md).

## Production authorization

Request approval only after the staging matrix is complete. Name the intended production
environment, coordinated revisions, templates, baseline plan, deployment order, and scheduler
cadence. Account for all domain/template reads when estimating API load; team limits apply
across keys. Record approval separately from staging permission.

A blocked publication, missing inbox confirmation, or incomplete staging exercise leaves
#114 open. No newsletter, marketing contact, segment, topic, or inbound mailbox is part of
this procedure.
