// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

/** Extract a standard hosted project reference without exposing invalid input. */
function projectReference(value) {
  if (typeof value !== 'string' || !/^https:\/\/[a-z]{20}\.supabase\.co\/?$/.test(value))
    throw new Error('Provide explicit standard hosted production and staging URLs.')
  return new URL(value).hostname.split('.')[0]
}

/** Verify staging isolation and database identity against a read-only branch listing. */
export function checkStagingMailTarget({ productionUrl, stagingUrl, databaseUrl }, listBranches) {
  const production = projectReference(productionUrl)
  const staging = projectReference(stagingUrl)
  if (production === staging) throw new Error('Staging must be distinct from production.')
  let connection
  try {
    connection = new URL(databaseUrl)
  } catch {
    throw new Error('Provide the staging database connection through the environment.')
  }
  if (connection.hash || [...connection.searchParams.keys()].some((key) => key !== 'sslmode'))
    throw new Error('The database connection contains unsupported connection overrides.')
  const direct =
    connection.hostname === `db.${staging}.supabase.co` && connection.username === 'postgres'
  const pooled =
    connection.hostname.endsWith('.pooler.supabase.com') &&
    connection.username === `postgres.${staging}`
  if (!['postgres:', 'postgresql:'].includes(connection.protocol) || (!direct && !pooled))
    throw new Error('The database connection does not identify the staging project.')

  const data = listBranches(production)
  const rows = Array.isArray(data) ? data : (data?.branches ?? data?.data)
  if (!Array.isArray(rows)) throw new Error('Unexpected staging branch-list shape.')
  const branch = rows.find((row) => row?.project_ref === staging)
  if (!branch || (branch.name ?? branch.branch_name) !== 'develop')
    throw new Error('The staging project must be the configured parent’s develop branch.')
  return {
    environment: 'staging',
    developBranchResolved: true,
    parentExcluded: true,
    databaseMatchesBranch: true,
  }
}

/** Read branch metadata without forwarding CLI output or credentials to diagnostics. */
function listBranches(production) {
  try {
    return JSON.parse(
      execFileSync(
        'supabase',
        ['branches', 'list', '--project-ref', production, '--output', 'json'],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 30000,
        },
      ),
    )
  } catch {
    throw new Error('Staging branch resolution unavailable; private CLI output withheld.')
  }
}

/** Run the target check using inherited environment values and sanitized output only. */
export function main(env = process.env) {
  try {
    const result = checkStagingMailTarget(
      {
        productionUrl: env.PRODUCTION_SUPABASE_URL,
        stagingUrl: env.STAGING_SUPABASE_URL,
        databaseUrl: env.STAGING_DATABASE_URL,
      },
      listBranches,
    )
    console.log(JSON.stringify(result))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
