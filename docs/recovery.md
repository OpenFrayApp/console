# Database recovery

The recovery drill restores one encrypted backup into an ephemeral local Supabase project. It never writes to staging or production. A failed check abandons the local target.

## Recovery controls

Migration `20260911000000_recovery_deletion_ledger.sql` records account deletion and share revocation before the active row disappears. Client roles and the service role cannot read the ledger or run its replay function. A revoked share code cannot be reused.

The drill reads the current ledger through a protected database connection after restoring the backup. It replays every recorded account and share deletion. It also clears restored live-view sessions and writer leases. This prevents a recovery point created before a deletion from making that account, share, or live authority active again.

The encrypted backup contains public schema definitions, grants, policies, and data. It contains data from `auth.users` and `auth.identities` without replacing the provider-owned auth schema. Provider-owned default privileges remain those of the ephemeral target.

## Configure the protected environment

Create a GitHub environment named `recovery` with required reviewer approval. Set `RECOVERY_OPERATOR` to the role or person responsible for the drill.

Add these environment secrets:

- `BACKUP_AGE_IDENTITY`: The private identity for current encrypted backups.
- `RECOVERY_SOURCE_DB_URL`: A read-capable production connection used only to export the deletion ledger.

Add these repository secrets so unattended health and failure jobs can use them:

- `R2_BUCKET` and `R2_ENDPOINT`: The private backup bucket and endpoint.
- `R2_RECOVERY_ACCESS_KEY_ID` and `R2_RECOVERY_SECRET_ACCESS_KEY`: Object Read-only credentials.
- `RECOVERY_MONITOR_WEBHOOK`: An endpoint that accepts the allowlisted recovery health events.

The webhook receives only an event name and the `openfray-recovery` service label. It receives no authored content, account identifiers, share codes, object keys, database addresses, or credentials.

## Run a drill

1. Confirm the latest `Supabase backup` run passed every job.
2. Copy its exact encrypted object key from the upload step.
3. Open the `Recovery drill` workflow and choose **Run workflow**.
4. Enter the object key. Supply the recorded SHA-256 digest only for an older object without digest metadata.
5. Approve the protected `recovery` environment.
6. Download the `recovery-drill-attestation` artifact after the run passes.
7. Record the workflow run, operator, elapsed time, recovery-point age, and abandonment decision in the operational record.

Use a backup created after the recovery-ledger migration. The restore rejects an older dump that lacks the ledger.

## What the drill verifies

The workflow has an eight-hour timeout and rejects a backup older than 24 hours. It checks:

- Exact backed-up and restored row counts before deletion replay.
- Deleted-account and revoked-share fixtures after replay.
- Cleared live-view sessions and writer leases.
- Tenant isolation and authentication relationships.
- Row-Level Security, policies, grants, and restricted function execution.
- Critical recovery, account, sharing, and encounter functions.
- Encounter JSON and its latest recovery revision.
- The hourly backup-freshness monitor and a content-free restore-failure signal.

The attestation contains counts and pass or fail states. It contains no authored rows, account identifiers, share codes, object keys, database addresses, or secrets.

## Failure and abandonment

The isolated target is always abandoned after the drill. Never promote it or route traffic to it.

When any restore, integrity, isolation, deletion, or monitoring check fails:

1. Leave production unchanged.
2. Keep the last verified encrypted recovery point.
3. Retain the failed workflow logs and available attestation files.
4. Record the failing check and the operator.
5. Fix the backup or restore path forward.
6. Run the complete drill again before relying on a newer recovery point.

The scheduled health job sends `backup_stale` when no valid encrypted object is less than 24 hours old. A failed drill sends `restore_failed`. Delivery failure also fails the monitoring job.
