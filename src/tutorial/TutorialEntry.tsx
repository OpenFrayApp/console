// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useId, useState } from 'react'
import { DialogFocus } from '../components/ui/DialogFocus.tsx'
import { Button } from '../components/ui/primitives.tsx'
import type { TutorialEntryController } from './useTutorialEntry.ts'

/** Present the introductory entry boundary and reversible exit choices. */
export function TutorialEntry({ controller }: { controller: TutorialEntryController }) {
  const titleId = useId()
  const descriptionId = useId()
  const [neverShow, setNeverShow] = useState(false)
  const { surface, library, prerequisite } = controller
  if (!surface) return null
  const title =
    surface === 'welcome'
      ? 'Learn the console'
      : surface === 'exit'
        ? 'Exit tutorial'
        : surface === 'prerequisite'
          ? 'Before starting the tutorial'
          : 'Tutorial introduction'

  return (
    <DialogFocus>
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
            else if (surface === 'introduction') controller.requestExit()
            else controller.dismiss()
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
                  The tutorial takes about five minutes. Start with an introduction to the console.
                </p>
                <label className="tap-y flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-600"
                    checked={neverShow}
                    onChange={(event) => {
                      setNeverShow(event.target.checked)
                      if (event.target.checked) controller.onSuppress('dismissed')
                    }}
                  />
                  Never show this again
                </label>
              </>
            )}
            {surface === 'prerequisite' && <p>{prerequisite}</p>}
            {surface === 'introduction' && (
              <>
                <p>
                  The tracker holds your fight. The stat block shows the selected combatant.
                  Controls holds dice and effects.
                </p>
                <p>
                  Tutorial examples use{' '}
                  {library === 'srd-5.2' ? 'Basic Rules 2024' : 'Basic Rules 2014'}. Your library
                  and campaign choices stay unchanged.
                </p>
                <p>
                  This is the introductory guide. Guided combat lessons are coming later. You can
                  exit now and explore the console.
                </p>
              </>
            )}
            {surface === 'exit' && <p>Offer the tutorial again another time?</p>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {surface === 'welcome' && (
              <>
                <Button variant="primary" onClick={controller.launch}>
                  Start tutorial
                </Button>
                <Button onClick={() => controller.dismiss()}>Not now</Button>
              </>
            )}
            {surface === 'prerequisite' && (
              <Button onClick={() => controller.dismiss()}>Back to the console</Button>
            )}
            {surface === 'introduction' && (
              <Button onClick={controller.requestExit}>Exit tutorial</Button>
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
