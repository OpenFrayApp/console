// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useState } from 'react'
import type { TutorialSuppression } from '../state/settings.ts'
import { useAuth } from './useAuth.ts'
import { TUTORIAL_ACCOUNT_WRITE_ERROR } from './tutorialAccountPreference.ts'

/** Combine invitation preferences and transfer device suppression after identity settles. */
export function useTutorialAccountPreference(deviceSuppression: TutorialSuppression | null) {
  const {
    user,
    loading,
    identityExpired,
    configured,
    tutorialSuppression,
    setTutorialSuppression,
  } = useAuth()
  const userId = user?.id ?? null
  const [failure, setFailure] = useState<{
    userId: string
    reason: TutorialSuppression
    error: string
  } | null>(null)

  useEffect(() => {
    if (
      loading ||
      identityExpired ||
      !configured ||
      !userId ||
      !deviceSuppression ||
      tutorialSuppression
    )
      return
    let active = true
    setFailure(null)
    void setTutorialSuppression(deviceSuppression).then(
      ({ error }) => {
        if (active && error) setFailure({ userId, reason: deviceSuppression, error })
      },
      () => {
        if (active)
          setFailure({ userId, reason: deviceSuppression, error: TUTORIAL_ACCOUNT_WRITE_ERROR })
      },
    )
    return () => {
      active = false
    }
  }, [
    userId,
    loading,
    identityExpired,
    configured,
    deviceSuppression,
    tutorialSuppression,
    setTutorialSuppression,
  ])

  return {
    effectiveSuppression: deviceSuppression ?? tutorialSuppression,
    accountSyncError:
      !loading &&
      !identityExpired &&
      configured &&
      !tutorialSuppression &&
      failure?.userId === userId &&
      failure?.reason === deviceSuppression
        ? failure.error
        : null,
  }
}
