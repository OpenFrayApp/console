// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

/** Listen on an available local port and return its origin. */
async function listen(server: ReturnType<typeof createServer>): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not bind a port.')
  return `http://127.0.0.1:${address.port}`
}

describe('recovery monitor delivery', () => {
  it('authenticates the allowlisted content-free event', async () => {
    let authorization: string | undefined
    let body = ''
    const server = createServer((request, response) => {
      authorization = request.headers.authorization
      request.setEncoding('utf8')
      request.on('data', (chunk) => (body += chunk))
      request.on('end', () => {
        response.statusCode = 204
        response.end()
      })
    })
    const webhook = await listen(server)

    try {
      await execFileAsync('scripts/notify-recovery-monitor.sh', ['backup_stale'], {
        env: {
          ...process.env,
          RECOVERY_MONITOR_WEBHOOK: webhook,
          RECOVERY_MONITOR_TOKEN: 'monitor-token',
        },
      })
    } finally {
      server.close()
    }

    expect(authorization).toBe('Bearer monitor-token')
    expect(JSON.parse(body)).toEqual({ event: 'backup_stale', service: 'openfray-recovery' })
  })

  it('fails before delivery when the authentication token is missing', async () => {
    await expect(
      execFileAsync('scripts/notify-recovery-monitor.sh', ['restore_failed'], {
        env: {
          ...process.env,
          RECOVERY_MONITOR_WEBHOOK: 'https://monitor.invalid',
          RECOVERY_MONITOR_TOKEN: '',
        },
      }),
    ).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('missing token') })
  })
})
