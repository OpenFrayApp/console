// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import { classifyCopies, encounterHash } from '../../src/state/reconciliation.ts'
import { recoveryEncounter as encounter } from '../fixtures/sessionSnapshot.ts'

describe('copy reconciliation', () => {
  it('opens a device copy automatically only when it descends from the current cloud revision', async () => {
    const cloud = encounter('cloud')
    const device = encounter('device-child')
    const cloudStateHash = await encounterHash(cloud)

    await expect(
      classifyCopies(
        device,
        cloud,
        7,
        {
          cloudEncounterId: 'cloud-row',
          cloudRevision: 7,
          cloudStateHash,
        },
        'cloud-row',
      ),
    ).resolves.toBe('device-descendant')
  })

  it('opens a cloud copy automatically when the device is unchanged from its cloud ancestor', async () => {
    const device = encounter('ancestor')
    const cloud = encounter('cloud-child')

    await expect(
      classifyCopies(
        device,
        cloud,
        8,
        {
          cloudEncounterId: 'cloud-row',
          cloudRevision: 7,
          cloudStateHash: await encounterHash(device),
        },
        'cloud-row',
      ),
    ).resolves.toBe('cloud-descendant')
  })

  it.each([
    undefined,
    { cloudEncounterId: 'other-row', cloudRevision: 7, cloudStateHash: 'unknown' },
    { cloudEncounterId: 'cloud-row', cloudRevision: 9, cloudStateHash: 'unknown' },
  ])('treats unproven ancestry as divergence', async (lineage) => {
    await expect(
      classifyCopies(encounter('device'), encounter('cloud'), 8, lineage, 'cloud-row'),
    ).resolves.toBe('divergent')
  })

  it('recognizes identical copies without lineage', async () => {
    const copy = encounter('same')
    await expect(classifyCopies(copy, copy, 3, undefined, 'cloud-row')).resolves.toBe('same')
  })
})
