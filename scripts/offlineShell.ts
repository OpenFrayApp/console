// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { build, type Plugin, type ResolvedConfig } from 'vite'

/** List deployment files recursively using URL-compatible relative paths. */
async function files(directory: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(join(directory, prefix), { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = prefix + entry.name
      return entry.isDirectory() ? files(directory, path + '/') : [path]
    }),
  )
  return nested.flat().sort()
}

/** Emit a worker whose install verifies every required asset against this production build. */
export function offlineShell(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'openfray-offline-shell',
    apply: 'build',
    /** Retain the resolved deployment directory for shell generation. */
    configResolved(resolved) {
      config = resolved
    },
    /** Hash the emitted deployment and compile its self-contained worker. */
    async closeBundle() {
      const directory = resolve(config.root, config.build.outDir)
      const paths = (await files(directory)).filter(
        (path) => !['sw.js', 'shell-manifest.json'].includes(path) && !path.endsWith('.map'),
      )
      const assets = await Promise.all(
        paths.map(async (path) => ({
          url: '/console/' + path,
          sha256: createHash('sha256')
            .update(await readFile(join(directory, path)))
            .digest('hex'),
        })),
      )
      const source = await readFile(resolve(config.root, 'src/offline/worker.ts'), 'utf8')
      const version = createHash('sha256')
        .update(source)
        .update(JSON.stringify(assets))
        .digest('hex')
        .slice(0, 20)
      const htmlPath = join(directory, 'index.html')
      const html = (await readFile(htmlPath, 'utf8')).replace(
        '<head>',
        `<head>\n<meta name="openfray-shell" content="${version}">`,
      )
      await writeFile(htmlPath, html)
      assets.find((asset) => asset.url === '/console/index.html')!.sha256 = createHash('sha256')
        .update(html)
        .digest('hex')
      const manifest = { kind: 'application-shell', schemaVersion: 1, version, assets }
      const entry = 'virtual:openfray-offline-worker'
      const workerBuild = await build({
        configFile: false,
        publicDir: false,
        logLevel: 'silent',
        plugins: [
          {
            name: 'openfray-worker-entry',
            /** Resolve the generated worker entry without creating a temporary source file. */
            resolveId(id) {
              return id === entry ? entry : undefined
            },
            /** Boot the worker with this deployment's embedded inventory. */
            load(id) {
              return id === entry
                ? `import { installOfflineShell } from ${JSON.stringify(resolve(config.root, 'src/offline/worker.ts'))}; installOfflineShell(self, ${JSON.stringify(manifest)});`
                : undefined
            },
          },
        ],
        build: {
          write: false,
          target: 'es2020',
          modulePreload: false,
          rollupOptions: { input: entry, output: { format: 'iife', name: 'OpenFrayOffline' } },
        },
      })
      const output = Array.isArray(workerBuild) ? workerBuild[0] : workerBuild
      if (!('output' in output)) throw new Error('Offline worker build did not emit a bundle')
      const worker = output.output.find((file) => file.type === 'chunk')
      if (!worker || worker.type !== 'chunk') throw new Error('Offline worker bundle is missing')
      await writeFile(join(directory, 'sw.js'), worker.code)
      await writeFile(
        join(directory, 'shell-manifest.json'),
        JSON.stringify(manifest, null, 2) + '\n',
      )
    },
  }
}
