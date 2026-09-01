// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { RecoveryDownload } from './encounterLifecycle.ts'

/** Download a recovery envelope without reading device recovery storage. */
export function downloadRecoveryCopy(recovery: RecoveryDownload): void {
  const url = URL.createObjectURL(new Blob([recovery.serialized], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = recovery.filename
  anchor.click()
  URL.revokeObjectURL(url)
}
