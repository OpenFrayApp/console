// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Campaign } from '../../src/schema/campaign.ts'
import {
  deleteCampaign,
  loadCampaigns,
  saveCampaign,
  updateCampaign,
} from '../../src/state/cloudCampaigns.ts'
import { makeSupabaseStub } from './supabaseMock.ts'

const supa = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../src/lib/supabase.ts', () => ({
  get supabase() {
    return supa.client
  },
  get isSupabaseConfigured() {
    return supa.client !== null
  },
}))

afterEach(() => {
  supa.client = null
})

/** A minimal campaign for exercising the persistence calls. */
function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return { id: 'camp-1', name: 'Riverdeep', edition: '5.5', ...overrides }
}

describe('loadCampaigns', () => {
  it('returns [] without a configured client (anonymous mode)', async () => {
    expect(await loadCampaigns()).toEqual([])
  })

  it('reads `data` from the campaigns table newest-first and unwraps the rows', async () => {
    const first = campaign({ id: 'camp-a', name: 'Newest' })
    const second = campaign({ id: 'camp-b', name: 'Older' })
    const { client, queries } = makeSupabaseStub({ data: [{ data: first }, { data: second }] })
    supa.client = client
    expect(await loadCampaigns()).toEqual([first, second])
    expect(queries).toEqual([
      {
        table: 'campaigns',
        steps: [
          ['select', 'data'],
          ['order', 'updated_at', { ascending: false }],
        ],
      },
    ])
  })

  it('falls back to [] on a query error', async () => {
    const { client } = makeSupabaseStub({ data: null, error: { message: 'boom' } })
    supa.client = client
    expect(await loadCampaigns()).toEqual([])
  })

  it('falls back to [] when the query resolves without rows', async () => {
    const { client } = makeSupabaseStub({ data: null, error: null })
    supa.client = client
    expect(await loadCampaigns()).toEqual([])
  })
})

describe('saveCampaign', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(saveCampaign(campaign())).resolves.toBeUndefined()
  })

  it('inserts one row carrying the name and the whole campaign as `data`', async () => {
    const camp = campaign()
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await saveCampaign(camp)
    expect(queries).toEqual([
      { table: 'campaigns', steps: [['insert', { name: camp.name, data: camp }]] },
    ])
  })
})

describe('updateCampaign', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(updateCampaign(campaign())).resolves.toBeUndefined()
  })

  it('updates only the row matched by data->>id with the new payload', async () => {
    const camp = campaign({ name: 'Riverdeep, Act II', edition: '5.0' })
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await updateCampaign(camp)
    expect(queries).toEqual([
      {
        table: 'campaigns',
        steps: [
          ['update', { name: camp.name, data: camp }],
          ['eq', 'data->>id', camp.id],
        ],
      },
    ])
  })
})

describe('deleteCampaign', () => {
  it('silently no-ops without a configured client', async () => {
    await expect(deleteCampaign('camp-1')).resolves.toBeUndefined()
  })

  it('deletes only the row matched by data->>id', async () => {
    const { client, queries } = makeSupabaseStub()
    supa.client = client
    await deleteCampaign('camp-1')
    expect(queries).toEqual([
      {
        table: 'campaigns',
        steps: [['delete'], ['eq', 'data->>id', 'camp-1']],
      },
    ])
  })
})
