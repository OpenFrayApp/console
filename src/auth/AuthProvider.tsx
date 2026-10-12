// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { isContentLicense, type ContentLicense } from '../schema/license.ts'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'
import {
  signOutConsoleSession,
  observeConsoleSession,
  readConsoleProfile,
  writeConsoleProfile,
  isCurrentConsoleSession,
} from './sessionTermination.ts'
import { parseTutorialSuppression, type TutorialSuppression } from '../state/settings.ts'
import {
  writeTutorialAccountPreference,
  TUTORIAL_ACCOUNT_WRITE_ERROR,
} from './tutorialAccountPreference.ts'
import { AuthContext, type AuthResult } from './useAuth.ts'

/** Preserve confirmed tutorial suppression when publishing the same account's metadata. */
function retainTutorialSuppression(user: User, previous: User | null): User {
  const confirmed =
    user.id === previous?.id
      ? parseTutorialSuppression(previous.user_metadata?.tutorial_suppression)
      : null
  if (!confirmed || user.user_metadata?.tutorial_suppression === confirmed) return user
  return { ...user, user_metadata: { ...user.user_metadata, tutorial_suppression: confirmed } }
}

/**
 * Tracks the Supabase auth session and exposes sign-out and account mutations.
 * When Supabase isn't configured, it resolves immediately to the anonymous state
 * so the app runs exactly as before — auth is purely additive.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Only "loading" if there's a session to look up; otherwise we're anon at once.
  const [loading, setLoading] = useState(Boolean(supabase))
  const [identityExpired, setIdentityExpired] = useState(false)
  const [identityGeneration, setIdentityGeneration] = useState(0)
  const [identityAccessToken, setIdentityAccessToken] = useState<string | null>(null)
  const [verifiedProfile, setVerifiedProfile] = useState<{
    generation: number
    token: string
  } | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const profileRequests = useRef(0)
  const explicitSignOut = useRef<{ generation: number; accessToken: string | null } | null>(null)
  const identity = useRef<{ session: Session | null; generation: number }>({
    session: null,
    generation: 0,
  })
  const preferenceWrites = useRef(new Set<AbortController>())

  /** Invalidate pending tutorial writes before replacing or ending an identity. */
  const invalidatePreferenceWrites = useCallback(() => {
    identity.current.generation += 1
    setIdentityGeneration(identity.current.generation)
    for (const controller of preferenceWrites.current) controller.abort()
    preferenceWrites.current.clear()
  }, [])

  /** Publish profile results without discarding this identity's confirmed tutorial preference. */
  const publishProfileUser = useCallback((updated: User) => {
    const current = identity.current.session
    if (!current || current.user.id !== updated.id) return
    const next = retainTutorialSuppression(updated, current.user)
    identity.current.session = { ...current, user: next }
    setUser(next)
    profileRequests.current += 1
    setVerifiedProfile({ generation: identity.current.generation, token: current.access_token })
    setProfileLoading(false)
    setProfileError(null)
  }, [])

  /** Install auth identity while retaining confirmed suppression within the same session. */
  const installSession = useCallback(
    (session: Session | null, profileVerified = false) => {
      const previous = identity.current.session
      const sameIdentity =
        previous?.user.id === session?.user.id &&
        previous?.access_token === session?.access_token &&
        previous?.refresh_token === session?.refresh_token
      if (!sameIdentity) invalidatePreferenceWrites()
      const next = session
        ? { ...session, user: retainTutorialSuppression(session.user, previous?.user ?? null) }
        : null
      identity.current.session = next
      setUser(next?.user ?? null)
      setIdentityAccessToken(next?.access_token ?? null)
      profileRequests.current += 1
      setVerifiedProfile(
        next && profileVerified
          ? { generation: identity.current.generation, token: next.access_token }
          : null,
      )
      setProfileLoading(Boolean(next && !profileVerified))
      setProfileError(null)
    },
    [invalidatePreferenceWrites],
  )

  /** Reconcile observed native identity with trusted profile data without reinstalling SDK sessions. */
  const reconcileNativeSession = useCallback(
    async (isCurrent: () => boolean, intentional: boolean, erasedSession?: Session) => {
      if (!supabase) return
      const observed = await observeConsoleSession(supabase)
      if (!isCurrent()) return
      if (observed.status === 'absent') {
        installSession(null)
        setIdentityExpired(!intentional)
      } else if (observed.status === 'present') {
        if (
          erasedSession &&
          observed.session.access_token === erasedSession.access_token &&
          observed.session.refresh_token === erasedSession.refresh_token
        ) {
          setLoading(false)
          return
        }
        const verified = await readConsoleProfile(supabase, observed.session)
        const current = await observeConsoleSession(supabase)
        if (!isCurrent()) return
        if (
          verified &&
          current.status === 'present' &&
          current.session.access_token === observed.session.access_token &&
          current.session.refresh_token === observed.session.refresh_token &&
          current.session.user.id === verified.id
        ) {
          installSession({ ...current.session, user: verified }, true)
          setIdentityExpired(false)
        } else setIdentityExpired(true)
      } else setIdentityExpired(true)
      setLoading(false)
    },
    [installSession],
  )

  useEffect(() => {
    if (!supabase) return
    let active = true
    let authEventReceived = false
    const currentIdentity = identity.current
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || authEventReceived) return
        installSession(data.session ?? null)
        if (error) setIdentityExpired(true)
        setLoading(false)
      })
      .catch(() => {
        if (!active || authEventReceived) return
        setIdentityExpired(true)
        setLoading(false)
      })
    // Fires on sign-in/out and token refresh, keeping `user` in sync across tabs.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event === 'INITIAL_SESSION') return
      if (
        event === 'USER_UPDATED' &&
        (!session ||
          session.user.id !== identity.current.session?.user.id ||
          session.access_token !== identity.current.session.access_token)
      )
        return
      authEventReceived = true
      if (event === 'SIGNED_OUT') {
        const previousToken = identity.current.session?.access_token
        const intentional =
          explicitSignOut.current?.generation === identity.current.generation &&
          explicitSignOut.current.accessToken === (identity.current.session?.access_token ?? null)
        invalidatePreferenceWrites()
        const generation = identity.current.generation
        setIdentityExpired(true)
        /** Accept loss only after re-reading the SDK's current native identity. */
        const isCurrentLoss = () =>
          active &&
          identity.current.generation === generation &&
          identity.current.session?.access_token === previousToken
        void Promise.resolve()
          .then(() => reconcileNativeSession(isCurrentLoss, intentional))
          .catch(() => {
            if (isCurrentLoss()) setLoading(false)
          })
        return
      }
      setIdentityExpired(false)
      installSession(session, event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED')
      setLoading(false)
    })
    return () => {
      active = false
      invalidatePreferenceWrites()
      currentIdentity.session = null
      sub.subscription.unsubscribe()
    }
  }, [invalidatePreferenceWrites, installSession, reconcileNativeSession])

  useEffect(() => {
    const client = supabase
    const captured = identity.current.session
    if (!client || loading || identityExpired || !captured) {
      setVerifiedProfile(null)
      setProfileLoading(false)
      return
    }
    let active = true
    let controller: AbortController | null = null
    const generation = identity.current.generation
    /** Read current account metadata without delaying board recovery or mutating SDK storage. */
    const refreshProfile = () => {
      controller?.abort()
      controller = new AbortController()
      const request = ++profileRequests.current
      setVerifiedProfile(null)
      setProfileLoading(true)
      setProfileError(null)
      const signal = controller.signal
      void isCurrentConsoleSession(client, captured)
        .then((current) => (current ? readConsoleProfile(client, captured, signal) : null))
        .then(async (updated) => {
          const current = await isCurrentConsoleSession(client, captured)
          if (
            !active ||
            request !== profileRequests.current ||
            generation !== identity.current.generation ||
            captured.access_token !== identity.current.session?.access_token ||
            captured.user.id !== identity.current.session.user.id
          )
            return
          if (updated && current) publishProfileUser(updated)
          else {
            setProfileLoading(false)
            setProfileError(
              'Your account profile could not be verified. Open your account to check it.',
            )
          }
        })
    }
    /** Recheck return-to-console metadata when a preserved page becomes visible. */
    const refreshVisibleProfile = () => {
      if (document.visibilityState === 'visible') refreshProfile()
    }
    refreshProfile()
    window.addEventListener('pageshow', refreshProfile)
    window.addEventListener('focus', refreshProfile)
    document.addEventListener('visibilitychange', refreshVisibleProfile)
    return () => {
      active = false
      controller?.abort()
      window.removeEventListener('pageshow', refreshProfile)
      window.removeEventListener('focus', refreshProfile)
      document.removeEventListener('visibilitychange', refreshVisibleProfile)
    }
  }, [
    user?.id,
    identityAccessToken,
    identityGeneration,
    loading,
    identityExpired,
    publishProfileUser,
  ])

  const profileCurrent =
    verifiedProfile?.generation === identityGeneration &&
    verifiedProfile.token === identityAccessToken

  /** Revoke owner publication before ending the authenticated session. */
  const signOut = async (): Promise<void> => {
    if (!supabase || !isCurrentIdentity()) return
    const session = identity.current.session!
    const generation = identity.current.generation
    /** Keep request authority bound to the invocation even while the SDK acquires its transport. */
    const current = () =>
      isCurrentIdentity() &&
      identity.current.generation === generation &&
      identity.current.session?.access_token === session.access_token &&
      identity.current.session?.refresh_token === session.refresh_token
    if (!(await isCurrentConsoleSession(supabase, session)) || !current()) {
      await reconcileNativeSession(current, false)
      return
    }
    const { error } = await supabase
      .rpc('stop_all_live_views')
      .setHeader('Authorization', `Bearer ${session.access_token}`)
    if (!(await isCurrentConsoleSession(supabase, session)) || !current()) {
      await reconcileNativeSession(current, false)
      return
    }
    if (error) {
      console.error('[openfray] revoking live views before sign-out failed', error)
      return
    }
    invalidatePreferenceWrites()
    const terminationGeneration = identity.current.generation
    const termination = { generation: terminationGeneration, accessToken: session.access_token }
    explicitSignOut.current = termination
    try {
      await signOutConsoleSession(
        supabase,
        session,
        () =>
          identity.current.generation === terminationGeneration &&
          identity.current.session?.access_token === session.access_token &&
          identity.current.session?.refresh_token === session.refresh_token,
      )
    } catch (error) {
      console.error('[openfray] account sign-out failed', error)
      await reconcileNativeSession(
        () =>
          identity.current.generation === terminationGeneration &&
          identity.current.session?.access_token === session.access_token,
        true,
      )
    } finally {
      if (explicitSignOut.current === termination) explicitSignOut.current = null
    }
  }

  /** Check captured render authority against the current authenticated owner. */
  const isCurrentIdentity = () =>
    !loading &&
    !identityExpired &&
    !!user?.id &&
    identity.current.session?.user.id === user.id &&
    identity.current.generation === identityGeneration

  /** Write profile metadata only while the invoking identity generation remains active. */
  const updateProfile = async (data: Record<string, unknown>): Promise<AuthResult> => {
    const failure = { error: 'Your account changed. Return to your account before trying again.' }
    if (!supabase) return { error: 'Accounts aren’t available on this copy of OpenFray.' }
    if (!isCurrentIdentity()) return failure
    const captured = identity.current.session!
    const controller = new AbortController()
    preferenceWrites.current.add(controller)
    profileRequests.current += 1
    setVerifiedProfile(null)
    setProfileLoading(true)
    setProfileError(null)
    try {
      const result = await writeConsoleProfile(
        supabase,
        captured,
        data,
        () =>
          isCurrentIdentity() &&
          identity.current.session?.access_token === captured.access_token &&
          identity.current.session?.refresh_token === captured.refresh_token,
        controller.signal,
      )
      if (!isCurrentIdentity()) return failure
      if (!result.current) {
        await reconcileNativeSession(
          () =>
            isCurrentIdentity() && identity.current.session?.access_token === captured.access_token,
          false,
        )
        return failure
      }
      if (result.error) {
        setProfileLoading(false)
        setProfileError(result.error)
        return { error: result.error }
      }
      if (!result.user || result.user.id !== user?.id) return failure
      publishProfileUser(result.user)
    } finally {
      preferenceWrites.current.delete(controller)
    }
    return { error: null }
  }

  /**
   * Write the name this account publishes under onto the user row (`user_metadata`), or
   * clear it. Supabase returns the updated user, so the app sees the new name at once
   * rather than waiting for the next session refresh.
   *
   * This is the same `display_name` Google and Discord filled in at sign-in, so saving here
   * replaces what they called you with what you publish as — one name, in the place the
   * database already keeps it.
   */
  const setDisplayName = async (name: string): Promise<AuthResult> => {
    return updateProfile({ display_name: name.trim() || null })
  }

  /**
   * Remember what this account's shared encounters should start on. It lives beside the
   * display name in `user_metadata` rather than in a table of its own: there is no profiles
   * table to add a column to, and a preference the account already stores one of belongs
   * where that one is.
   */
  const setShareLicense = async (license: ContentLicense): Promise<AuthResult> => {
    return updateProfile({ share_license: license === 'unstated' ? null : license })
  }

  /** Persist tutorial suppression without restoring a stale auth session or metadata. */
  const setTutorialSuppression = useCallback(
    async (reason: TutorialSuppression): Promise<AuthResult> => {
      const captured = identity.current
      if (
        !supabase ||
        loading ||
        identityExpired ||
        !user?.id ||
        captured.session?.user.id !== user.id ||
        captured.generation !== identityGeneration ||
        !parseTutorialSuppression(reason)
      )
        return { error: TUTORIAL_ACCOUNT_WRITE_ERROR }
      if (parseTutorialSuppression(captured.session.user.user_metadata?.tutorial_suppression)) {
        const confirmedUser = captured.session.user
        setUser((current) =>
          current && identity.current.generation === identityGeneration
            ? retainTutorialSuppression(current, confirmedUser)
            : current,
        )
        return { error: null }
      }
      const capturedSession = captured.session
      if (
        !(await isCurrentConsoleSession(supabase, capturedSession)) ||
        identity.current.generation !== identityGeneration
      )
        return { error: TUTORIAL_ACCOUNT_WRITE_ERROR }
      const controller = new AbortController()
      preferenceWrites.current.add(controller)
      try {
        const result = await writeTutorialAccountPreference(
          user.id,
          capturedSession.access_token,
          reason,
          controller.signal,
        )
        if (
          controller.signal.aborted ||
          !(await isCurrentConsoleSession(supabase, capturedSession)) ||
          identity.current.generation !== identityGeneration ||
          identity.current.session?.user.id !== user.id
        )
          return { error: TUTORIAL_ACCOUNT_WRITE_ERROR }
        if (result.error) return result
        const verified = await readConsoleProfile(supabase, capturedSession, controller.signal)
        if (
          !verified ||
          parseTutorialSuppression(verified.user_metadata?.tutorial_suppression) !== reason ||
          controller.signal.aborted ||
          identity.current.generation !== identityGeneration ||
          !(await isCurrentConsoleSession(supabase, capturedSession))
        )
          return { error: TUTORIAL_ACCOUNT_WRITE_ERROR }
        setUser((current) => {
          const session = identity.current.session
          if (
            !current ||
            !session ||
            current.id !== user.id ||
            identity.current.generation !== identityGeneration
          )
            return current
          const updated = {
            ...current,
            user_metadata: {
              ...current.user_metadata,
              tutorial_suppression:
                parseTutorialSuppression(current.user_metadata?.tutorial_suppression) ?? reason,
            },
          }
          identity.current.session = { ...session, user: updated }
          return updated
        })
        return { error: null }
      } finally {
        preferenceWrites.current.delete(controller)
      }
    },
    [user?.id, loading, identityExpired, identityGeneration],
  )

  /** Permanently delete the account and all its data, then sign out. */
  const deleteAccount = async (): Promise<AuthResult> => {
    if (!supabase) return { error: 'Accounts aren’t available on this copy of OpenFray.' }
    const failure = {
      error: 'Account deletion could not be confirmed. Check your account before trying again.',
    }
    if (!isCurrentIdentity()) return failure
    let termination: typeof explicitSignOut.current = null
    try {
      const session = identity.current.session!
      const invocationGeneration = identity.current.generation
      /** Refuse erasure until captured identity agrees with the original selected storage. */
      const invocationCurrent = () =>
        isCurrentIdentity() &&
        identity.current.generation === invocationGeneration &&
        identity.current.session?.access_token === session.access_token &&
        identity.current.session?.refresh_token === session.refresh_token
      if (!(await isCurrentConsoleSession(supabase, session)) || !invocationCurrent()) {
        await reconcileNativeSession(invocationCurrent, false)
        return failure
      }
      invalidatePreferenceWrites()
      const generation = identity.current.generation
      const result = await supabase.functions
        .invoke('account-delete', {
          body: {},
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        .catch(() => null)
      if (!(await isCurrentConsoleSession(supabase, session))) {
        await reconcileNativeSession(
          () =>
            identity.current.generation === generation &&
            identity.current.session?.access_token === session.access_token,
          false,
        )
        return failure
      }
      if (
        !result ||
        result.error ||
        result.data?.deleted !== true ||
        generation !== identity.current.generation ||
        identity.current.session?.user.id !== user?.id
      )
        return failure
      termination = { generation, accessToken: null }
      explicitSignOut.current = termination
      identity.current.session = null
      setUser(null)
      setIdentityExpired(false)
      // The account is already gone; a failed session cleanup cannot undo erasure.
      await signOutConsoleSession(
        supabase,
        session,
        () => identity.current.generation === generation && identity.current.session === null,
        'local',
      ).catch(() =>
        reconcileNativeSession(
          () => identity.current.generation === generation && identity.current.session === null,
          true,
          session,
        ),
      )
      return { error: null }
    } finally {
      if (explicitSignOut.current === termination) explicitSignOut.current = null
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        // Whatever the user row says — the provider's name until the Game Master changes it
        // in their profile or types a different one when publishing. Three keys because
        // three providers disagree: Supabase's own `display_name`, and the `full_name` /
        // `name` that Google and Discord actually write. Reading only the first left the
        // field empty for accounts whose name is under one of the others.
        profileLoading,
        profileError,
        displayName: profileCurrent
          ? ((user?.user_metadata?.display_name ??
              user?.user_metadata?.full_name ??
              user?.user_metadata?.name) as string | undefined) || null
          : null,
        // Validated rather than trusted: it is metadata, and a value the app doesn't know
        // is no answer at all. Unknown reads as "never set", which seeds nothing.
        shareLicense:
          profileCurrent && isContentLicense(user?.user_metadata?.share_license)
            ? user.user_metadata.share_license
            : null,
        tutorialSuppression: parseTutorialSuppression(user?.user_metadata?.tutorial_suppression),
        loading,
        identityExpired,
        configured: Boolean(supabase),
        signOut,
        deleteAccount,
        setDisplayName,
        setShareLicense,
        setTutorialSuppression,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
