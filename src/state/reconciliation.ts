// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Encounter } from '../schema/encounter.ts'

export interface RecoveryLineage {
  cloudEncounterId: string
  cloudRevision: number
  cloudStateHash: string
}

export type CopyRelationship = 'same' | 'device-descendant' | 'cloud-descendant' | 'divergent'

/** Serialize JSON data with stable object-key ordering for content identity. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
    .join(',')}}`
}

/** Compute a stable SHA-256 identity for one complete encounter snapshot. */
export async function encounterHash(encounter: Encounter): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(encounter))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Classify two copies using content and recorded cloud ancestry, never their clocks. */
export async function classifyCopies(
  device: Encounter,
  cloud: Encounter,
  cloudRevision: number,
  lineage: RecoveryLineage | undefined,
  cloudEncounterId: string,
): Promise<CopyRelationship> {
  const [deviceHash, cloudHash] = await Promise.all([encounterHash(device), encounterHash(cloud)])
  if (deviceHash === cloudHash) return 'same'
  if (!lineage || lineage.cloudEncounterId !== cloudEncounterId) return 'divergent'
  if (lineage.cloudRevision === cloudRevision && lineage.cloudStateHash === cloudHash) {
    return 'device-descendant'
  }
  if (lineage.cloudRevision < cloudRevision && lineage.cloudStateHash === deviceHash) {
    return 'cloud-descendant'
  }
  return 'divergent'
}
