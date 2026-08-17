// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { playerCodeFromPath } from './state/playerCode.ts'
import { shareCodeFromPath } from './state/shareCode.ts'

// Load Fathom Analytics in production builds only — never on the dev server (localhost).
if (import.meta.env.PROD) {
  const s = document.createElement('script')
  s.src = 'https://cdn.usefathom.com/script.js'
  s.dataset.site = 'CZDKZIAS'
  s.defer = true
  document.head.appendChild(s)
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

const root = createRoot(rootElement)

// Three screens share one bundle entry, told apart by the path: a player's shared view, a
// shared encounter someone was handed a link to, and everything else — the Game Master's
// console. Each is imported dynamically so Vite splits them, because two of the three are
// opened by people who did not come here to run a fight and shouldn't download one. There
// is no router; Cloudflare serves this shell for `/console/*`, `/p/*` and `/s/*`, so
// reading `location.pathname` is all the routing there is.
const playerCode = playerCodeFromPath(window.location.pathname, import.meta.env.BASE_URL)
const sharedCode = shareCodeFromPath(window.location.pathname, import.meta.env.BASE_URL)

// Promise chains rather than top-level await: the build targets browsers older than
// module-level await, and Vite fails the build rather than shipping something they choke on.
if (playerCode) {
  // Every screen is served the same shell, so this tab would otherwise carry the console's
  // title — and a Game Master usually has both open.
  document.title = 'Player view — OpenFray'
  // The player view needs no session, so it renders outside AuthProvider.
  void import('./components/PlayerView.tsx').then(({ PlayerView }) => {
    root.render(
      <StrictMode>
        <PlayerView code={playerCode} />
      </StrictMode>,
    )
  })
} else if (sharedCode) {
  document.title = 'Shared encounter — OpenFray'
  // No AuthProvider either: reading a shared encounter needs no account, and the console it
  // can open brings its own.
  void import('./SharedRoute.tsx').then(({ SharedRoute }) => {
    root.render(
      <StrictMode>
        <SharedRoute code={sharedCode} />
      </StrictMode>,
    )
  })
} else {
  void Promise.all([import('./App.tsx'), import('./auth/AuthProvider.tsx')]).then(
    ([{ default: App }, { AuthProvider }]) => {
      root.render(
        <StrictMode>
          <AuthProvider>
            <App />
          </AuthProvider>
        </StrictMode>,
      )
    },
  )
}
