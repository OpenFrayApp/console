#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertDatabasePromotion,
  hostedDatabaseArgs,
  migrationLineage,
} from './lib/supabase-authority.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))

/** Read migration metadata through the same protected connection used by db push. */
function readHistory(databaseUrl) {
  hostedDatabaseArgs(databaseUrl)
  /** Execute a bounded, read-only query without printing provider diagnostics. */
  function query(sql) {
    try {
      return execFileSync('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PGDATABASE: databaseUrl,
          PGCONNECT_TIMEOUT: '15',
          PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=10000',
        },
        timeout: 30_000,
      }).trim()
    } catch {
      throw new Error('Cannot read hosted migration history. No migrations were applied.')
    }
  }
  const exists = query("select to_regclass('supabase_migrations.schema_migrations') is not null")
  if (exists === 'f') return []
  if (exists !== 't') throw new Error('Unexpected migration catalog response.')
  try {
    return JSON.parse(
      query(
        "select coalesce(json_agg(version order by version), '[]'::json) from supabase_migrations.schema_migrations",
      ),
    )
  } catch {
    throw new Error('Cannot parse hosted migration history. No migrations were applied.')
  }
}

/** Check prerequisites only; this command never applies migrations or repairs history. */
function main() {
  const [environment, evidencePath, ...extra] = process.argv.slice(2)
  if (!['staging', 'production'].includes(environment) || !evidencePath || extra.length) {
    throw new Error('Supply staging or production and a manual-evidence file.')
  }
  const expectations = JSON.parse(
    readFileSync(resolve(root, 'supabase/hosted-config.expected.json'), 'utf8'),
  )
  const evidence = JSON.parse(readFileSync(resolve(root, evidencePath), 'utf8'))
  const versions = migrationLineage(resolve(root, 'supabase/migrations')).map(({ file }) =>
    file.slice(0, 14),
  )
  assertDatabasePromotion(
    versions,
    readHistory(process.env.SUPABASE_DB_URL),
    environment,
    expectations.manual,
    evidence,
  )
  console.log(
    'Migration history and provider references passed preflight; compatibility is not attested.',
  )
}

try {
  main()
} catch (error) {
  // File and JSON errors can include rejected contents; only our bounded errors reach the log.
  console.error(
    error instanceof SyntaxError || error?.code
      ? 'Database promotion preflight could not read its required inputs.'
      : `Database promotion preflight failed: ${error.message}`,
  )
  process.exitCode = 1
}
