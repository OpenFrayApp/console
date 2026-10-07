// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { parseTutorialSuppression, type TutorialSuppression } from '../state/settings.ts'
import type { AuthResult } from './useAuth.ts'

export const TUTORIAL_ACCOUNT_WRITE_ERROR =
  'The tutorial preference couldn’t be saved to your account. It still applies on this device.'

/** Update only tutorial metadata using the token of the identity that requested it. */
export async function writeTutorialAccountPreference(
  userId: string,
  accessToken: string,
  reason: TutorialSuppression,
  signal: AbortSignal,
): Promise<AuthResult> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const publicKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !publicKey || !accessToken) return { error: TUTORIAL_ACCOUNT_WRITE_ERROR }
  try {
    // auth.updateUser resolves its session after awaiting a lock and installs the returned
    // session. A captured bearer token keeps this preference write bound to its caller.
    const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: publicKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { tutorial_suppression: reason } }),
      signal,
    })
    if (!response.ok) return { error: TUTORIAL_ACCOUNT_WRITE_ERROR }
    const value: unknown = await response.json()
    if (!value || typeof value !== 'object') return { error: TUTORIAL_ACCOUNT_WRITE_ERROR }
    const data = value as { id?: unknown; user_metadata?: { tutorial_suppression?: unknown } }
    return {
      error:
        data.id === userId &&
        parseTutorialSuppression(data.user_metadata?.tutorial_suppression) === reason
          ? null
          : TUTORIAL_ACCOUNT_WRITE_ERROR,
    }
  } catch {
    return { error: TUTORIAL_ACCOUNT_WRITE_ERROR }
  }
}
