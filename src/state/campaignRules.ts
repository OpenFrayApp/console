// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { createContext, useContext } from 'react'
import { DEFAULT_CAMPAIGN_RULES, type CampaignRules } from '../schema/campaign.ts'

/**
 * The active campaign's house rules, exposed to deeply-nested combat components
 * (e.g. the action resolver's crit handling) without prop threading. Defaults to the
 * standard ruleset, so anonymous users, signed-in users with no campaign selected,
 * and bare test renders all get standard behaviour until a campaign overrides it.
 */
export const CampaignRulesContext = createContext<CampaignRules>(DEFAULT_CAMPAIGN_RULES)

export function useCampaignRules(): CampaignRules {
  return useContext(CampaignRulesContext)
}
