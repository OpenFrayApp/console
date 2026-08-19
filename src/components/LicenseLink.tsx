// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState } from 'react'
import {
  LICENSE_LABELS,
  LICENSE_TERMS,
  LICENSE_URLS,
  type ContentLicense,
} from '../schema/license.ts'
import { Modal } from './Modal.tsx'

/**
 * A license shown as something you can ask about.
 *
 * "CC BY-NC-SA 4.0" is six characters of jargon to most Game Masters, and it sits next to
 * the one question they actually have: may I put this in the thing I am making. So the
 * label opens a plain answer instead of leaving them to search for one.
 *
 * The summary is orientation, never advice. What governs is the license itself, which the
 * dialog links where a canonical text exists, and the wording says as much rather than
 * letting four bullet points stand in for the document.
 *
 * A modal for now. When creatures get public pages this becomes a link to one.
 */
export function LicenseLink({ license }: { license: ContentLicense }) {
  const [open, setOpen] = useState(false)
  const url = LICENSE_URLS[license]

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // The line often sits inside something clickable — a cast row, a card. Asking
          // about the license is not choosing the thing it belongs to.
          e.stopPropagation()
          setOpen(true)
        }}
        className="underline decoration-dotted underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300"
      >
        License: {LICENSE_LABELS[license]}
      </button>

      {/* No subtitle: the one-line hints are written for the Game Master choosing a license
        in the editor, and say "you". Here the reader is a stranger. */}
      {open && (
        <Modal title={LICENSE_LABELS[license]} onClose={() => setOpen(false)}>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-200">
            {LICENSE_TERMS[license].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            This is a short summary, not the license and not legal advice.
            {url ? ' The full text is what governs:' : ''}{' '}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted underline-offset-2"
              >
                read it in full
              </a>
            )}
          </p>
        </Modal>
      )}
    </>
  )
}
