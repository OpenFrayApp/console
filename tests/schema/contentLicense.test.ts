// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { expect, it, vi } from 'vitest'
import {
  LICENSE_LABELS,
  LICENSE_HINTS,
  LICENSES_FROM_SCRATCH,
  isContentLicense,
  type ContentLicense,
} from '../../src/schema/contentLicense.ts'

vi.mock('../../src/compendium/libraries.ts', () => {
  throw new Error('Account license options must not load the compendium')
})

it('offers the existing account license choices without loading compendium libraries', () => {
  const choices: ContentLicense[] = [
    'unstated',
    'cc0-1.0',
    'cc-by-4.0',
    'cc-by-sa-4.0',
    'cc-by-nc-4.0',
    'cc-by-nc-sa-4.0',
    'reserved',
  ]
  expect(LICENSES_FROM_SCRATCH).toEqual(choices)
  expect(choices.map((value) => LICENSE_LABELS[value])).toEqual([
    'No public license stated',
    'CC0 1.0',
    'CC BY 4.0',
    'CC BY-SA 4.0',
    'CC BY-NC 4.0',
    'CC BY-NC-SA 4.0',
    'All rights reserved',
  ])
  expect(choices.map((value) => LICENSE_HINTS[value])).toEqual([
    'You have not specified a license. Readers should assume they need to ask.',
    'Anyone may use it for anything, with no credit asked.',
    'Anyone may use it, including commercially, if they credit you.',
    'Anyone may use it, including commercially, if they credit the author, and their version has to carry the same license.',
    'Anyone may use it if they credit you, but not for commercial use.',
    'Anyone may use it if they credit you, but not for commercial use, and their version has to carry the same license.',
    'Nobody may reuse it without asking you first.',
  ])
  for (const choice of choices) expect(isContentLicense(choice)).toBe(true)
  expect(isContentLicense('ogl-1.0a')).toBe(true)
  expect(LICENSE_LABELS['ogl-1.0a']).toBe('OGL 1.0a')
  expect(LICENSE_HINTS['ogl-1.0a']).toBe(
    'Open Game Content, under the license its source was published with.',
  )
  for (const invalid of ['constructor', 'toString', 'cc-by-3.0', '', null, {}, 4])
    expect(isContentLicense(invalid)).toBe(false)
})
