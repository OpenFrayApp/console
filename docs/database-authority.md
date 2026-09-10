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

The suite exercises owner, other-tenant, anonymous, viewer, stale-writer, restricted-function, and service-role actors. It verifies Row-Level Security, grants, privileged functions, Realtime database-change exposure, and account deletion. The command writes `.artifacts/supabase/database-boundary-attestation.json`.

Regenerate types only after a reviewed migration changes the public schema:

```bash
supabase db reset --local
npm run db:types
```

Commit the migration and generated types together. `npm run db:verify` fails when they drift.

## Automatic RLS for new tables

The tracked `ensure_rls` event trigger enables RLS on new public tables, including partitions, `CREATE TABLE AS`, and `SELECT INTO`. Its `public.rls_auto_enable()` function uses the fixed `pg_catalog` search path. Only the function owner retains execution permission. If enabling RLS fails, table creation fails too.

The forward migration adopts the existing hosted trigger without changing existing table data or policies. The boundary suite verifies its configuration, restricted grants, and behavior. Other application security-definer functions still require the fixed `public` search path.

## Function execution grants

The tracked migrations remove inherited execution grants from named application security-definer functions, then restore the reviewed client allowlist. Internal helpers remain unavailable to client roles. Application functions grant no execution to `service_role`; the automatic RLS function remains owner-only.

Hosted defaults can grant API roles execution explicitly. Revoking `PUBLIC` alone does not remove those grants. Every future function migration must revoke `PUBLIC` and explicit API-role grants before granting its intended callers.

## Report ingress

Migration `20260910000000_report_ingress_boundary.sql` removes client execution from `report_share()` and creates the `report_ingress` role. The role can execute only `accept_share_report()`. It cannot read or write report rows directly, use application sequences, or execute another application function.

Create a separately signed JWT whose only database role claim is `report_ingress`. Store it in the Pages environment as `REPORT_INGRESS_TOKEN`. Do not use the service-role key for report insertion. Rotate the token through the provider’s reviewed signing workflow before its expiry.

Configure these Pages values per environment:

- `TURNSTILE_SECRET_KEY`: The secret paired with the console’s public site key.
- `REPORT_FINGERPRINT_KEY`: A separate random HMAC key used to derive unlinkable quota keys from network addresses and report content.
- `REPORT_ALLOWED_HOSTS`: A comma-separated list containing only the deployed hostnames allowed by the Turnstile widget.
- `REPORT_INGRESS_TOKEN`: The restricted-role JWT.

The Function verifies Turnstile, checks that the share is still published, and enforces request bounds before calling the database. The database repeats share and field checks inside the insertion transaction. It rejects duplicates for 24 hours, more than five reports per network per hour, more than 20 per network per day, and more than 10 per share per hour.

Raw network addresses never enter the database. The Function stores keyed HMAC values for quota and duplicate comparisons. Notification webhooks run after insertion, so a mail failure leaves the accepted report in the moderation queue. Every provider request uses the database event identity as its idempotency key. Duplicate and quota rejections create no row and trigger no notification.

## Public privilege contract

Migration `20260908000200_public_privilege_contract.sql` limits the notification worker’s `service_role` access to these operations:

- Read `id`, `code`, `reason`, `resolution`, and `created_at` from `share_reports` to check earlier reports.
- Read `id` from `takedown_notices` and delete the sent notice identified by its webhook payload.

Reporter messages and addresses remain outside these read grants. No application sequence access is granted to `anon`, `authenticated`, or `service_role`. The admin browser continues using capability-gated authenticated functions. Database backups use their separate database connection.

The migration removes API-role default grants for tables, sequences, and functions created by `postgres` in `public`. Each creating migration must grant its required access explicitly. PostgreSQL’s global `PUBLIC` function-execution default remains unchanged; each function migration must still revoke it on the function.

Only named application objects and `postgres` defaults in `public` are reconciled. Other schemas, other creating roles, unrelated objects, ownership, and existing client grants are unchanged. An unexpected remaining grant blocks verification instead of being hidden by schema normalization.

The boundary suite checks the exact service-role table and column grants, sequence denial, and public defaults. It also runs the report worker’s two SQL operations with synthetic fixtures and suppressed webhook triggers. Local integration tests reproduce both local and hosted-style defaults and reject injected privilege drift.

Before hosted application, review any additional service-role consumers and authorize the migration. Verify column-level access through PostgREST and refresh protected staging evidence before promotion.

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

Set `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_URL`, then deploy migrations and verify the tracked hosted expectations:

```bash
supabase db push --db-url "$SUPABASE_DB_URL"
npm run db:verify -- \
  --environment staging \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --approver "$APPROVER" \
  --workflow database-deploy \
  --manual-evidence .artifacts/supabase/manual-evidence.json
```

Use `production` for the production attestation. Store the session-pooler connection string as the protected `SUPABASE_DB_URL` secret for each GitHub environment. Configure `DATABASE_APPROVER` and `SUPABASE_PROJECT_REF` as protected environment variables. Set `AUTHORIZED_STAGING_PROJECT_REF` on production to the staging project reference. The deployment workflow rejects dispatcher-supplied targets and records the trusted values after environment approval.

Run the hostile suite only against authorized staging:

```bash
npm run db:boundary -- \
  --environment staging \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --approver "$APPROVER" \
  --workflow database-deploy
```

The boundary verifier refuses production targets. It connects through the protected database URL and checks the exact migration lineage before creating synthetic fixtures. All fixtures are removed in the same database statement. A failure rolls back that statement.

Run the staging workflow first. Supply its workflow run ID as `staging_attestation_run_id` when dispatching production. Production verifies the protected staging project, commit, migration lineage, hostile actors, individual checks, approver, workflow run, suite hash, and passing result before applying migrations.

The authority verifier checks the fresh reset, exact remote migration lineage, normalized hosted schema, generated types, and supported hosted settings. It records the environment identity, migration head, schema and configuration hashes, generated-type hash, result, workflow, approver, and timestamp.

The verifier prints each authority check and manual-evidence result without printing provider values. Failed verification keeps its failing exit status. Unless canceled, the workflow uploads available attestations even after a failed step. Inspect the individual checks before retrying; a retained artifact does not mean verification passed.

Set `AUTH_OAUTH_EVIDENCE`, `AUTH_REDIRECT_EVIDENCE`, `REPORT_INGRESS_EVIDENCE`, and `REPORT_WEBHOOK_EVIDENCE` in each protected GitHub environment after reviewing those settings. Missing references fail verification. A successful backup does not prove these provider settings or the database boundary.

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
