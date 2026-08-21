// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { PublishResult } from '../../state/shares.ts'

/**
 * The sentence a refused publish shows, whichever dialog asked.
 *
 * Six of the seven outcomes read the same for a creature and an encounter. What differs
 * travels in from the dialog: the noun this account can't publish, the size refusal (an
 * encounter can say what to leave out; a creature can't), and the plain-failure sentence.
 */
export function shareErrorMessage(
  result: Exclude<PublishResult, { status: 'ok' }>,
  wording: { noun: string; tooBig: string; failed: string },
): string {
  switch (result.status) {
    case 'tooBig':
      return wording.tooBig
    case 'signInFirst':
      // Reachable only if a session ends between opening the dialog and pressing Publish.
      return 'Sharing needs an account. Sign in and try again.'
    case 'tooMany':
      // The one refusal with something to do about it, so it says what that is.
      return 'You have as many published pages as an account can hold. Take one down first.'
    case 'notAllowed':
      // What happened, and nothing else. There is no next step to offer here: naming an
      // address would invite every refusal to become a message, and the answer to most of
      // them is the one already on screen.
      return `This account can’t publish ${wording.noun}.`
    case 'unavailable':
      return 'Sharing isn’t set up on this server yet.'
    case 'failed':
      return wording.failed
  }
}
