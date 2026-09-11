#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/** Require one process value without printing it. */
function need(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}.`)
  return value
}

/** Send one bounded request to the isolated Auth service. */
async function request(url, apiKey, bearer, path, init) {
  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: apiKey,
      authorization: `Bearer ${bearer}`,
      'content-type': 'application/json',
      ...init.headers,
    },
    signal: AbortSignal.timeout(10_000),
  })
}

/** Sign one short-lived local user token for the isolated Auth probe. */
function userToken(secret, userId) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const body = encode({
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 300,
    role: 'authenticated',
    sub: userId,
  })
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

/** Exercise account creation and token authentication against isolated recovery Auth. */
async function main() {
  const apiUrl = need('RECOVERY_API_URL')
  const anonKey = need('RECOVERY_ANON_KEY')
  const serviceKey = need('RECOVERY_SERVICE_ROLE_KEY')
  const jwtSecret = need('RECOVERY_JWT_SECRET')
  const output = resolve(need('RECOVERY_AUTH_CHECK_PATH'))
  const parsed = new URL(apiUrl)
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    throw new Error('Recovery Auth verification requires an isolated local API.')
  }

  const email = `recovery-${randomUUID()}@example.test`
  const password = randomBytes(24).toString('base64url')
  let userId = null
  try {
    const created = await request(apiUrl, serviceKey, serviceKey, '/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, email_confirm: true }),
    })
    const createdBody = await created.json()
    if (!created.ok || typeof createdBody.id !== 'string') {
      throw new Error('Recovery Auth could not create the synthetic account.')
    }
    userId = createdBody.id

    const authenticated = await request(
      apiUrl,
      anonKey,
      userToken(jwtSecret, userId),
      '/auth/v1/user',
      { method: 'GET' },
    )
    const authenticatedBody = await authenticated.json()
    if (!authenticated.ok || authenticatedBody.id !== userId) {
      throw new Error('Recovery Auth could not authenticate the synthetic account.')
    }
  } finally {
    if (userId) {
      const removed = await request(
        apiUrl,
        serviceKey,
        serviceKey,
        `/auth/v1/admin/users/${userId}`,
        {
          method: 'DELETE',
        },
      )
      if (!removed.ok) throw new Error('Recovery Auth could not remove the synthetic account.')
    }
  }

  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, '{"authentication":"passed"}\n')
  console.log('Recovery Auth: passed.')
}

main().catch((error) => {
  console.error(`Recovery Auth verification failed: ${error.message}`)
  process.exitCode = 1
})
