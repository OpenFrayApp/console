// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { installOfflineShell, type ShellManifest } from '../../src/offline/worker.ts'

/** Model browser CacheStorage, network responses, and window clients at the worker boundary. */
function browser() {
  const stores = new Map<string, Map<string, Response>>()
  const network = new Map<string, { body: string; status?: number }>()
  const skipped: string[] = []
  let clientVersion = 'previous'
  let consent = true
  let cacheRead: (() => Promise<void>) | undefined
  let windows = [{ id: 'gm', url: 'https://console.test/console/' }]
  const caches = {
    /** Return an isolated version cache with browser-like response cloning. */
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)!
      return {
        /** Return a cloned response for the requested cache URL. */
        match: async (key: string) => {
          await cacheRead?.()
          return store.get(new URL(key, 'https://console.test').pathname)?.clone()
        },
        /** Store a response under its normalized cache URL. */
        put: async (key: string, response: Response) => {
          store.set(new URL(key, 'https://console.test').pathname, response.clone())
        },
      }
    },
    /** List retained version caches. */
    keys: async () => [...stores.keys()],
    /** Remove only the named cache. */
    delete: async (name: string) => stores.delete(name),
  }
  /** Register a worker against the shared browser adapters. */
  function worker(manifest: ShellManifest) {
    const listeners = new Map<string, (event: unknown) => void>()
    installOfflineShell(
      {
        location: { origin: 'https://console.test' },
        caches,
        addEventListener: (type: string, listener: (event: unknown) => void) =>
          listeners.set(type, listener),
        fetch: async (url: string) => {
          const value = network.get(url)
          return new Response(value?.body ?? 'missing', {
            status: value?.status ?? (value ? 200 : 404),
          })
        },
        clients: {
          /** Return the live console windows at enumeration time. */
          matchAll: async () => windows,
          /** Respond with the deployment embedded in the requesting document. */
          get: async () => ({
            /** Answer version queries and this fixture's explicit update consent. */
            postMessage: (message: { type: string; nonce?: string }, ports: MessagePort[]) => {
              ports[0].postMessage(
                message.type === 'SHELL_ACTIVATION_CONSENT'
                  ? { confirmed: consent, nonce: message.nonce }
                  : { version: clientVersion },
              )
              ports[0].close()
            },
          }),
        },
        skipWaiting: async () => {
          skipped.push(manifest.version)
        },
      } as unknown as ServiceWorkerGlobalScope,
      manifest,
    )
    return {
      /** Dispatch installation and observe its lifetime promise. */
      async install() {
        let promise: Promise<unknown> = Promise.resolve()
        listeners.get('install')!({
          waitUntil: (pending: Promise<unknown>) => {
            promise = pending
          },
        })
        return promise
      },
      /** Finish browser-owned activation when no previous clients remain. */
      async activateNaturally() {
        let promise: Promise<unknown> = Promise.resolve()
        listeners.get('activate')?.({
          waitUntil: (pending: Promise<unknown>) => {
            promise = pending
          },
        })
        await promise
      },
      /** Dispatch a navigation or resource request through the worker fetch boundary. */
      async fetch(path: string, navigation = false) {
        const request = new Request('https://console.test' + path)
        if (navigation) Object.defineProperty(request, 'mode', { value: 'navigate' })
        let response: Promise<Response> | undefined
        listeners.get('fetch')!({
          request,
          clientId: 'gm',
          respondWith: (pending: Promise<Response>) => {
            response = pending
          },
        })
        return response
      },
      /** Ask the waiting worker to activate from the specified window. */
      async activate(id = 'gm') {
        let promise: Promise<unknown> = Promise.resolve()
        let response: unknown
        listeners.get('message')!({
          data: { type: 'ACTIVATE_CHECKPOINT', nonce: 'fixture-confirmation' },
          source: { id },
          ports: [
            {
              postMessage: (message: unknown) => {
                response = message
              },
            },
          ],
          waitUntil: (pending: Promise<unknown>) => {
            promise = pending
          },
        })
        await promise
        return response
      },
    }
  }
  /** Publish deterministic deployment bytes and hashes. */
  function deploy(version: string) {
    const bodies = [
      ['/console/index.html', `<html>${version}</html>`],
      [`/console/assets/${version}.js`, `console.log('${version}')`],
      ['/console/compendium/index.json', JSON.stringify({ version })],
    ]
    for (const [url, body] of bodies) network.set(url, { body })
    return worker({
      kind: 'application-shell',
      schemaVersion: 1,
      version,
      assets: bodies.map(([url, body]) => ({
        url,
        sha256: createHash('sha256').update(body).digest('hex'),
      })),
    })
  }
  return {
    deploy,
    stores,
    network,
    skipped,
    /** Model the requesting document declining update consent. */
    setConsent: (confirmed: boolean) => {
      consent = confirmed
    },
    /** Set the deployment loaded by the requesting page. */
    setClientVersion: (version: string) => {
      clientVersion = version
    },
    /** Pause CacheStorage reads to exercise concurrent browser events. */
    onCacheRead: (read: () => Promise<void>) => {
      cacheRead = read
    },
    /** Change which console windows exist at the browser boundary. */
    setWindows: (value: typeof windows) => {
      windows = value
    },
  }
}

it.each([404, 200])(
  'rejects missing or wrong-version install bytes (%s), retaining the previous shell',
  async (status) => {
    const host = browser()
    const old = host.deploy('old')
    await old.install()
    const next = host.deploy('next')
    host.network.set('/console/assets/next.js', { body: 'wrong deployment', status })
    await expect(next.install()).rejects.toThrow()
    expect([...host.stores.keys()]).toEqual(['openfray-shell-old'])
    expect(await (await old.fetch('/console/', true))?.text()).toBe('<html>old</html>')
    expect(host.skipped).toEqual([])
  },
)

it('keeps updates waiting and refuses activation while another console window is open', async () => {
  const host = browser()
  const worker = host.deploy('next')
  await worker.install()
  expect(host.skipped).toEqual([])
  host.setWindows([
    { id: 'gm', url: 'https://console.test/console/' },
    { id: 'other', url: 'https://console.test/console/' },
  ])
  expect(await worker.activate()).toEqual({ status: 'other-tabs' })
  expect(host.skipped).toEqual([])
  host.setWindows([{ id: 'gm', url: 'https://console.test/console/' }])
  expect(await worker.activate('unknown')).toEqual({ status: 'other-tabs' })
  expect(await worker.activate()).toEqual({ status: 'activating' })
  expect(host.skipped).toEqual(['next'])
})

it('requires the requesting document to acknowledge its update consent', async () => {
  const host = browser()
  const worker = host.deploy('current')
  await worker.install()
  host.setConsent(false)
  expect(await worker.activate()).toEqual({ status: 'incomplete' })
  expect(host.skipped).toEqual([])
})

it('refuses activation when another window arrives during checkpoint validation', async () => {
  const host = browser()
  const worker = host.deploy('current')
  await worker.install()
  let started: () => void = () => undefined
  let release: () => void = () => undefined
  const reading = new Promise<void>((resolve) => {
    started = resolve
  })
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  host.onCacheRead(() => {
    started()
    return held
  })
  const activation = worker.activate()
  await reading
  host.setWindows([
    { id: 'gm', url: 'https://console.test/console/' },
    { id: 'arriving', url: 'https://console.test/console/' },
  ])
  release()
  expect(await activation).toEqual({ status: 'other-tabs' })
  expect(host.skipped).toEqual([])
})

it('falls back from an evicted asset to a complete previous shell with its matching assets', async () => {
  const host = browser()
  const previous = host.deploy('previous')
  await previous.install()
  await previous.activateNaturally()
  const current = host.deploy('current')
  await current.install()
  host.stores.get('openfray-shell-current')!.delete('/console/assets/current.js')
  expect(await (await current.fetch('/console/', true))?.text()).toBe('<html>previous</html>')
  expect(await (await current.fetch('/console/assets/previous.js'))?.text()).toBe(
    "console.log('previous')",
  )
  expect(await (await current.fetch('/console/compendium/index.json'))?.json()).toEqual({
    version: 'previous',
  })
  expect(await current.activate()).toEqual({ status: 'incomplete' })
})

it('pins mutable static assets to the running document even after the controller changes', async () => {
  const host = browser()
  const previous = host.deploy('previous')
  await previous.install()
  await previous.activateNaturally()
  const current = host.deploy('current')
  await current.install()
  await current.activateNaturally()
  host.setClientVersion('previous')
  expect(await (await current.fetch('/console/compendium/index.json'))?.json()).toEqual({
    version: 'previous',
  })
})

it('never falls forward into an installed but unapproved waiting deployment', async () => {
  const host = browser()
  const active = host.deploy('active')
  await active.install()
  await active.activateNaturally()
  const waiting = host.deploy('waiting')
  await waiting.install()
  host.stores.get('openfray-shell-active')!.delete('/console/assets/active.js')
  expect((await active.fetch('/console/', true))?.status).toBe(503)
})

it('gives an explicit recovery path when every cached shell is incomplete', async () => {
  const host = browser()
  const worker = host.deploy('current')
  await worker.install()
  host.stores.get('openfray-shell-current')!.delete('/console/assets/current.js')
  const response = await worker.fetch('/console/', true)
  expect(response?.status).toBe(503)
  expect(await response?.text()).toContain('href="/console/recover.html"')
})

it('rejects a forged completion marker rather than approving an incomplete shell', async () => {
  const host = browser()
  const worker = host.deploy('current')
  await worker.install()
  const cache = host.stores.get('openfray-shell-current')!
  cache.delete('/console/assets/current.js')
  cache.set(
    '/console/__validated-shell__',
    new Response(JSON.stringify({ assets: [{ url: '/console/index.html' }] })),
  )
  expect(await worker.activate()).toEqual({ status: 'incomplete' })
  expect((await worker.fetch('/console/', true))?.status).toBe(503)
})

it('does not intercept private routes, runtime responses, or non-static query URLs', async () => {
  const host = browser()
  const worker = host.deploy('current')
  await worker.install()
  for (const path of [
    '/console/rest/v1/encounters',
    '/console/p/private',
    '/s/private',
    '/console/assets/current.js?token=secret',
  ]) {
    expect(await worker.fetch(path)).toBeUndefined()
  }
})
