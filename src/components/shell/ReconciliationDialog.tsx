// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { CopyChoice, ReconciliationConflict } from '../../state/encounterLifecycle.ts'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/primitives.tsx'

/** Format one copy activity time in the reader's locale. */
function activityTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}

/** Ask which divergent board should continue while keeping recovery for both branches. */
export function ReconciliationDialog({
  conflict,
  onChoose,
  onDownload,
  onClose,
}: {
  conflict: ReconciliationConflict
  onChoose: (choice: CopyChoice) => void
  onDownload: () => void
  onClose: () => void
}) {
  return (
    <Modal
      title="Choose a board copy"
      subtitle="Both copies contain changes. Choose which one should continue. The other stays available for recovery."
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <h4 className="font-semibold">Device recovery</h4>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Last activity:{' '}
            <time dateTime={conflict.device.activeAt}>
              {activityTime(conflict.device.activeAt)}
            </time>
          </p>
          <Button className="mt-3 w-full" onClick={() => onChoose('device')}>
            Use device copy
          </Button>
        </section>
        <section className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <h4 className="font-semibold">Cloud copy</h4>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Last activity:{' '}
            <time dateTime={conflict.cloud.activeAt}>{activityTime(conflict.cloud.activeAt)}</time>
          </p>
          <Button className="mt-3 w-full" onClick={() => onChoose('cloud')}>
            Use cloud copy
          </Button>
        </section>
      </div>
      <Button variant="quiet" className="mt-3" onClick={onDownload}>
        Download both copies
      </Button>
    </Modal>
  )
}
