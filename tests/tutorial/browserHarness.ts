// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { vi } from 'vitest'

/** Replace only Vitest's always-false confirm shim with Chromium's genuine native confirmation. */
export function enableNativeConfirmation() {
  const realm = document.createElement('iframe')
  realm.hidden = true
  document.body.append(realm)
  const nativeConfirm = realm.contentWindow!.confirm.bind(window)
  realm.remove()
  vi.spyOn(window, 'confirm').mockImplementation(nativeConfirm)
}
