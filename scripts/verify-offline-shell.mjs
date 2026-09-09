// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { build } from 'vite'
import { chromium } from 'playwright'

// The production build uses a synthetic backend; no journey can contact a real provider.
process.env.VITE_SUPABASE_URL = 'https://offline.openfray.invalid'
process.env.VITE_SUPABASE_ANON_KEY = 'synthetic-public-key'
await build()

const directory = resolve('dist/console')
const manifest = JSON.parse(await readFile(join(directory, 'shell-manifest.json'), 'utf8'))
const originalWorker = await readFile(join(directory, 'sw.js'), 'utf8')
const originalHtml = await readFile(join(directory, 'index.html'), 'utf8')
/** Hash deployment bytes independently of the build plugin. */
function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}
for (const asset of manifest.assets) {
  assert.equal(
    hash(await readFile(join(directory, asset.url.slice('/console/'.length)))),
    asset.sha256,
  )
}
assert(manifest.assets.some((asset) => asset.url === '/console/index.html'))
assert(manifest.assets.some((asset) => asset.url.endsWith('.js')))
assert(manifest.assets.some((asset) => asset.url.endsWith('.css')))
assert(manifest.assets.some((asset) => asset.url.startsWith('/console/compendium/')))
assert(
  !manifest.assets.some((asset) => !asset.url.startsWith('/console/') || asset.url.includes('?')),
)
console.log('PASS production asset hashes and required shell assets')

const fixture = await build({
  configFile: false,
  publicDir: false,
  logLevel: 'silent',
  build: {
    write: false,
    lib: {
      entry: resolve('tests/fixtures/offlineJourney.ts'),
      formats: ['es'],
      fileName: 'fixture',
    },
  },
})
const fixtureOutput = Array.isArray(fixture) ? fixture[0] : fixture
const fixtureCode = fixtureOutput.output.find((output) => output.type === 'chunk').code
let deployment = 'a'
let broken = false
let connected = true
let allowIdentity = true
const htmlB = originalHtml
  .replace('<html', '<html data-shell-version="b"')
  .replaceAll(manifest.version, 'journey-b')
const htmlHash = manifest.assets.find((asset) => asset.url === '/console/index.html').sha256
const imageHash = manifest.assets.find((asset) => asset.url === '/console/og-image.png').sha256
const imageB = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/A5sAAAAASUVORK5CYII=',
  'base64',
)
/** Serve two deployments without modifying the production build on disk. */
const server = createServer(async (request, response) => {
  if (!connected) {
    request.socket.destroy()
    return
  }
  const path = new URL(request.url, 'http://localhost').pathname
  const headers = { 'Cache-Control': 'no-store' }
  try {
    if (path === '/fixture.html') {
      response.writeHead(200, { ...headers, 'Content-Type': 'text/html' })
      response.end(
        '<html><body><script type="module">import {seedRecovery} from "/fixture.js"; await seedRecovery(); document.body.textContent="Fixture ready";</script></body></html>',
      )
    } else if (path === '/signout.html' || path === '/inspect.html') {
      response.writeHead(200, { ...headers, 'Content-Type': 'text/html' })
      response.end(
        path === '/signout.html'
          ? '<html><body><script type="module">import {signOutFixture} from "/fixture.js"; await signOutFixture(); document.body.textContent="Signed out";</script></body></html>'
          : '<html><body><script type="module">import {ownerRecoveryHasOnlyFixture} from "/fixture.js"; if (!await ownerRecoveryHasOnlyFixture()) throw new Error("Owner recovery changed"); document.body.textContent="Owner recovery unchanged";</script></body></html>',
      )
    } else if (path === '/fixture.js') {
      response.writeHead(200, { ...headers, 'Content-Type': 'text/javascript' })
      response.end(fixtureCode)
    } else if (path === '/console/sw.js') {
      response.writeHead(200, { ...headers, 'Content-Type': 'text/javascript' })
      response.end(
        deployment === 'a'
          ? originalWorker
          : originalWorker
              .replaceAll(manifest.version, `journey-${deployment}`)
              .replaceAll(htmlHash, hash(htmlB))
              .replaceAll(imageHash, hash(imageB)),
      )
    } else if (broken && path === '/console/index.html') {
      response.writeHead(503)
      response.end('Interrupted deployment')
    } else if (path === '/console/' || path === '/console/index.html') {
      response.writeHead(200, { ...headers, 'Content-Type': 'text/html' })
      response.end(deployment === 'a' ? originalHtml : htmlB)
    } else if (path === '/console/og-image.png' && deployment !== 'a') {
      response.writeHead(200, { ...headers, 'Content-Type': 'image/png' })
      response.end(imageB)
    } else if (path.startsWith('/console/')) {
      const file = resolve(directory, '.' + path.slice('/console'.length))
      if (!file.startsWith(directory + '/')) throw new Error('Outside fixture root')
      const type = path.endsWith('.html')
        ? 'text/html'
        : path.endsWith('.js')
          ? 'text/javascript'
          : path.endsWith('.css')
            ? 'text/css'
            : path.endsWith('.json')
              ? 'application/json'
              : 'application/octet-stream'
      response.writeHead(200, { ...headers, 'Content-Type': type })
      response.end(await readFile(file))
    } else {
      response.writeHead(404)
      response.end()
    }
  } catch {
    if (!response.headersSent) response.writeHead(404)
    response.end()
  }
})
await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`
const profile = await mkdtemp(join(tmpdir(), 'openfray-offline-'))
let context
/** Launch the same browser profile so recovery survives closing the browser. */
async function launch() {
  const browser = await chromium.launchPersistentContext(profile, {
    headless: true,
    viewport: { width: 1440, height: 1000 },
  })
  await browser.route('https://**/*', (route) => route.abort())
  await browser.route('https://offline.openfray.invalid/auth/v1/user', (route) =>
    allowIdentity
      ? route.fulfill({
          json: {
            id: 'synthetic-owner',
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: {},
            created_at: '2026-09-02T10:00:00Z',
          },
        })
      : route.abort(),
  )
  await browser.route('https://offline.openfray.invalid/auth/v1/logout*', (route) =>
    allowIdentity ? route.fulfill({ status: 204 }) : route.abort(),
  )
  return browser
}
/** Block the origin as well as browser traffic so cached responses are the only offline path. */
async function setConnected(online) {
  connected = online
  await context.setOffline(!online)
}

/** Read worker identity independently of the HTML that a fallback might have served. */
async function controllerVersion(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const channel = new MessageChannel()
        const timeout = setTimeout(() => {
          channel.port1.close()
          reject(new Error('Worker identity timed out'))
        }, 3000)
        channel.port1.onmessage = (event) => {
          clearTimeout(timeout)
          channel.port1.close()
          resolve(event.data.version)
        }
        navigator.serviceWorker.controller.postMessage({ type: 'SHELL_INFO' }, [channel.port2])
      }),
  )
}

/** Observe mutable asset bytes independently of the worker's reported deployment. */
async function servedImageHash(page) {
  return page.evaluate(async () => {
    const response = await fetch('/console/og-image.png')
    const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer())
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  })
}

/** Await a DOM condition without relying on fixed sleeps. */
async function visible(page, text) {
  await page.getByText(text, { exact: true }).first().waitFor({ timeout: 10_000 })
}
try {
  context = await launch()
  let page = context.pages()[0]
  await page.goto(origin + '/console/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.goto(origin + '/fixture.html')
  await visible(page, 'Fixture ready')
  allowIdentity = false
  await context.close()

  context = await launch()
  await setConnected(false)
  page = context.pages()[0]
  await page.goto(origin + '/console/')
  await visible(page, 'Offline recovery journey')
  assert(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
  console.log('PASS signed-in device recovery after offline browser restart')

  await setConnected(true)
  deployment = 'b'
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration()).update()
  })
  await visible(page, 'A console update is available.')
  assert.equal(await page.locator('html').getAttribute('data-shell-version'), null)
  await page.getByRole('button', { name: 'Review update', exact: true }).click()
  await mkdir('local/offline-evidence', { recursive: true })
  await page.screenshot({ path: 'local/offline-evidence/update-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'local/offline-evidence/update-phone.png' })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click()
  assert.equal(await page.locator('html').getAttribute('data-shell-version'), null)
  console.log('PASS active fight keeps its existing shell until confirmation')

  const second = await context.newPage()
  await second.goto(origin + '/console/')
  await page.getByRole('button', { name: 'Review update', exact: true }).click()
  await page.getByRole('button', { name: 'Update and reload', exact: true }).click()
  await visible(page, 'Close the other console tabs, then retry the update.')
  await second.close()
  await page.evaluate(() => {
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.activationReached = true
        const listen = IDBRequest.prototype.addEventListener
        /** Hold recovery completion after activation so browser closure interrupts the handoff. */
        IDBRequest.prototype.addEventListener = function (type, ...args) {
          if (type !== 'success') return listen.call(this, type, ...args)
        }
      },
      { once: true },
    )
  })
  await page
    .getByRole('button', { name: 'Update and reload', exact: true })
    .click({ noWaitAfter: true })
  await page.waitForFunction(() => window.activationReached === true)
  assert.equal(await controllerVersion(page), 'journey-b')
  assert.equal(await page.locator('html').getAttribute('data-shell-version'), null)
  assert.equal(await servedImageHash(page), imageHash)
  await context.close()
  context = await launch()
  await setConnected(false)
  page = context.pages()[0]
  await page.goto(origin + '/console/')
  await visible(page, 'Offline recovery journey')
  assert.equal(await controllerVersion(page), 'journey-b')
  assert.equal(await page.locator('html').getAttribute('data-shell-version'), 'b')
  assert.equal(await servedImageHash(page), hash(imageB))
  console.log(
    'PASS multiple-tab guard and recovery after interruption between activation and reload',
  )
  await setConnected(true)

  deployment = 'c'
  broken = true
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration()).update()
  })
  await visible(page, 'Offline setup failed. Keep this tab open and retry when connected.')
  await setConnected(false)
  await page.reload()
  await visible(page, 'Offline recovery journey')
  assert.equal(await page.locator('html').getAttribute('data-shell-version'), 'b')
  console.log('PASS failed installation retains the previous validated shell')

  await page.evaluate(async () => {
    await (await caches.open('openfray-shell-journey-b')).delete('/console/index.html')
  })
  await page.reload()
  await visible(page, 'Offline recovery journey')
  assert.equal(await page.locator('html').getAttribute('data-shell-version'), null)
  console.log('PASS stale cache falls back to a complete retained shell')

  await context.close()
  broken = false
  deployment = 'a'
  context = await launch()
  await setConnected(true)
  page = context.pages()[0]
  await page.goto(origin + '/console/')
  await visible(page, 'A console update is available.')
  await page.getByRole('button', { name: 'Review update', exact: true }).click()
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Update and reload', exact: true }).click(),
  ])
  assert.equal(await controllerVersion(page), manifest.version)
  await context.close()
  context = await launch()
  await setConnected(false)
  page = context.pages()[0]
  await page.goto(origin + '/console/')
  await visible(page, 'Offline recovery journey')
  assert.equal(await page.locator('html').getAttribute('data-shell-version'), null)
  assert.equal(await controllerVersion(page), manifest.version)
  console.log('PASS rollback to the previous worker and shell after browser restart')

  await page.evaluate(async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('openfray-shell-'))
        await (await caches.open(name)).delete('/console/index.html')
    }
  })
  await page.reload()
  await visible(page, 'The offline console is unavailable')
  await setConnected(true)
  await page.getByRole('link', { name: 'Repair offline setup' }).click()
  await page.getByRole('button', { name: 'Repair offline setup' }).click()
  await visible(page, 'Offline recovery journey')
  console.log('PASS explicit repair retains device recovery after complete shell eviction')

  await page.setViewportSize({ width: 390, height: 844 })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: join(profile, 'offline-phone.png') })
  console.log('PASS phone shell has no horizontal overflow')

  await page.setViewportSize({ width: 1440, height: 1000 })
  allowIdentity = true
  await page.goto(origin + '/signout.html')
  await visible(page, 'Signed out')
  allowIdentity = false
  await context.close()
  context = await launch()
  await setConnected(false)
  page = context.pages()[0]
  await page.goto(origin + '/console/')
  await visible(page, 'Nothing logged yet.')
  assert.equal(await page.getByText('Offline recovery journey', { exact: true }).count(), 0)
  await page.getByRole('button', { name: 'd20', exact: true }).click()
  await visible(page, '1d20')
  await setConnected(true)
  await page.goto(origin + '/inspect.html')
  await visible(page, 'Owner recovery unchanged')
  console.log('PASS signed-out offline restart keeps anonymous actions out of owner recovery')
} catch (error) {
  const failedPage = context?.pages().at(-1)
  if (failedPage) {
    await mkdir('local/offline-evidence', { recursive: true })
    await failedPage.screenshot({ path: 'local/offline-evidence/failure.png' })
  }
  throw error
} finally {
  await context?.close()
  await new Promise((done) => server.close(done))
  await rm(profile, { recursive: true, force: true })
}
