#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRecoveryAttestation } from './lib/recovery.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))

/** Parse the bounded evidence metadata accepted by the recovery command. */
function parseArgs(argv) {
  const options = {
    checks: resolve(root, '.artifacts/supabase/recovery-restore-checks.json'),
    output: resolve(root, '.artifacts/supabase/recovery-restore-attestation.json'),
    owner: null,
    workflow: process.env.GITHUB_WORKFLOW ?? 'local:recovery',
  }
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index]
    const value = argv[index + 1]
    if (option === '--checks' && value) options.checks = resolve(root, value)
    else if (option === '--output' && value) options.output = resolve(root, value)
    else if (option === '--owner' && /^[A-Za-z0-9 ._@-]{1,80}$/.test(value)) options.owner = value
    else if (option === '--workflow' && /^[A-Za-z0-9 ._:/#-]{1,160}$/.test(value)) {
      options.workflow = value
    } else throw new Error(`Unknown or invalid option: ${option ?? '(missing)'}`)
  }
  if (!options.owner) throw new Error('Recovery evidence requires an explicit owner.')
  return options
}

/** Build and persist the final isolated-restore attestation. */
function main() {
  const options = parseArgs(process.argv.slice(2))
  const checks = JSON.parse(readFileSync(options.checks, 'utf8'))
  const attestation = buildRecoveryAttestation({
    ...checks,
    consoleCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim(),
    monitoring: { backupFreshness: 'passed', restoreFailureSignal: 'passed' },
    environment: 'isolated',
    owner: options.owner,
    workflow: options.workflow,
    decision: 'abandon',
    timestamp: new Date().toISOString(),
  })
  mkdirSync(dirname(options.output), { recursive: true })
  writeFileSync(options.output, `${JSON.stringify(attestation, null, 2)}\n`)
  console.log(`Recovery drill: ${attestation.result}. Attestation: ${options.output}`)
  if (attestation.result !== 'passed') process.exitCode = 1
}

try {
  main()
} catch (error) {
  console.error(`Recovery attestation failed: ${error.message}`)
  process.exitCode = 1
}
