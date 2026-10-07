// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { vi } from 'vitest'
import { screen } from '@testing-library/react'

/** Read whether a target is fully visible and pointer-reachable above the tutorial guide. */
export function tutorialControlIsReachable(target: HTMLElement, guided = true): boolean {
  const box = target.getBoundingClientRect()
  const boundary = guided
    ? screen.getByRole('dialog', { name: 'Tutorial introduction' }).getBoundingClientRect().top
    : innerHeight
  return (
    box.width > 0 &&
    box.height > 0 &&
    box.left >= 0 &&
    box.right <= innerWidth &&
    box.top >= 0 &&
    box.bottom <= boundary &&
    target.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))
  )
}

/** Replace only Vitest's always-false confirm shim with Chromium's genuine native confirmation. */
export function enableNativeConfirmation() {
  const realm = document.createElement('iframe')
  realm.hidden = true
  document.body.append(realm)
  const nativeConfirm = realm.contentWindow!.confirm.bind(window)
  realm.remove()
  vi.spyOn(window, 'confirm').mockImplementation(nativeConfirm)
}
