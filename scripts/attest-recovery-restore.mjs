#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRecoveryAttestation, RECOVERY_CHECKS } from './lib/recovery.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))

/** Parse the bounded evidence metadata accepted by the recovery command. */
function parseArgs(argv) {
  const options = {
    checks: resolve(root, '.artifacts/supabase/recovery-restore-checks.json'),
    output: resolve(root, '.artifacts/supabase/recovery-restore-attestation.json'),
    authCheck: resolve(root, '.artifacts/supabase/recovery-auth-check.json'),
    owner: null,
    workflow: process.env.GITHUB_WORKFLOW ?? 'local:recovery',
  }
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index]
    const value = argv[index + 1]
    if (option === '--checks' && value) options.checks = resolve(root, value)
    else if (option === '--output' && value) options.output = resolve(root, value)
    else if (option === '--auth-check' && value) options.authCheck = resolve(root, value)
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
  const restoreEvidence = existsSync(options.checks)
    ? JSON.parse(readFileSync(options.checks, 'utf8'))
    : {}
  const authEvidence = existsSync(options.authCheck)
    ? JSON.parse(readFileSync(options.authCheck, 'utf8'))
    : {}
  const databasePassed = restoreEvidence.databaseVerification === 'passed'
  const checks = Object.fromEntries(
    RECOVERY_CHECKS.map((check) => [
      check,
      check === 'authentication'
        ? (authEvidence.authentication ?? 'missing')
        : databasePassed
          ? 'passed'
          : 'missing',
    ]),
  )
  const restoreOutcome = process.env.RECOVERY_RESTORE_OUTCOME ?? 'missing'
  const authOutcome = process.env.RECOVERY_AUTH_OUTCOME ?? 'missing'
  const monitorOutcome = process.env.RECOVERY_MONITOR_OUTCOME ?? 'missing'
  const failedPhase =
    restoreOutcome !== 'success'
      ? 'restore'
      : authOutcome !== 'success'
        ? 'authentication'
        : monitorOutcome !== 'success'
          ? 'monitoring'
          : null
  const startedAt = Number(process.env.RECOVERY_STARTED_AT)
  const elapsedSeconds =
    restoreEvidence.elapsedSeconds ??
    (Number.isSafeInteger(startedAt) && startedAt > 0
      ? Math.max(0, Math.floor(Date.now() / 1000) - startedAt)
      : null)
  const attestation = buildRecoveryAttestation({
    ...restoreEvidence,
    elapsedSeconds,
    checks,
    consoleCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim(),
    monitoring: {
      backupFreshness: restoreEvidence.backupAgeSeconds == null ? 'missing' : 'passed',
      restoreFailureSignal: monitorOutcome === 'success' ? 'passed' : 'missing',
    },
    environment: 'isolated',
    owner: options.owner,
    workflow: options.workflow,
    decision: 'abandon',
    failedPhase,
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
