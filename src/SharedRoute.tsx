// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState, type ComponentType, type ReactNode } from 'react'
import type { EncounterTemplate } from './schema/encounterTemplate.ts'
import { SharedEncounterPage } from './components/SharedEncounterPage.tsx'

/**
 * The screen behind `/s/<code>`: the shared encounter, and — only if the reader says yes —
 * the console with its cast staged.
 *
 * The console is imported when they accept, not before. Someone following a link from a
 * Discord has not asked for a combat tracker yet, and until they do this is a small page
 * about one encounter. Accepting swaps the screen in place and rewrites the address to the
 * console's, so a reload lands on their own board rather than asking the question again.
 */

type ConsoleModules = {
  App: ComponentType<{ stagedCast?: EncounterTemplate }>
  AuthProvider: ComponentType<{ children: ReactNode }>
}

export function SharedRoute({ code }: { code: string }) {
  const [staged, setStaged] = useState<EncounterTemplate | null>(null)
  const [modules, setModules] = useState<ConsoleModules | null>(null)

  /** Load the console, then hand it the cast to add once its own board has hydrated. */
  const accept = (template: EncounterTemplate) => {
    void Promise.all([import('./App.tsx'), import('./auth/AuthProvider.tsx')]).then(
      ([{ default: App }, { AuthProvider }]) => {
        window.history.replaceState(null, '', import.meta.env.BASE_URL)
        setStaged(template)
        setModules({ App, AuthProvider })
      },
    )
  }

  if (!modules || !staged) return <SharedEncounterPage code={code} onAdd={accept} />
  const { App, AuthProvider } = modules
  return (
    <AuthProvider>
      <App stagedCast={staged} />
    </AuthProvider>
  )
}
