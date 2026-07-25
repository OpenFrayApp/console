// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'

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

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
