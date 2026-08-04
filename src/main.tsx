// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { playerCodeFromPath } from './state/playerCode.ts'

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

// Two screens share one bundle entry, told apart by the path — `/console/play/<code>`
// is a player's shared view, everything else is the Game Master's console. They're
// imported dynamically so Vite splits them: a player on a phone downloads the small
// one. There is no router; Cloudflare's `/console/*` fallback serves this shell for
// every path, so reading `location.pathname` is all the routing there is.
const shareCode = playerCodeFromPath(window.location.pathname, import.meta.env.BASE_URL)

// Promise chains rather than top-level await: the build targets browsers older than
// module-level await, and Vite fails the build rather than shipping something they choke on.
if (shareCode) {
  // Both screens are served the same shell, so the player's tab would otherwise carry the
  // console's title — and a Game Master usually has both open.
  document.title = 'Player view — OpenFray'
  // The player view needs no session, so it renders outside AuthProvider.
  void import('./components/PlayerView.tsx').then(({ PlayerView }) => {
    root.render(
      <StrictMode>
        <PlayerView code={shareCode} />
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
