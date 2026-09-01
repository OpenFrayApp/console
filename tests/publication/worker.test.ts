// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { spawn, type ChildProcess } from 'node:child_process'
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/** Reserve an available local port for one short-lived workerd process. */
async function availablePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolveReady) => server.listen(0, '127.0.0.1', resolveReady))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  await new Promise<void>((resolveClosed) => server.close(() => resolveClosed()))
  return port
}

/** Wait until workerd accepts a request, or surface its startup failure. */
async function requestWorker(url: string, process: ChildProcess): Promise<Response> {
  let cause: unknown
  for (let attempt = 0; attempt < 40; attempt++) {
    if (process.exitCode !== null) throw new Error(`workerd exited with ${process.exitCode}`)
    try {
      return await fetch(url)
    } catch (error) {
      cause = error
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 25))
    }
  }
  throw new Error('workerd did not accept a request', { cause })
}

/** Compile the dependency-free publication module as a real workerd module. */
function workerModule(): string {
  const source = readFileSync(new URL('../../src/publication/index.ts', import.meta.url), 'utf8')
  const compiled = ts
    .transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace(/export\s+(?=(?:const|function)\s)/g, '')
  return `${compiled}\nexport default {\n  fetch() {\n    const outcome = normalizePublication({ kind: 'creature', data: { v: 1, name: 'Goblin', ref: 'srd-5.2:goblin' } });\n    return Response.json(outcome);\n  }\n};\n`
}

describe('publication contract in workerd', () => {
  it('normalizes inside the Cloudflare Worker runtime', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'publication-workerd-'))
    const port = await availablePort()
    writeFileSync(join(directory, 'worker.js'), workerModule())
    writeFileSync(
      join(directory, 'config.capnp'),
      `using Workerd = import "/workerd/workerd.capnp";\n` +
        `const config :Workerd.Config = (\n` +
        `  services = [(name = "main", worker = .worker)],\n` +
        `  sockets = [(name = "http", address = "127.0.0.1:${port}", http = (), service = "main")]\n` +
        `);\n` +
        `const worker :Workerd.Worker = (\n` +
        `  modules = [(name = "worker.js", esModule = embed "worker.js")],\n` +
        `  compatibilityDate = "2026-07-01"\n` +
        `);\n`,
    )
    const process = spawn(resolve('node_modules/.bin/workerd'), ['serve', 'config.capnp'], {
      cwd: directory,
      stdio: 'ignore',
    })
    try {
      const response = await requestWorker(`http://127.0.0.1:${port}/`, process)
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ status: 'ok' })
    } finally {
      process.kill('SIGTERM')
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
