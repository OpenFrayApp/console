// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { checkStagingMailTarget } from '../../scripts/check-staging-mail-target.mjs'

const parent = 'a'.repeat(20)
const staging = 'b'.repeat(20)
const config = {
  productionUrl: `https://${parent}.supabase.co`,
  stagingUrl: `https://${staging}.supabase.co`,
  databaseUrl: `postgresql://postgres:PRIVATE_PASSWORD@db.${staging}.supabase.co:5432/postgres`,
}
const branch = { project_ref: staging, name: 'develop' }

describe('staging mail target check', () => {
  it.each([[branch], { branches: [branch] }, { data: [branch] }].map((rows) => ({ rows })))(
    'checks exact project and database identity',
    ({ rows }) => {
      const list = vi.fn(() => rows)
      expect(checkStagingMailTarget(config, list)).toEqual({
        environment: 'staging',
        developBranchResolved: true,
        parentExcluded: true,
        databaseMatchesBranch: true,
      })
      expect(list).toHaveBeenCalledWith(parent)
    },
  )

  it('accepts a standard pooler only with the exact staging username', () => {
    expect(
      checkStagingMailTarget(
        {
          ...config,
          databaseUrl: `postgres://postgres.${staging}:PRIVATE_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres`,
        },
        () => [branch],
      ),
    ).toHaveProperty('databaseMatchesBranch', true)
  })

  it('rejects production before requesting any branch metadata', () => {
    const list = vi.fn()
    expect(() =>
      checkStagingMailTarget({ ...config, stagingUrl: config.productionUrl }, list),
    ).toThrow('Staging must be distinct')
    expect(list).not.toHaveBeenCalled()
  })

  it.each([
    `postgres://postgres:PRIVATE_PASSWORD@db.${parent}.supabase.co/postgres`,
    `postgres://postgres.${parent}:PRIVATE_PASSWORD@aws-0-region.pooler.supabase.com/postgres`,
    `postgres://postgres.${staging}extra:PRIVATE_PASSWORD@aws-0-region.pooler.supabase.com/postgres`,
    `postgres://postgres.${staging}:PRIVATE_PASSWORD@host.invalid/postgres`,
    `https://postgres:PRIVATE_PASSWORD@db.${staging}.supabase.co/postgres`,
    'PRIVATE_PASSWORD',
    `${config.databaseUrl}?host=db.${parent}.supabase.co`,
    `${config.databaseUrl}?user=postgres.${parent}`,
    `${config.databaseUrl}#PRIVATE_PASSWORD`,
  ])('rejects wrong or malformed database targets without disclosing input', (databaseUrl) => {
    const list = vi.fn()
    let diagnostic = ''
    try {
      checkStagingMailTarget({ ...config, databaseUrl }, list)
    } catch (error) {
      diagnostic = String(error)
    }
    expect(diagnostic).toMatch(/database connection/i)
    expect(diagnostic).not.toContain('PRIVATE_PASSWORD')
    expect(list).not.toHaveBeenCalled()
  })

  it.each([
    'https://host.invalid',
    `https://${staging}.supabase.co?token=PRIVATE_PASSWORD`,
    `https://PRIVATE_PASSWORD@${staging}.supabase.co`,
  ])('rejects nonstandard hosted URLs without disclosing input', (stagingUrl) => {
    expect(() => checkStagingMailTarget({ ...config, stagingUrl }, () => [branch])).toThrow(
      'Provide explicit standard hosted',
    )
  })

  it.each(
    [[], [{ ...branch, name: 'main' }], [{ project_ref: parent, name: 'develop' }], null].map(
      (rows) => ({ rows }),
    ),
  )('requires the staging project to be the parent develop branch', ({ rows }) => {
    expect(() => checkStagingMailTarget(config, () => rows)).toThrow(/branch/)
  })

  it('suppresses raw CLI failures and emits no credential diagnostics', () => {
    const directory = mkdtempSync(join(tmpdir(), 'staging-mail-target-'))
    try {
      const command = join(directory, 'supabase')
      writeFileSync(
        command,
        '#!/bin/sh\necho PRIVATE_PASSWORD\necho PRIVATE_PASSWORD >&2\nexit 1\n',
      )
      chmodSync(command, 0o755)
      const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL('../../scripts/check-staging-mail-target.mjs', import.meta.url))],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            PRODUCTION_SUPABASE_URL: config.productionUrl,
            STAGING_SUPABASE_URL: config.stagingUrl,
            STAGING_DATABASE_URL: config.databaseUrl,
          },
        },
      )
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('private CLI output withheld')
      expect(result.stdout + result.stderr).not.toContain('PRIVATE_PASSWORD')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
