#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

import { inspectMusicRelease } from './lib/musicRelease.ts'
import { musicCatalog } from '../src/music/catalog.ts'
import { curatedMusicCatalog, MUSIC_RELEASE_BUDGET_BYTES } from '../workers/music/catalog.ts'

const bucket = process.env.OPENFRAY_MUSIC_BUCKET ?? 'openfray-music'
const config = resolve('wrangler.music.jsonc')

/** Print command usage and stop before any remote action. */
function usage() {
  console.error(`Usage:
  npm run music:fingerprint -- <local-ogg>
  npm run music:check -- <track-id> <local-ogg>
  npm run music:upload -- <track-id> <local-ogg>
  npm run music:verify -- <track-id>
  npm run music:delete -- <track-id> <object-key>`)
  process.exitCode = 2
}

/** Run Wrangler with this repository's pinned version and music configuration. */
function wrangler(args, options = {}) {
  return spawnSync('npx', ['--no-install', 'wrangler', ...args, '--config', config], {
    encoding: 'utf8',
    ...options,
  })
}

/** Return an approved release inspection for a local encode. */
async function inspect(trackId, path) {
  return inspectMusicRelease({
    trackId,
    bytes: await readFile(path),
    publicTrackIds: musicCatalog.map((track) => track.id),
    deploymentCatalog: curatedMusicCatalog,
  })
}

/** Download an R2 object to a temporary path without exposing bucket access publicly. */
async function download(track) {
  const directory = await mkdtemp(join(tmpdir(), 'openfray-music-'))
  const path = join(directory, basename(track.objectKey))
  const result = wrangler(
    ['r2', 'object', 'get', `${bucket}/${track.objectKey}`, '--file', path, '--remote'],
    { stdio: 'pipe' },
  )
  return { directory, path, result }
}

/** Verify the approved remote object and remove the temporary copy. */
async function verifyRemote(trackId) {
  const track = curatedMusicCatalog[trackId]
  if (!track) throw new Error(`Track ${trackId} is absent from the approved deployment catalog.`)
  const remote = await download(track)
  try {
    if (remote.result.status !== 0) {
      throw new Error(remote.result.stderr.trim() || `R2 object ${track.objectKey} is unavailable.`)
    }
    const inspection = await inspect(trackId, remote.path)
    console.log(JSON.stringify(inspection, null, 2))
    return inspection
  } finally {
    await rm(remote.directory, { recursive: true, force: true })
  }
}

/** Refuse to overwrite an immutable stable-ID object already present in R2. */
async function assertRemoteAbsent(track) {
  const remote = await download(track)
  try {
    if (remote.result.status === 0) {
      throw new Error(
        `R2 object ${track.objectKey} already exists. Stable track IDs and objects are immutable.`,
      )
    }
    if (!/not found|does not exist|NoSuchKey/i.test(remote.result.stderr)) {
      throw new Error(
        remote.result.stderr.trim() ||
          `Could not prove that R2 object ${track.objectKey} is absent.`,
      )
    }
  } finally {
    await rm(remote.directory, { recursive: true, force: true })
  }
}

/** Print an OGG encode's release metadata before catalog approval. */
async function fingerprint(path) {
  const bytes = await readFile(path)
  if (bytes.byteLength > MUSIC_RELEASE_BUDGET_BYTES) {
    throw new Error('The encode exceeds the release budget.')
  }
  if (bytes.subarray(0, 4).toString() !== 'OggS') throw new Error('The file is not an Ogg encode.')
  console.log(
    JSON.stringify(
      {
        bytes: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        contentType: 'audio/ogg',
      },
      null,
      2,
    ),
  )
}

/** Upload one preapproved immutable object and verify its downloaded bytes. */
async function upload(trackId, path) {
  const inspection = await inspect(trackId, path)
  const track = curatedMusicCatalog[trackId]
  await assertRemoteAbsent(track)
  const result = wrangler(
    [
      'r2',
      'object',
      'put',
      `${bucket}/${inspection.objectKey}`,
      '--file',
      path,
      '--content-type',
      inspection.contentType,
      '--remote',
    ],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) throw new Error('Wrangler did not upload the music object.')
  await verifyRemote(trackId)
}

/** Delete only the exact approved object key after an explicit confirmation. */
function deleteObject(trackId, confirmedKey) {
  const track = curatedMusicCatalog[trackId]
  if (!track || confirmedKey !== track.objectKey) {
    throw new Error('Deletion requires the approved track ID and exact object key.')
  }
  const result = wrangler(['r2', 'object', 'delete', `${bucket}/${track.objectKey}`, '--remote'], {
    stdio: 'inherit',
  })
  if (result.status !== 0) throw new Error('Wrangler did not delete the music object.')
}

const [command, first, second] = process.argv.slice(2)
try {
  if (command === 'fingerprint' && first && !second) await fingerprint(resolve(first))
  else if (command === 'check' && first && second) {
    console.log(JSON.stringify(await inspect(first, resolve(second)), null, 2))
  } else if (command === 'upload' && first && second) await upload(first, resolve(second))
  else if (command === 'verify' && first && !second) await verifyRemote(first)
  else if (command === 'delete' && first && second) deleteObject(first, second)
  else usage()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
