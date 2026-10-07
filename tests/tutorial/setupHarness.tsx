// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { render } from '@testing-library/react'
import App from '../../src/App.tsx'
import { AuthContext } from '../../src/auth/useAuth.ts'
import { authState } from '../fixtures.ts'
import type { User } from '@supabase/supabase-js'

/** Render the real console with external identity supplied at its public boundary. */
export function renderTutorial(user: User | null = null) {
  return render(
    <AuthContext.Provider value={authState({ user })}>
      <App />
    </AuthContext.Provider>,
  )
}
