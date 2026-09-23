# Database recovery

Hosted recovery points use Supabase-managed backups. Check each project's backup status, retention, and available restore points in Supabase before relying on them. Point-in-time recovery is a separate setting.

The console has no scheduled R2 backup, retention, recovery-health, or restore-drill workflow. Existing encrypted objects and their decryption keys remain available for a separately reviewed recovery operation.

## Deletion and access safeguards

The tracked migration `20260911000000_recovery_deletion_ledger.sql` records account deletion and share revocation before the active row disappears. Client roles and the service role cannot read the ledger or run its replay function. Revoked share codes cannot be reused.

A provider backup does not establish that a restore preserves later deletions. A restore can also bring back live-view sessions and writer leases. Verify these boundaries before making a restored database available.

The `Database authority` workflow keeps the local migration, recovery-tool, hostile-boundary, and concurrent-revocation tests. These checks do not constitute a hosted restore drill.

## Before a hosted restore

1. Confirm the target project, restore point, expected data loss, and operator authorization.
2. Preserve the current deletion ledger outside the restore target through an approved protected connection.
3. If the current ledger is unavailable, stop and establish how later deletions will remain enforced.
4. Plan deletion replay, live-view revocation, writer-lease cleanup, and authentication-session handling before reopening access.
5. Follow the [Supabase recovery documentation](https://supabase.com/docs/guides/platform/backups) for the selected backup format and restore method.
6. Verify schema, grants, tenant isolation, authentication, and deleted-account and revoked-share behavior before reopening access.
7. Record the restore point, elapsed time, verification results, and decision to reopen or abandon the target.

Supabase backup availability does not prove these checks passed. Deleting a Supabase project also deletes its provider-managed backups.

## Existing encrypted backups

The scripts under `scripts/` remain available for manual inspection and recovery of the existing encrypted backup format. `restore-supabase.sh` accepts only a guarded local target, reads the current deletion ledger, replays deletions, and checks database boundaries.

These tools do not accept Supabase physical backups. The legacy restore tool rejects encrypted backups older than 24 hours and dumps without the deletion ledger. Older retained objects need a separately reviewed recovery procedure; do not bypass these checks to claim a passing restore.

Keep the encrypted objects and matching decryption keys until their retention decision is approved. The upload, retention, and notification scripts have no scheduled caller. Their credentials and deployed notification function require separate retirement review.

## Failed verification

Keep the restored target unavailable when any deletion, isolation, authentication, or integrity check fails. Retain the available recovery point and privacy-safe failure evidence. Correct the recovery procedure and repeat verification before reopening access.
