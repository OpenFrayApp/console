// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useId, useState } from 'react'
import { DialogFocus } from '../components/ui/DialogFocus.tsx'
import { Button } from '../components/ui/primitives.tsx'
import type { TutorialEntryController } from './useTutorialEntry.ts'
import { TutorialCelebration } from './TutorialCelebration.tsx'

/** Present optional entry prerequisites and reversible exit choices. */
export function TutorialEntry({
  controller,
  signedIn,
  authConfigured,
  onSignIn,
}: {
  controller: TutorialEntryController
  signedIn: boolean
  authConfigured: boolean
  onSignIn: () => void
}) {
  const titleId = useId()
  const descriptionId = useId()
  const [neverShow, setNeverShow] = useState(false)
  const { surface, prerequisite } = controller
  /** Record the welcome choice independently of starting or postponing. */
  const rememberWelcomeChoice = () => {
    if (neverShow) controller.onSuppress('dismissed')
  }
  if (!surface || surface === 'introduction') return null
  const title =
    surface === 'welcome'
      ? 'Learn the console'
      : surface === 'exit'
        ? 'Exit tutorial'
        : surface === 'complete'
          ? 'Tutorial complete'
          : 'Before starting the tutorial'

  return (
    <DialogFocus>
      {surface === 'complete' && <TutorialCelebration />}
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 text-slate-900 dark:text-slate-100">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            event.stopPropagation()
            if (surface === 'exit') controller.cancelExit()
            else {
              if (surface === 'welcome') rememberWelcomeChoice()
              controller.dismiss()
            }
          }}
          className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 id={titleId} className="mb-3 text-lg font-semibold">
            {title}
          </h2>
          <div id={descriptionId} className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {surface === 'welcome' && (
              <>
                <p>
                  The tutorial takes about five minutes. Use the console’s real controls to set up a
                  practice fight, record damage, and take turns. Exiting keeps your board and game
                  log.
                </p>
                <label className="tap-y flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-600"
                    checked={neverShow}
                    onChange={(event) => setNeverShow(event.target.checked)}
                  />
                  Never show this again
                </label>
              </>
            )}
            {surface === 'complete' && (
              <>
                <p>
                  Everyone and the game log are cleared. To replay, choose Start tutorial in
                  Settings or search.
                </p>
                {signedIn ? (
                  <p>
                    Your practice character stays in your roster. Existing characters stay
                    untouched.
                  </p>
                ) : authConfigured ? (
                  <p>
                    Sign in is optional. Choose Sign in to use Google, Discord, or Patreon, or
                    Continue without an account.
                  </p>
                ) : (
                  <p>
                    Signing in isn’t available on this copy of OpenFray. You can continue without an
                    account.
                  </p>
                )}
              </>
            )}
            {surface === 'prerequisite' && <p>{prerequisite}</p>}
            {surface === 'exit' && (
              <>
                <p>Offer the tutorial again another time?</p>
                <p>
                  Exiting keeps your board and game log. To replay, stop any running fight and clear
                  the board through the normal controls, then choose Start tutorial in Settings or
                  search.
                </p>
              </>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {surface === 'welcome' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => {
                    rememberWelcomeChoice()
                    controller.launch()
                  }}
                >
                  Start tutorial
                </Button>
                <Button
                  onClick={() => {
                    rememberWelcomeChoice()
                    controller.dismiss()
                  }}
                >
                  Not now
                </Button>
              </>
            )}
            {surface === 'prerequisite' && (
              <Button onClick={() => controller.dismiss()}>Back to the console</Button>
            )}
            {surface === 'complete' && (
              <>
                {!signedIn && authConfigured && (
                  <Button variant="primary" onClick={onSignIn}>
                    Sign in
                  </Button>
                )}
                <Button onClick={() => controller.dismiss()}>
                  {signedIn ? 'Back to the console' : 'Continue without an account'}
                </Button>
              </>
            )}
            {surface === 'exit' && (
              <>
                <Button onClick={() => controller.dismiss()}>Yes, another time</Button>
                <Button onClick={() => controller.dismiss(true)}>Never show again</Button>
                <Button variant="quiet" onClick={controller.cancelExit}>
                  Return to tutorial
                </Button>
              </>
            )}
          </div>
        </section>
      </div>
    </DialogFocus>
  )
}
