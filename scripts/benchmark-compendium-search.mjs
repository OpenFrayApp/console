// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { gzipSync } from 'node:zlib'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { platform, release } from 'node:os'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
import { LIBRARIES } from '../src/compendium/libraries.ts'
import { contentType, meetsThresholds, summarize } from './lib/compendiumBenchmark.mjs'

const REQUIREMENT = 'PC-2'
const PROFILE = {
  id: 'pc2-constrained-v1',
  cpuSlowdownMultiplier: 4,
  latencyMs: 150,
  downloadBitsPerSecond: 1_600_000,
  uploadBitsPerSecond: 750_000,
  viewport: { width: 1280, height: 800 },
}
const COLD_TARGET_MS = 4_800
const COLD_LIMIT_MS = 6_000
const WARM_LIMIT_MS = 200
const coldRuns = Number(process.env.PC2_COLD_RUNS ?? 10)
const warmRuns = Number(process.env.PC2_WARM_RUNS ?? 30)
const runLabel = process.env.PC2_RUN_LABEL ?? 'candidate'
const directory = resolve('dist/console')
const outputDirectory = resolve(
  'local/production-hardening/PC-2',
  `${runLabel}-${new Date().toISOString().replaceAll(':', '-')}`,
)
const compendiumRequests = []

assert(Number.isInteger(coldRuns) && coldRuns > 0, 'PC2_COLD_RUNS must be a positive integer')
assert(Number.isInteger(warmRuns) && warmRuns > 0, 'PC2_WARM_RUNS must be a positive integer')

/** Return the SHA-256 digest of bytes. */
function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}

/** Serve the production build with deterministic gzip transfer and no browser cache. */
function startServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost')
    const relative =
      url.pathname === '/console/' ? 'index.html' : url.pathname.slice('/console/'.length)
    if (!relative || relative.includes('..') || url.pathname === '/console/sw.js') {
      response.writeHead(url.pathname === '/console/sw.js' ? 404 : 400)
      response.end()
      return
    }
    try {
      const body = await readFile(resolve(directory, relative))
      const compressed = gzipSync(body, { level: 9, mtime: 0 })
      if (url.pathname.startsWith('/console/compendium/')) {
        compendiumRequests.push({
          file: basename(url.pathname),
          rawBytes: body.byteLength,
          transferredBytes: compressed.byteLength,
        })
      }
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Encoding': 'gzip',
        'Content-Length': compressed.byteLength,
        'Content-Type': contentType(relative),
      })
      response.end(compressed)
    } catch {
      response.writeHead(404)
      response.end()
    }
  })
  return new Promise((accept, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => accept(server))
  })
}

/** Read every declared compendium payload and report its source, kind, entries, bytes, and hash. */
async function payloadComposition() {
  const rows = []
  for (const library of LIBRARIES) {
    for (const [kind, file] of [
      ['creatures', library.creaturesFile],
      ['spells', library.spellsFile],
    ]) {
      if (!file) continue
      const body = await readFile(resolve(directory, 'compendium', file))
      const parsed = JSON.parse(body)
      assert(Array.isArray(parsed), `${file} must contain a JSON array`)
      rows.push({
        source: library.id,
        kind,
        file,
        entries: parsed.length,
        rawBytes: body.byteLength,
        gzipBytes: gzipSync(body, { level: 9, mtime: 0 }).byteLength,
        sha256: hash(body),
      })
    }
  }
  return rows
}

/** Return a deterministic query case and expected result count from the enabled core library. */
async function queryCase(query) {
  const core = LIBRARIES.find((library) => library.id === 'srd-5.2')
  assert(core?.creaturesFile)
  const creatures = JSON.parse(
    await readFile(resolve(directory, 'compendium', core.creaturesFile), 'utf8'),
  )
  return {
    query,
    expectedCount: creatures.filter((creature) => creature.name.toLowerCase().includes(query))
      .length,
  }
}

/** Apply the versioned constrained network and CPU profile to one fresh page. */
async function constrain(page) {
  const session = await page.context().newCDPSession(page)
  await session.send('Network.enable')
  await session.send('Network.setCacheDisabled', { cacheDisabled: true })
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: PROFILE.latencyMs,
    downloadThroughput: PROFILE.downloadBitsPerSecond / 8,
    uploadThroughput: PROFILE.uploadBitsPerSecond / 8,
    connectionType: 'cellular3g',
  })
  await session.send('Emulation.setCPUThrottlingRate', { rate: PROFILE.cpuSlowdownMultiplier })
}

/** Open the compendium in a fresh constrained browser context. */
async function openCompendium(browser, baseUrl) {
  const context = await browser.newContext({
    viewport: PROFILE.viewport,
    serviceWorkers: 'block',
  })
  const page = await context.newPage()
  await constrain(page)
  await page.goto(`${baseUrl}/console/`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Show the compendium' }).first().click()
  return {
    context,
    page,
    input: page.getByRole('searchbox', { name: 'Search creatures' }),
  }
}

/** Submit one query and time its rendered result through the next animation frame. */
async function timeSearch(page, input, searchCase) {
  const started = performance.now()
  await input.fill(searchCase.query)
  await page.getByText(`${searchCase.expectedCount} creatures`, { exact: true }).waitFor()
  await page.evaluate(() => new Promise((accept) => requestAnimationFrame(() => accept(undefined))))
  return performance.now() - started
}

/** Open a fresh console, submit the first query, and time its rendered result. */
async function measureCold(browser, baseUrl, searchCase) {
  const { context, page, input } = await openCompendium(browser, baseUrl)
  const durationMs = await timeSearch(page, input, searchCase)
  await context.close()
  return durationMs
}

/** Time repeated rendered queries after the compendium has loaded in one constrained page. */
async function measureWarm(browser, baseUrl, searchCases) {
  const { context, page, input } = await openCompendium(browser, baseUrl)
  await timeSearch(page, input, searchCases[0])

  const samples = []
  for (let index = 0; index < warmRuns; index += 1) {
    const searchCase = searchCases[(index + 1) % searchCases.length]
    samples.push(await timeSearch(page, input, searchCase))
  }
  await context.close()
  return samples
}

const server = await startServer()
const address = server.address()
assert(address && typeof address === 'object')
const baseUrl = `http://127.0.0.1:${address.port}`
const browser = await chromium.launch()
try {
  const searchCases = await Promise.all(['aboleth', 'goblin', 'zombie'].map(queryCase))
  for (const searchCase of searchCases) {
    assert(searchCase.expectedCount > 0, `${searchCase.query} must match the core fixture`)
  }
  const coldSamples = []
  for (let index = 0; index < coldRuns; index += 1) {
    coldSamples.push(await measureCold(browser, baseUrl, searchCases[0]))
    console.log(`Cold ${index + 1}/${coldRuns}: ${coldSamples.at(-1).toFixed(1)} ms`)
  }
  const warmSamples = await measureWarm(browser, baseUrl, searchCases)
  const cold = summarize(coldSamples)
  const warm = summarize(warmSamples)
  const payload = await payloadComposition()
  const gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const gitStatus = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()
  const lockfile = await readFile('package-lock.json')
  const report = {
    requirement: REQUIREMENT,
    runLabel,
    recordedAt: new Date().toISOString(),
    git: { commit: gitCommit, dirty: gitStatus.length > 0 },
    environment: {
      os: `${platform()} ${release()}`,
      node: process.version,
      playwright: JSON.parse(await readFile('node_modules/playwright/package.json', 'utf8'))
        .version,
      chromium: browser.version(),
      lockfileSha256: hash(lockfile),
    },
    profile: PROFILE,
    thresholdsMs: {
      coldTarget: COLD_TARGET_MS,
      coldLimit: COLD_LIMIT_MS,
      warmLimit: WARM_LIMIT_MS,
    },
    searchCases,
    results: {
      cold,
      warm,
      passes: {
        coldTarget: cold.p90Ms <= COLD_TARGET_MS,
        coldLimit: cold.maxMs <= COLD_LIMIT_MS,
        warmLimit: warm.maxMs <= WARM_LIMIT_MS,
      },
    },
    payload: {
      encoding: 'gzip level 9, deterministic mtime 0',
      files: payload,
      totals: {
        entries: payload.reduce((sum, row) => sum + row.entries, 0),
        rawBytes: payload.reduce((sum, row) => sum + row.rawBytes, 0),
        gzipBytes: payload.reduce((sum, row) => sum + row.gzipBytes, 0),
      },
      requestedFiles: [...new Set(compendiumRequests.map((request) => request.file))],
      transferredBytesPerColdContext: [
        ...new Map(
          compendiumRequests.map((request) => [request.file, request.transferredBytes]),
        ).values(),
      ].reduce((sum, bytes) => sum + bytes, 0),
    },
    redaction:
      'Contains no account identifiers, capabilities, credentials, authored user content, or compendium bodies.',
  }
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(resolve(outputDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report.results, null, 2))
  console.log(`Evidence: ${outputDirectory}/report.json`)
  if (!meetsThresholds(report.results.passes)) process.exitCode = 1
} finally {
  await browser.close()
  await new Promise((accept, reject) => server.close((error) => (error ? reject(error) : accept())))
}
