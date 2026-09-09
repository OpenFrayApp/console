// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useRef, useState } from 'react'
import { activateShell, watchOfflineShell, type ShellStatus } from '../../offline/client.ts'
import type { EncounterLifecycle } from '../../state/encounterLifecycle.ts'
import { Button } from '../ui/primitives.tsx'

/** Announce a waiting shell and reload only after confirmation and recovery readback. */
export function ApplicationUpdate({
  lifecycle,
  ready,
  onDownload,
}: {
  lifecycle: EncounterLifecycle
  ready: boolean
  onDownload: () => void
}) {
  const [status, setStatus] = useState<ShellStatus>('installing')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const worker = useRef<ServiceWorker | undefined>(undefined)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!import.meta.env.PROD) return
    return watchOfflineShell((next, waiting) => {
      setStatus(next === 'ready' && worker.current ? 'available' : next)
      if (waiting) worker.current = waiting
    })
  }, [attempt])

  /** Keep the board inert while validating recovery, activating, and validating again. */
  async function update(): Promise<void> {
    if (busy || !ready || !worker.current) return
    setBusy(true)
    setError(null)
    try {
      if (!(await lifecycle.checkpointForUpdate())) {
        setError(
          'The recovery checkpoint could not be verified. Retry saving or download your recovery copy before updating.',
        )
        return
      }
      const result = await activateShell(worker.current)
      if (result !== 'activated') {
        setError(
          result === 'other-tabs'
            ? 'Close the other console tabs, then retry the update.'
            : 'The update did not finish. Keep playing, or reconnect and retry. Your recovery copy is retained.',
        )
        return
      }
      if (!(await lifecycle.checkpointForUpdate())) {
        setError(
          'The board changed during the update. Retry to verify its recovery copy before reloading.',
        )
        return
      }
      window.location.reload()
    } catch {
      setError('The update did not finish. Retry or download your recovery copy.')
    } finally {
      setBusy(false)
    }
  }

  if (!import.meta.env.PROD || status === 'ready') return null
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-1 text-xs text-slate-600 dark:text-slate-300">
      <span role="status">
        {status === 'available'
          ? 'A console update is available.'
          : status === 'installing'
            ? 'Preparing the offline console…'
            : status === 'unsupported'
              ? 'This browser cannot prepare the console for offline reopening.'
              : 'Offline setup failed. Keep this tab open and retry when connected.'}
      </span>
      {status === 'failed' && (
        <Button onClick={() => setAttempt((value) => value + 1)}>Retry setup</Button>
      )}
      {status === 'available' && (
        <Button disabled={!ready} onClick={() => dialog.current?.showModal()}>
          Review update
        </Button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="application-update-title"
        onCancel={(event) => {
          if (busy) event.preventDefault()
        }}
        onKeyDown={(event) => event.stopPropagation()}
        className="m-auto max-h-full w-[min(32rem,calc(100%-2rem))] overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-xl backdrop:bg-black/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        <h2 id="application-update-title" className="text-base font-semibold">
          Update the console?
        </h2>
        <p className="my-3 text-sm">
          Reload the console from a verified recovery checkpoint. Unfinished form entries will be
          lost. Your encounter will reopen after the update.
        </p>
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {error && (
            <Button disabled={busy} onClick={onDownload}>
              Download recovery copy
            </Button>
          )}
          <Button disabled={busy} onClick={() => dialog.current?.close()}>
            Keep playing
          </Button>
          <Button disabled={busy || !ready} onClick={() => void update()}>
            {busy ? 'Verifying recovery…' : 'Update and reload'}
          </Button>
        </div>
      </dialog>
    </div>
  )
}
