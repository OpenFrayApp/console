// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'

import type { CuratedMusicCatalog } from '../../workers/music/catalog.ts'

interface MusicReleaseInput {
  trackId: string
  bytes: Uint8Array
  publicTrackIds: readonly string[]
  deploymentCatalog: CuratedMusicCatalog
}

export interface MusicReleaseInspection {
  trackId: string
  objectKey: string
  bytes: number
  sha256: string
  contentType: 'audio/ogg'
}

const oggCapture = new TextEncoder().encode('OggS')
const vorbisSignature = new TextEncoder().encode('vorbis')

/** Compare a byte range with one fixed format signature. */
function hasBytes(bytes: Uint8Array, offset: number, expected: Uint8Array): boolean {
  return expected.every((byte, index) => bytes[offset + index] === byte)
}

/** Calculate the checksum required by an Ogg page. */
function oggChecksum(bytes: Uint8Array, start: number, end: number): number {
  let checksum = 0
  for (let index = start; index < end; index += 1) {
    const relative = index - start
    const byte = relative >= 22 && relative <= 25 ? 0 : bytes[index]
    checksum ^= byte << 24
    for (let bit = 0; bit < 8; bit += 1) {
      checksum = (checksum & 0x80000000 ? (checksum << 1) ^ 0x04c11db7 : checksum << 1) >>> 0
    }
  }
  return checksum
}

/** Read every checksummed Ogg packet while rejecting truncated or inconsistent pages. */
function readOggPackets(bytes: Uint8Array): Uint8Array[] {
  const packets: Uint8Array[] = []
  let packet: number[] = []
  let offset = 0
  let streamSerial: number | null = null
  let expectedSequence = 0
  let packetContinues = false

  while (offset < bytes.byteLength) {
    if (offset + 27 > bytes.byteLength || !hasBytes(bytes, offset, oggCapture)) {
      throw new Error('The file is not a complete Ogg Vorbis stream.')
    }
    if (bytes[offset + 4] !== 0) throw new Error('The Ogg stream uses an unsupported version.')
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset)
    const serial = view.getUint32(14, true)
    const sequence = view.getUint32(18, true)
    if (streamSerial === null) streamSerial = serial
    if (serial !== streamSerial || sequence !== expectedSequence) {
      throw new Error('The Ogg stream has inconsistent page ordering.')
    }
    const headerType = bytes[offset + 5]
    if (expectedSequence === 0 && (headerType & 0x02) === 0) {
      throw new Error('The Ogg stream has no beginning-of-stream page.')
    }
    if (expectedSequence > 0 && Boolean(headerType & 0x01) !== packetContinues) {
      throw new Error('The Ogg stream has an invalid continued packet.')
    }
    expectedSequence += 1

    const segmentCount = bytes[offset + 26]
    const segmentTableEnd = offset + 27 + segmentCount
    if (segmentTableEnd > bytes.byteLength) throw new Error('The Ogg segment table is truncated.')
    let bodyLength = 0
    for (let index = offset + 27; index < segmentTableEnd; index += 1) bodyLength += bytes[index]
    const pageEnd = segmentTableEnd + bodyLength
    if (pageEnd > bytes.byteLength) throw new Error('The Ogg page body is truncated.')
    if (view.getUint32(22, true) !== oggChecksum(bytes, offset, pageEnd)) {
      throw new Error('The Ogg page checksum is invalid.')
    }

    let bodyOffset = segmentTableEnd
    for (let index = offset + 27; index < segmentTableEnd; index += 1) {
      const length = bytes[index]
      if (packets.length < 4) packet.push(...bytes.subarray(bodyOffset, bodyOffset + length))
      packetContinues = length === 255
      if (!packetContinues && packets.length < 4) {
        packets.push(Uint8Array.from(packet))
        packet = []
      }
      bodyOffset += length
    }
    offset = pageEnd
  }

  if (packetContinues) throw new Error('The final Ogg packet is truncated.')
  return packets
}

/** Verify the required Vorbis headers and the presence of an audio packet. */
function assertOggVorbis(bytes: Uint8Array): void {
  const packets = readOggPackets(bytes)
  const identification = packets[0]
  const comment = packets[1]
  const setup = packets[2]
  const audio = packets[3]
  const validIdentification =
    identification?.byteLength >= 30 &&
    identification[0] === 1 &&
    hasBytes(identification, 1, vorbisSignature) &&
    identification[11] > 0 &&
    new DataView(
      identification.buffer,
      identification.byteOffset,
      identification.byteLength,
    ).getUint32(12, true) > 0 &&
    (identification[29] & 1) === 1
  const validComment =
    comment?.[0] === 3 && hasBytes(comment, 1, vorbisSignature) && (comment.at(-1)! & 1) === 1
  const validSetup = setup?.[0] === 5 && hasBytes(setup, 1, vorbisSignature)
  if (!validIdentification || !validComment || !validSetup || !audio || (audio[0] & 1) !== 0) {
    throw new Error('The file is not a complete Ogg Vorbis audio stream.')
  }
}

/** Verify an audio encode and every catalog constraint before an R2 write. */
export async function inspectMusicRelease({
  trackId,
  bytes,
  publicTrackIds,
  deploymentCatalog,
}: MusicReleaseInput): Promise<MusicReleaseInspection> {
  const track = deploymentCatalog[trackId]
  if (!track) {
    throw new Error(`Track ${trackId} is absent from the approved deployment catalog.`)
  }

  const publicIds = [...new Set(publicTrackIds)].sort()
  const deploymentIds = Object.keys(deploymentCatalog).sort()
  if (JSON.stringify(publicIds) !== JSON.stringify(deploymentIds)) {
    throw new Error('Music catalog parity failed between the console and deployment catalog.')
  }
  if (!track.rights.consoleUse || !track.rights.transcoding || !track.rights.browserDelivery) {
    throw new Error(`Track ${trackId} does not have every required recorded rights grant.`)
  }
  if (bytes.byteLength > track.maxBytes) {
    throw new Error(`Track ${trackId} exceeds its ${track.maxBytes}-byte release budget.`)
  }
  assertOggVorbis(bytes)

  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (bytes.byteLength !== track.bytes) {
    throw new Error(`Track ${trackId} has ${bytes.byteLength} bytes; expected ${track.bytes}.`)
  }
  if (sha256 !== track.sha256) {
    throw new Error(`Track ${trackId} digest does not match the approved encode.`)
  }

  return {
    trackId,
    objectKey: track.objectKey,
    bytes: bytes.byteLength,
    sha256,
    contentType: track.contentType,
  }
}
