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
  const publishProfileUser = (updated: User) => {
    const current = identity.current.session
    if (!current || current.user.id !== updated.id) return
    const next = retainTutorialSuppression(updated, current.user)
    identity.current.session = { ...current, user: next }
    setUser(next)
  }

  /** Install auth identity while retaining confirmed suppression within the same session. */
  const installSession = useCallback(
    (session: Session | null) => {
      const previous = identity.current.session
      const sameIdentity = previous?.user.id === session?.user.id
      if (!sameIdentity) invalidatePreferenceWrites()
      const next = session
        ? { ...session, user: retainTutorialSuppression(session.user, previous?.user ?? null) }
        : null
      identity.current.session = next
      setUser(next?.user ?? null)
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
          installSession({ ...current.session, user: verified })
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
      installSession(session)
      setLoading(false)
    })
    return () => {
      active = false
      invalidatePreferenceWrites()
      currentIdentity.session = null
      sub.subscription.unsubscribe()
    }
  }, [invalidatePreferenceWrites, installSession, reconcileNativeSession])

  /** Revoke owner publication before ending the authenticated session. */
  const signOut = async (): Promise<void> => {
    if (!supabase || !isCurrentIdentity()) return
    const generation = identity.current.generation
    const { error } = await supabase.rpc('stop_all_live_views')
    if (!isCurrentIdentity() || generation !== identity.current.generation) return
    if (error) {
      console.error('[openfray] revoking live views before sign-out failed', error)
      return
    }
    const session = identity.current.session
    if (!session) return
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
    const result = await supabase.auth.updateUser({ data })
    if (!isCurrentIdentity()) return failure
    if (result.error) return { error: result.error.message }
    if (!result.data.user || result.data.user.id !== user?.id) return failure
    publishProfileUser(result.data.user)
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
      const controller = new AbortController()
      preferenceWrites.current.add(controller)
      const result = await writeTutorialAccountPreference(
        user.id,
        captured.session.access_token,
        reason,
        controller.signal,
      )
      preferenceWrites.current.delete(controller)
      if (
        controller.signal.aborted ||
        identity.current.generation !== identityGeneration ||
        identity.current.session?.user.id !== user.id
      )
        return { error: TUTORIAL_ACCOUNT_WRITE_ERROR }
      if (result.error) return result
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
      invalidatePreferenceWrites()
      const generation = identity.current.generation
      const result = await supabase.functions
        .invoke('account-delete', { body: {} })
        .catch(() => null)
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
        displayName:
          ((user?.user_metadata?.display_name ??
            user?.user_metadata?.full_name ??
            user?.user_metadata?.name) as string | undefined) || null,
        // Validated rather than trusted: it is metadata, and a value the app doesn't know
        // is no answer at all. Unknown reads as "never set", which seeds nothing.
        shareLicense: isContentLicense(user?.user_metadata?.share_license)
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
