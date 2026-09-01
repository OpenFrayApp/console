#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyStagingBoundaryEvidence } from './lib/database-boundary.mjs'
import { migrationLineage, sha256 } from './lib/supabase-authority.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const migrationsDirectory = resolve(root, 'supabase/migrations')
const hostileQueryPath = resolve(root, 'supabase/tests/database-boundary.sql')

/** Verify downloaded staging evidence before a production database mutation starts. */
function main() {
  const [path, environmentIdentity, approver, workflow] = process.argv.slice(2)
  if (!path) throw new Error('A staging boundary attestation path is required.')
  if (!/^[a-z]{20}$/.test(environmentIdentity ?? '')) {
    throw new Error('The authorized staging project reference is required.')
  }
  if (!approver) throw new Error('The authorized staging approver is required.')
  if (!workflow) throw new Error('The authorized staging workflow is required.')
  const evidence = JSON.parse(readFileSync(resolve(root, path), 'utf8'))
  const migrationVersions = migrationLineage(migrationsDirectory).map(({ file }) =>
    file.slice(0, 14),
  )
  const migrationHead = migrationVersions.at(-1)
  if (!migrationHead) throw new Error('The tracked migration lineage has no head.')

  verifyStagingBoundaryEvidence(evidence, {
    consoleCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim(),
    environmentIdentity,
    migrationHead,
    migrationLineageHash: sha256(migrationVersions.join('\n')),
    hostileSuiteHash: sha256(readFileSync(hostileQueryPath)),
    approver,
    workflow,
  })
  console.log('Staging database boundary evidence matches this production candidate.')
}

try {
  main()
} catch (error) {
  console.error(`Staging database boundary verification failed: ${error.message}`)
  process.exitCode = 1
}
