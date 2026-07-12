// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { createContext } from 'react'

/**
 * A render-time spell linker (from `makeSpellLinker`) that wraps bare cast-spell
 * names in prose as `spell:` links. SRD creatures carry baked links already, so this
 * mainly lights up custom/imported creatures. Provided where the spell list is loaded
 * (the stat block), consumed by `Markdown` — no prop threading needed.
 */
export const SpellLinkContext = createContext<((text: string) => string) | undefined>(undefined)
