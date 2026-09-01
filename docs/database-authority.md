# Database authority

The tracked Supabase lineage in `supabase/migrations/` is the authority for the console’s database. Applied migrations are immutable. Every change uses a new forward migration.

## Environment layout

Use separate Supabase projects for staging and production. Local development uses the project defined in `supabase/config.toml`.

Keep project references, access tokens, database passwords, OAuth credentials, and webhook headers outside the repository. The committed configuration contains non-secret defaults and expectations only.

## Verify a fresh database

Start Docker, then run:

```bash
supabase start
npm run db:verify
```

The command performs a fresh local reset, regenerates database types, and compares them with `src/types/database.ts`. It also hashes the normalized public schema. It writes `.artifacts/supabase/deployment-attestation.json`.

Run the hostile database boundary suite against another fresh reset:

```bash
npm run db:boundary
```

The suite exercises owner, other-tenant, anonymous, viewer, stale-writer, and restricted-function actors. It verifies Row-Level Security, grants, privileged functions, Realtime database-change exposure, and account deletion. The command writes `.artifacts/supabase/database-boundary-attestation.json`.

Regenerate types only after a reviewed migration changes the public schema:

```bash
supabase db reset --local
npm run db:types
```

Commit the migration and generated types together. `npm run db:verify` fails when they drift.

## Adopt the hosted baseline

The hosted project predates the tracked lineage. Baseline adoption is a one-time operation.

1. Back up the hosted project and verify the backup before changing migration history.
2. Reset a fresh staging project from the complete lineage.
3. Compare staging with the hosted schema, policies, grants, functions, and configuration.
4. Review every ownerless `shares` row. Assign an owner only with verified evidence, or remove the public row through the moderation process.
5. Mark migrations `20260901000000` through `20260901000500` as applied on the existing project. These files describe the reviewed baseline.
6. Run `supabase db push` to apply `20260901000600_authority_cutover.sql` forward.
7. Run the hosted verification command and retain its attestation.

Never mark the cutover migration as applied unless its SQL ran successfully. A fresh project runs every migration in order and needs no history repair.

## Deploy and attest

Set `SUPABASE_ACCESS_TOKEN`, then deploy migrations and verify the tracked hosted expectations:

```bash
supabase db push --project-ref "$SUPABASE_PROJECT_REF"
npm run db:verify -- \
  --environment staging \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --approver "$APPROVER" \
  --workflow database-deploy \
  --manual-evidence .artifacts/supabase/manual-evidence.json
```

Use `production` for the production attestation. Configure `DATABASE_APPROVER` and `SUPABASE_PROJECT_REF` as protected environment variables in GitHub. Set `AUTHORIZED_STAGING_PROJECT_REF` on production to the staging project reference. The deployment workflow rejects dispatcher-supplied targets and records the trusted values after environment approval.

Run the hostile suite only against authorized staging:

```bash
npm run db:boundary -- \
  --environment staging \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --approver "$APPROVER" \
  --workflow database-deploy
```

The boundary verifier refuses production targets. It checks the exact migration lineage before creating synthetic fixtures. All fixtures are removed in the same database statement. A failure rolls back that statement.

Run the staging workflow first. Supply its workflow run ID as `staging_attestation_run_id` when dispatching production. Production verifies the protected staging project, commit, migration lineage, hostile actors, individual checks, approver, workflow run, suite hash, and passing result before applying migrations.

The authority verifier checks the fresh reset, exact remote migration lineage, normalized hosted schema, generated types, and supported hosted settings. It records the environment identity, migration head, schema and configuration hashes, generated-type hash, result, workflow, approver, and timestamp.

Manual evidence uses the identifiers in `supabase/hosted-config.expected.json`:

```json
{
  "checks": [
    {
      "id": "auth-oauth-only",
      "result": "passed",
      "evidence": "release/AC-1/auth-oauth-review.md"
    }
  ]
}
```

Evidence values are references to reviewed records. Do not put account identifiers, authored content, capabilities, credentials, secrets, rejected values, or URLs with query strings in the evidence file.

`supabase/config.toml` configures local development only. Hosted settings are changed through the reviewed provider workflow, then compared with `supabase/hosted-config.expected.json`.

The report webhooks remain hosted configuration because their URLs and secret headers differ by environment. Their table triggers require explicit manual evidence.

## Break-glass recovery

Use break-glass access only when waiting for the normal migration path would extend an active incident.

1. Stop database promotion and record the environment, operator, incident, and current migration head.
2. Take and verify an encrypted backup.
3. Prefer a forward corrective migration. Apply it through staging before production when the incident allows.
4. If the SQL editor is required, save the exact statement in the private incident record before execution.
5. Create the matching forward migration immediately. Test it against a fresh reset and the pre-incident schema.
6. Reconcile migration history only after the tracked migration and deployed change are identical.
7. Run hosted verification again. Attach the failed and recovered attestations to the incident.

Never rewrite an applied migration. Never use migration-history repair to conceal SQL that differs from the tracked file. Restore the previous compatible client and migration head when a forward correction cannot preserve compatibility.

The migration integration test rebuilds the lineage in a fresh PostgreSQL runtime and exercises account deletion. `npm run db:verify` remains the required Supabase-local reset because it also covers platform schemas and generated types.
