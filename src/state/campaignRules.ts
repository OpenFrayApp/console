// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { createContext, useContext } from 'react'
import { DEFAULT_CAMPAIGN_RULES, type CampaignRules } from '../schema/campaign.ts'
import type { Edition } from '../schema/primitives.ts'

/**
 * The active campaign's house rules, exposed to deeply-nested combat components
 * (e.g. the action resolver's crit handling) without prop threading. Defaults to the
 * standard ruleset, so anonymous users, signed-in users with no campaign selected,
 * and bare test renders all get standard behaviour until a campaign overrides it.
 */
export const CampaignRulesContext = createContext<CampaignRules>(DEFAULT_CAMPAIGN_RULES)

/** The active campaign's rules from context; the standard ruleset when no provider overrides. */
export function useCampaignRules(): CampaignRules {
  return useContext(CampaignRulesContext)
}

/**
 * Which rules the campaign plays, for the one place a mechanic differs between them:
 * Exhaustion, whose levels 2024 states as a formula and 2014 as a table. Separate from
 * the house rules above because it is the campaign's own field, not a table's option.
 * Defaults to 5.5 — the console is 2024-first, and so are anonymous games.
 */
export const CampaignEditionContext = createContext<Edition>('5.5')

/** The active campaign's edition from context; 5.5 when no provider overrides. */
export function useCampaignEdition(): Edition {
  return useContext(CampaignEditionContext)
}
