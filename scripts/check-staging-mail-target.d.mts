// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/** Verify staging isolation and database identity against a read-only branch listing. */
export function checkStagingMailTarget(
  config: { productionUrl: string; stagingUrl: string; databaseUrl: string },
  listBranches: (production: string) => unknown,
): {
  environment: 'staging'
  developBranchResolved: true
  parentExcluded: true
  databaseMatchesBranch: true
}

/** Run the target check using inherited environment values and sanitized output only. */
export function main(env?: Record<string, string | undefined>): void
