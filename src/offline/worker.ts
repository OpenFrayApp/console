// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
/// <reference lib="webworker" />

import * as v from 'valibot'

const shellVersion = v.pipe(v.string(), v.regex(/^[a-z0-9-]{1,80}$/))
const shellManifest = v.strictObject({
  kind: v.literal('application-shell'),
  schemaVersion: v.literal(1),
  version: shellVersion,
  assets: v.pipe(
    v.array(
      v.strictObject({
        url: v.pipe(
          v.string(),
          v.maxLength(512),
          v.regex(/^\/console\/[a-zA-Z0-9_./@-]+$/),
          v.check((url) => !url.split('/').includes('..')),
        ),
        sha256: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/)),
      }),
    ),
    v.minLength(2),
    v.maxLength(1000),
  ),
})

export type ShellManifest = v.InferOutput<typeof shellManifest>

/** Install a verified static shell without caching account data or claiming running clients. */
export function installOfflineShell(
  scope: ServiceWorkerGlobalScope,
  manifest: ShellManifest,
): void {
  const prefix = 'openfray-shell-'
  const name = prefix + manifest.version
  const marker = '/console/__validated-shell__'
  const approved = '/console/__approved-shell__'
  const home = '/console/index.html'

  /** Decode bounded cache metadata without trusting its TypeScript shape. */
  async function readManifest(cache: Cache, key: string): Promise<ShellManifest | null> {
    try {
      const record = await cache.match(key)
      if (!record) return null
      const text = await record.text()
      if (text.length > 1_000_000) return null
      const decoded = v.safeParse(shellManifest, JSON.parse(text))
      return decoded.success ? decoded.output : null
    } catch {
      return null
    }
  }

  /** Return a shell only when its full expected inventory remains present. */
  async function complete(cache: Cache, expected: ShellManifest): Promise<boolean> {
    const installed = await readManifest(cache, marker)
    if (!installed || JSON.stringify(installed) !== JSON.stringify(expected)) return false
    if (!installed.assets.some((asset) => asset.url === home)) return false
    const entries = await Promise.all(installed.assets.map((asset) => cache.match(asset.url)))
    return entries.every(Boolean)
  }

  /** Admit the active worker's shell and deployments previously approved by activation. */
  async function approvedManifest(key: string): Promise<ShellManifest | null> {
    if (key === name) return manifest
    const installed = await readManifest(await scope.caches.open(key), approved)
    return installed && prefix + installed.version === key ? installed : null
  }

  /** Record rollback eligibility only once the browser activates this worker. */
  async function recordApproval(): Promise<void> {
    try {
      const cache = await scope.caches.open(name)
      if (await complete(cache, manifest))
        await cache.put(approved, new Response(JSON.stringify(manifest)))
    } catch {
      // Losing approval metadata must not reject activation and strand the previous shell.
    }
  }

  /** Bound each installation fetch so a stalled connection leaves an explicit failed install. */
  async function fetchAsset(url: string): Promise<{ response: Response; bytes: ArrayBuffer }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
      const response = await scope.fetch(url, {
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
      })
      const bytes = await response.clone().arrayBuffer()
      return { response, bytes }
    } finally {
      clearTimeout(timeout)
    }
  }

  /** Populate a new cache atomically from hash-verified deployment assets. */
  async function install(): Promise<void> {
    const cache = await scope.caches.open(name)
    if (await complete(cache, manifest)) return
    try {
      for (const asset of manifest.assets) {
        const { response, bytes } = await fetchAsset(asset.url)
        if (!response.ok || response.type === 'opaque') throw new Error('Shell asset unavailable')
        const digest = await crypto.subtle.digest('SHA-256', bytes)
        const hash = Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join('')
        if (hash !== asset.sha256) throw new Error('Shell asset version mismatch')
        await cache.put(asset.url, response)
      }
      await cache.put(marker, new Response(JSON.stringify(manifest)))
      if (!(await complete(cache, manifest))) throw new Error('Shell installation incomplete')
    } catch (error) {
      await scope.caches.delete(name)
      throw error
    }
  }

  /** Prefer this deployment, retaining validated older shells for rollback and open tabs. */
  async function shellNames(): Promise<string[]> {
    return [
      name,
      ...(await scope.caches.keys())
        .filter((key) => key.startsWith(prefix) && key !== name)
        .reverse(),
    ]
  }

  /** Serve a complete cached shell or an explicit recovery instruction after storage eviction. */
  async function navigation(): Promise<Response> {
    try {
      for (const key of await shellNames()) {
        const cache = await scope.caches.open(key)
        const expected = await approvedManifest(key)
        if (expected && (await complete(cache, expected))) return (await cache.match(home))!
      }
    } catch {
      // CacheStorage itself can be denied or evicted independently of IndexedDB recovery.
    }
    return new Response(
      '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Console recovery</title><h1>The offline console is unavailable</h1><p>Reconnect to repair the offline console. Repairing its static files leaves device recovery unchanged.</p><p><a href="/console/recover.html">Repair offline setup</a></p></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  /** Ask a live document for a bounded protocol response without trusting its payload. */
  async function askDocument(clientId: string, message: Record<string, string>): Promise<unknown> {
    const client = await scope.clients.get(clientId)
    if (!client) return null
    return new Promise((resolve) => {
      const channel = new MessageChannel()
      /** Release the handshake without accepting a late response. */
      function finish(answer: unknown): void {
        clearTimeout(timeout)
        channel.port1.close()
        resolve(answer)
      }
      const timeout = setTimeout(() => finish(null), 2000)
      channel.port1.onmessage = (event) => finish(event.data)
      client.postMessage(message, [channel.port2])
    })
  }

  /** Read the document's embedded deployment identity, including after a worker restart. */
  async function documentVersion(clientId: string): Promise<string | null> {
    const answer = await askDocument(clientId, { type: 'SHELL_DOCUMENT_VERSION' })
    const decoded = v.safeParse(v.strictObject({ version: shellVersion }), answer)
    return decoded.success ? decoded.output.version : null
  }

  /** Read static assets from the running document's version without storing runtime responses. */
  async function staticAsset(request: Request, clientId: string): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith('/console/assets/')) {
      const version = await documentVersion(clientId)
      if (!version)
        return new Response('The document version could not be verified. Reload the console.', {
          status: 503,
        })
      const key = prefix + version
      const expected = await approvedManifest(key)
      if (expected?.assets.some((asset) => asset.url === new URL(request.url).pathname)) {
        const cache = await scope.caches.open(key)
        const installed = await readManifest(cache, marker)
        if (installed && JSON.stringify(installed) === JSON.stringify(expected)) {
          const response = await cache.match(request.url)
          if (response) return response
        }
      }
      return new Response(
        'This shell asset is unavailable. Reconnect and repair the offline console.',
        { status: 503 },
      )
    }
    for (const key of await shellNames()) {
      const cache = await scope.caches.open(key)
      const expected = await approvedManifest(key)
      if (!expected || !(await complete(cache, expected))) continue
      const response = await cache.match(request.url)
      if (response) return response
    }
    return scope.fetch(request)
  }

  /** Activate only for an explicit update request from the sole console window. */
  async function approve(event: ExtendableMessageEvent): Promise<void> {
    const port = event.ports[0]
    if (!port) return
    if (event.data?.type === 'SHELL_INFO') {
      port.postMessage({ version: manifest.version })
      return
    }
    if (event.data?.type !== 'ACTIVATE_CHECKPOINT') return
    if (!(await complete(await scope.caches.open(name), manifest))) {
      port.postMessage({ status: 'incomplete' })
      return
    }
    const nonce: unknown = event.data.nonce
    if (
      !event.source ||
      !('id' in event.source) ||
      typeof nonce !== 'string' ||
      nonce.length > 80
    ) {
      port.postMessage({ status: 'other-tabs' })
      return
    }
    const answer = await askDocument(event.source.id, { type: 'SHELL_ACTIVATION_CONSENT', nonce })
    if (!v.is(v.strictObject({ confirmed: v.literal(true), nonce: v.literal(nonce) }), answer)) {
      port.postMessage({ status: 'incomplete' })
      return
    }
    // Recheck windows after validation and consent; already-running documents retain pinned assets.
    const windows = (
      await scope.clients.matchAll({ type: 'window', includeUncontrolled: true })
    ).filter((client) => new URL(client.url).pathname.startsWith('/console/'))
    if (
      windows.length !== 1 ||
      !event.source ||
      !('id' in event.source) ||
      windows[0].id !== event.source.id
    ) {
      port.postMessage({ status: 'other-tabs' })
      return
    }
    await scope.skipWaiting()
    port.postMessage({ status: 'activating' })
  }

  scope.addEventListener('install', (event) => event.waitUntil(install()))
  scope.addEventListener('activate', (event) => event.waitUntil(recordApproval()))
  // No claim or automatic skipWaiting: an installed deployment must not reload a running fight.
  scope.addEventListener('message', (event) => event.waitUntil(approve(event)))
  scope.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)
    if (event.request.method !== 'GET' || url.origin !== scope.location.origin) return
    if (url.pathname === '/console/recover.html' || url.pathname === '/console/recover.js') return
    if (
      event.request.mode === 'navigate' &&
      (url.pathname === '/console/' || url.pathname === home)
    ) {
      event.respondWith(navigation())
    } else if (event.request.mode === 'navigate') {
      return
    } else if (
      !url.search &&
      (manifest.assets.some((asset) => asset.url === url.pathname) ||
        ['/console/assets/', '/console/compendium/', '/console/backgrounds/'].some((path) =>
          url.pathname.startsWith(path),
        ))
    ) {
      event.respondWith(staticAsset(event.request, event.clientId))
    }
  })
}
