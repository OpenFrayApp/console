// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

export const RECOVERY_CHECKS = [
  'rowCounts',
  'deletionReplay',
  'tenantIsolation',
  'authentication',
  'criticalFunctions',
  'encounterIntegrity',
  'policies',
  'grants',
]

/** Return whether a value is a finite nonnegative integer. */
function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0
}

/** Return a bounded numeric record without accepting identifying keys. */
function numericRecord(value, allowedKeys) {
  return Object.fromEntries(
    allowedKeys.map((key) => [key, isCount(value?.[key]) ? value[key] : null]),
  )
}

/** Build privacy-safe evidence for one deletion-aware isolated restore. */
export function buildRecoveryAttestation(input) {
  const restoredRows = numericRecord(input.restoredRows, ['encounters', 'shares', 'users'])
  const replayed = numericRecord(input.replayed, ['accounts', 'shares'])
  const checksPassed = RECOVERY_CHECKS.every((check) => input.checks?.[check] === 'passed')
  const countsValid =
    Object.values(restoredRows).every(isCount) && Object.values(replayed).every(isCount)
  const monitoringPassed =
    input.monitoring?.backupFreshness === 'passed' &&
    input.monitoring?.restoreFailureSignal === 'passed'
  const recoveryPointPassed = isCount(input.backupAgeSeconds) && input.backupAgeSeconds <= 86_400
  const recoveryTimePassed = isCount(input.elapsedSeconds) && input.elapsedSeconds <= 28_800
  const metadataValid =
    /^[a-f0-9]{40}$/.test(input.consoleCommit) &&
    /^[A-Za-z0-9 ._@-]{1,80}$/.test(input.owner) &&
    /^[A-Za-z0-9 ._:/#-]{1,160}$/.test(input.workflow) &&
    !Number.isNaN(Date.parse(input.timestamp))
  const isolated = input.environment === 'isolated'
  const abandoned = input.decision === 'abandon'
  const result =
    checksPassed &&
    countsValid &&
    monitoringPassed &&
    recoveryPointPassed &&
    recoveryTimePassed &&
    metadataValid &&
    isolated &&
    abandoned
      ? 'passed'
      : 'failed'

  return {
    version: 1,
    requirementIds: ['RC-4'],
    consoleCommit: input.consoleCommit,
    environment: 'isolated',
    recoveryPoint: {
      maximumAgeSeconds: 86_400,
      observedAgeSeconds: isCount(input.backupAgeSeconds) ? input.backupAgeSeconds : null,
      result: recoveryPointPassed ? 'passed' : 'failed',
    },
    recoveryTime: {
      maximumSeconds: 28_800,
      observedSeconds: isCount(input.elapsedSeconds) ? input.elapsedSeconds : null,
      result: recoveryTimePassed ? 'passed' : 'failed',
    },
    restoredRows,
    replayed,
    checks: Object.fromEntries(
      RECOVERY_CHECKS.map((check) => [check, input.checks?.[check] ?? 'missing']),
    ),
    monitoring: {
      backupFreshness: input.monitoring?.backupFreshness ?? 'missing',
      restoreFailureSignal: input.monitoring?.restoreFailureSignal ?? 'missing',
    },
    owner: input.owner,
    workflow: input.workflow,
    decision: input.decision,
    result,
    timestamp: input.timestamp,
  }
}
