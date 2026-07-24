// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Recap } from '../../src/combat/recap.ts'
import { RecapScreen } from '../../src/components/Recap.tsx'
import { CampaignRulesContext } from '../../src/state/campaignRules.ts'
import { DEFAULT_CAMPAIGN_RULES } from '../../src/schema/campaign.ts'

afterEach(cleanup)

const RECAP: Recap = {
  outcome: 'victory',
  rounds: 4,
  inGameSeconds: 24,
  activeMs: 90_000,
  totalXp: 450,
  partySize: 3,
  xpPerPlayer: 150,
  damageDealtTotal: 60,
  damageTakenTotal: 22,
  spellsCast: 2,
  effectsApplied: 1,
  knockouts: 0,
  awards: [],
}

const renderWith = (leveling: 'xp' | 'milestone') =>
  render(
    <CampaignRulesContext.Provider value={{ ...DEFAULT_CAMPAIGN_RULES, leveling }}>
      <RecapScreen recap={RECAP} onClose={() => {}} />
    </CampaignRulesContext.Provider>,
  )

describe('RecapScreen', () => {
  it('shows the XP earned tile for an XP campaign', () => {
    renderWith('xp')
    expect(screen.getByText('XP earned')).toBeInTheDocument()
    expect(screen.getByText('150 / player')).toBeInTheDocument()
  })

  it('hides the XP tile for a milestone campaign, keeping the rest of the recap', () => {
    renderWith('milestone')
    expect(screen.queryByText('XP earned')).toBeNull()
    expect(screen.queryByText(/\/ player/)).toBeNull()
    // The rest of the tallies still render.
    expect(screen.getByText('Rounds')).toBeInTheDocument()
  })
})
