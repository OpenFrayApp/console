#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { chromium } from 'playwright'
import { transformWithEsbuild } from 'vite'

const source = await readFile(new URL('../src/state/writerIdentity.ts', import.meta.url), 'utf8')
const { code } = await transformWithEsbuild(source, 'writerIdentity.ts', { loader: 'ts' })
const html =
  '<script type="module">import { browserWriterIdentity } from "/identity.js"; window.identity = browserWriterIdentity(); window.repeated = browserWriterIdentity();</script>'
const server = createServer((request, response) => {
  const script = request.url === '/identity.js'
  response.writeHead(200, {
    'Content-Type': script ? 'text/javascript' : 'text/html',
    'Cache-Control': 'no-store',
  })
  response.end(script ? code : html)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const first = await context.newPage()
  await first.goto(origin)
  const original = await first.evaluate('window.identity')
  assert.match(original, /^[0-9a-f-]{36}$/)
  assert.equal(await first.evaluate('window.repeated'), original)
  await first.reload()
  assert.equal(await first.evaluate('window.identity'), original)
  console.log('PASS reload and repeated lifecycle creation retain one writer identity')

  const opened = context.waitForEvent('page')
  await first.evaluate((url) => {
    window.open(url, '_blank')
  }, origin)
  const duplicate = await opened
  await duplicate.waitForLoadState()
  const duplicateId = await duplicate.evaluate('window.identity')
  assert.notEqual(duplicateId, original)
  await duplicate.reload()
  assert.equal(await duplicate.evaluate('window.identity'), duplicateId)
  assert.equal(await first.evaluate('window.identity'), original)
  console.log('PASS copied opener session storage cannot reuse a live writer identity')

  const independent = await context.newPage()
  await independent.goto(origin)
  const independentId = await independent.evaluate('window.identity')
  assert.notEqual(independentId, original)
  assert.notEqual(independentId, duplicateId)
  console.log('PASS independent tabs retain distinct writer identities')

  const fallback = await context.newPage()
  await fallback.addInitScript(() => {
    Object.defineProperty(navigator, 'locks', { value: undefined })
  })
  await fallback.goto(origin)
  const beforeReload = await fallback.evaluate('window.identity')
  await fallback.reload()
  assert.notEqual(await fallback.evaluate('window.identity'), beforeReload)
  console.log('PASS browsers without Web Locks keep conservative writer isolation')
} finally {
  await browser?.close()
  await new Promise((resolve) => server.close(resolve))
}
