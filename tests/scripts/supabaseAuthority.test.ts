// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
// @ts-expect-error The release script is plain JavaScript and has no generated declaration.
import * as authority from '../../scripts/lib/supabase-authority.mjs'

const {
  buildDatabaseAttestation,
  canonicalSchemaDump,
  compareHostedConfig,
  compareManualEvidence,
  hostedDatabaseArgs,
  migrationLineage,
  remoteMigrationVersions,
  schemaHash,
} = authority

const migrations = fileURLToPath(new URL('../../supabase/migrations', import.meta.url))
const authorityWorkflow = readFileSync(
  fileURLToPath(new URL('../../.github/workflows/database-authority.yml', import.meta.url)),
  'utf8',
)
const authorityVerifier = readFileSync(
  fileURLToPath(new URL('../../scripts/verify-supabase-authority.mjs', import.meta.url)),
  'utf8',
)

describe('Supabase authority evidence', () => {
  it('gives the forward-only lineage a stable head and schema hash', () => {
    const lineage = migrationLineage(migrations)

    expect(lineage.at(-1)?.file).toBe('20260911000000_recovery_deletion_ledger.sql')
    expect(schemaHash(lineage)).toMatch(/^[a-f0-9]{64}$/)
    expect(new Set(lineage.map(({ hash }: { hash: string }) => hash)).size).toBe(lineage.length)
  })

  it('parses the exact hosted migration lineage and strips webhook secrets from schema dumps', () => {
    const listed = `
      Local | Remote | Time
      20260901000000 | 20260901000000 | 2026-09-01
      20260901000100 | 20260901000100 | 2026-09-01
    `
    expect(remoteMigrationVersions(listed)).toEqual(['20260901000000', '20260901000100'])
    expect(
      remoteMigrationVersions(
        JSON.stringify({
          migrations: [
            { local: '20260901000000', remote: '20260901000000' },
            { local: '20260901000100', remote: '20260901000100' },
          ],
        }),
      ),
    ).toEqual(['20260901000000', '20260901000100'])

    const dump = `
      -- generated
      CREATE TABLE "public"."shares" ("code" text);
      CREATE TRIGGER "share-reports" AFTER INSERT ON "public"."shares" EXECUTE FUNCTION hook('MUST_NOT_APPEAR');
    `
    expect(canonicalSchemaDump(dump)).toBe('CREATE TABLE "public"."shares" ("code" text);')
  })

  it('strips both CLI webhook trigger forms while retaining unrelated triggers and grants', () => {
    const retained = 'GRANT SELECT ON public.shares TO service_role;'
    const unrelated =
      'CREATE OR REPLACE TRIGGER "other-hook" AFTER INSERT ON public.shares EXECUTE FUNCTION hook();'
    for (const create of ['CREATE TRIGGER', 'CREATE OR REPLACE TRIGGER']) {
      const dump = `${retained}\n${create} "share-reports" AFTER INSERT ON public.share_reports EXECUTE FUNCTION hook('MUST_NOT_APPEAR');\n${create} "takedown-notices" AFTER INSERT ON public.takedown_notices EXECUTE FUNCTION hook('MUST_NOT_APPEAR');\n${unrelated}\n`
      expect(canonicalSchemaDump(dump)).toBe(`${retained} ${unrelated}`)
    }
  })

  it('reports only expected non-secret hosted fields when configuration drifts', () => {
    const comparison = compareHostedConfig(
      { database: { ssl_enforced: true }, realtime: { private_only: false } },
      {
        database: { ssl_enforced: false, password: 'MUST_NOT_APPEAR' },
        realtime: { private_only: false },
      },
    )

    expect(comparison).toEqual({
      drift: [{ path: 'database.ssl_enforced', expected: true, actual: false }],
      selected: {
        database: { ssl_enforced: false },
        realtime: { private_only: false },
      },
    })
    expect(JSON.stringify(comparison)).not.toContain('MUST_NOT_APPEAR')
  })

  it('requires bounded references for settings that need manual evidence', () => {
    const expectations = [{ id: 'oauth' }, { id: 'webhooks' }]
    const evidence = {
      checks: [
        { id: 'oauth', result: 'passed', evidence: 'release/AC-1/oauth-review.md' },
        { id: 'webhooks', result: 'passed', evidence: '11111111-1111-1111-1111-111111111111' },
      ],
    }

    expect(compareManualEvidence(expectations, evidence)).toEqual([
      { id: 'oauth', result: 'passed', evidence: 'release/AC-1/oauth-review.md' },
      { id: 'webhooks', result: 'missing', evidence: null },
    ])
  })

  it('accepts only credentialed PostgreSQL URLs for hosted database commands', () => {
    expect(hostedDatabaseArgs('postgresql://user:secret@staging.example/postgres')).toEqual([
      '--db-url',
      'postgresql://user:secret@staging.example/postgres',
    ])
    for (const value of [
      undefined,
      '',
      'https://staging.example',
      'postgresql://staging.example',
    ]) {
      expect(() => hostedDatabaseArgs(value)).toThrow(/SUPABASE_DB_URL/)
    }
  })

  it('keeps hosted credentials out of fresh local verification', () => {
    const step = authorityWorkflow.match(
      /- name: Verify the fresh lineage before deployment\n([\s\S]*?)(?=\n\s{6}- name:)/,
    )?.[1]

    expect(step).toContain('env -u SUPABASE_DB_PASSWORD -u SUPABASE_DB_URL npm run db:verify')
    expect(authorityVerifier).toContain('delete environment.SUPABASE_DB_PASSWORD')
    expect(authorityVerifier).toContain('delete environment.SUPABASE_DB_URL')
    expect(authorityVerifier).toContain("generateTypes(['--local'], true)")
    expect(authorityVerifier).toContain("dumpSchema(['--local'], true)")
  })

  it('retains diagnostic attestations when local or hosted verification fails', () => {
    const uploads = authorityWorkflow.match(
      /- uses: actions\/upload-artifact@[^\n]+\n[\s\S]*?(?=\n\s{2}[a-z]+:|$)/g,
    )

    expect(uploads).toHaveLength(2)
    for (const upload of uploads ?? []) expect(upload).toContain('if: ${{ !cancelled() }}')
  })

  it('uses the protected database URL without linking through the Management API', () => {
    const pushStep = authorityWorkflow.match(
      /- name: Apply forward migrations\n([\s\S]*?)(?=\n\s{6}- name:)/,
    )?.[1]

    expect(authorityWorkflow).not.toContain('supabase link')
    expect(pushStep).toContain('supabase db push --db-url "$SUPABASE_DB_URL"')
    expect(authorityVerifier).toContain('hostedDatabaseArgs(process.env.SUPABASE_DB_URL)')
  })

  it('fails an attestation when any required authority result is missing', () => {
    const lineage = migrationLineage(migrations)
    const attestation = buildDatabaseAttestation({
      consoleCommit: 'a'.repeat(40),
      environmentKind: 'staging',
      environmentIdentity: 'abcdefghijklmnopqrst',
      migrationHead: 'missing',
      expectedMigrationHead: '20260901000600',
      schemaHash: 'd'.repeat(64),
      lineageHash: schemaHash(lineage),
      schema: 'passed',
      lineage,
      configurationExpectationHash: 'b'.repeat(64),
      configurationObservedHash: null,
      configuration: 'failed',
      manualEvidence: [],
      generatedTypeHash: 'c'.repeat(64),
      generatedTypes: 'passed',
      freshReset: 'passed',
      workflow: 'database-deploy',
      approver: 'maintainer',
      timestamp: '2026-09-01T00:00:00.000Z',
    })

    expect(attestation.result).toBe('failed')
    expect(attestation.migration.head).toBe('missing')
    expect(attestation.migration.result).toBe('failed')
    expect(attestation.checks).toEqual({
      freshReset: 'passed',
      generatedTypes: 'passed',
      migrationLineage: 'failed',
      schema: 'passed',
      configuration: 'failed',
    })
    expect(attestation).not.toHaveProperty('credentials')
  })
})
