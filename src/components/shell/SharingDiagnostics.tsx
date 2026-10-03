// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useState } from 'react'
import {
  recordSharingDiagnostic,
  sharingDiagnosticsEnabled,
  sharingDiagnosticsReport,
} from '../../state/sharingDiagnostics.ts'
import { Button } from '../ui/primitives.tsx'

/** Offer opt-in staging capture and a copyable metadata-only report on either device. */
export function SharingDiagnostics({ role }: { role: 'gm' | 'player' }) {
  const enabled = sharingDiagnosticsEnabled()
  const [report, setReport] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!enabled) return
    recordSharingDiagnostic({ event: 'capture-started', role })
    /** Record visibility changes without scheduling heartbeat work. */
    const visibility = () => recordSharingDiagnostic({ event: 'visibility-change', role })
    /** Record the browser's connectivity hint without probing the network. */
    const connectivity = () => recordSharingDiagnostic({ event: 'online-change', role })
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('online', connectivity)
      window.removeEventListener('offline', connectivity)
    }
  }, [enabled, role])

  /** Copy the current report, keeping selectable text available if clipboard access fails. */
  async function copy(): Promise<void> {
    const snapshot = sharingDiagnosticsReport()
    setReport(snapshot)
    setCopied(false)
    try {
      await navigator.clipboard.writeText(snapshot)
      setCopied(true)
    } catch {
      // The selectable report also works when the browser denies clipboard access.
    }
  }

  if (!enabled) return null
  return (
    <details className="shrink-0 border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      <summary className="tap-y cursor-pointer">Sharing diagnostics (staging)</summary>
      <div className="mt-2 space-y-2">
        <p>
          Timing and connection metadata only. Nothing is uploaded. Reloading clears the report.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void copy()}>
            Copy diagnostics
          </Button>
          {copied && <span role="status">Copied.</span>}
        </div>
        {report !== null && (
          <textarea
            aria-label="Sharing diagnostics report"
            readOnly
            value={report}
            onFocus={(event) => event.currentTarget.select()}
            rows={5}
            className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
          />
        )}
      </div>
    </details>
  )
}
