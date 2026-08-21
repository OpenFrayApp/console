// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState } from 'react'
import { bylineError } from '../lib/byline.ts'

/**
 * The name a publisher signs with, and the rules it is held to.
 *
 * `defaultByline` fills the field and never replaces it: the account's name arrives after
 * the control has mounted, because the board renders long before the session resolves, so
 * seeding once at mount left it empty for every signed-in Game Master. It follows the
 * account until they type something, and then it is theirs.
 */
export function useByline(defaultByline: string, allowReserved: boolean) {
  const [by, setBy] = useState(defaultByline)
  const [last, setLast] = useState(defaultByline)
  if (defaultByline !== last) {
    setLast(defaultByline)
    if (by === last) setBy(defaultByline)
  }
  return { by, setBy, problem: by.trim() ? bylineError(by, { allowReserved }) : null }
}
