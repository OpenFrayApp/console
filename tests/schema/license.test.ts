// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import { LIBRARIES } from '../../src/compendium/libraries.ts'
import {
  LICENSES_FROM_SCRATCH,
  LICENSE_HINTS,
  LICENSE_LABELS,
  isContentLicense,
  licenseIsFixed,
  licenseOfSource,
  licensesForDerivative,
  mayCopy,
  mayShare,
  summarizeLicenses,
  type ContentLicense,
} from '../../src/schema/license.ts'

/**
 * These rules are the one place the app reasons about somebody else's license, and a wrong
 * answer here is written into a Game Master's data and then published under their name. So
 * the reasoning is pinned rather than the wording: what may be offered, what may not, and
 * what an unrecognised value falls back to.
 */

describe('what a source is published under', () => {
  it('reads the Kobold Press books as Open Game Content and the rest as CC BY', () => {
    expect(licenseOfSource('kobold-press-tob')).toBe('ogl-1.0a')
    expect(licenseOfSource('kobold-press-ccdx')).toBe('ogl-1.0a')
    expect(licenseOfSource('srd-5.2')).toBe('cc-by-4.0')
    expect(licenseOfSource('srd-5.1')).toBe('cc-by-4.0')
    expect(licenseOfSource('openfray-brood-and-bloom')).toBe('cc-by-4.0')
  })

  it('covers every library that ships, so a new book cannot arrive unlicensed', () => {
    // The answer is derived from `group`, which exists for the settings panel. A fourth
    // group added there would otherwise inherit CC BY silently, which for a third-party
    // book would be a license claim we have no right to make.
    for (const library of LIBRARIES) {
      expect(['core', 'openfray', 'other'], library.id).toContain(library.group)
      expect(licenseOfSource(library.id), library.id).not.toBe('unstated')
    }
  })

  it('says nothing about a source it does not ship', () => {
    expect(licenseOfSource('custom')).toBe('unstated')
    expect(licenseOfSource('some-book-we-never-heard-of')).toBe('unstated')
  })
})

describe('what a derivative may be licensed as', () => {
  it('never offers CC0 for a derivative, however loose the source', () => {
    // CC0 waives everything the dedicator holds, and nobody can waive the attribution the
    // underlying CC-BY source still requires. It belongs only to work made from nothing.
    expect(licensesForDerivative('srd-5.2')).not.toContain('cc0-1.0')
    expect(licensesForDerivative('openfray-waking-garden')).not.toContain('cc0-1.0')
    expect(LICENSES_FROM_SCRATCH).toContain('cc0-1.0')
  })

  it('lets a CC-BY derivative be relicensed in either direction', () => {
    // CC BY 4.0 has no ShareAlike, and section 3(b) contemplates an Adapter's License. The
    // original stays CC BY for anyone who gets it from its publisher either way.
    const allowed = licensesForDerivative('srd-5.2')
    for (const l of ['cc-by-4.0', 'cc-by-sa-4.0', 'cc-by-nc-4.0', 'reserved'] as const) {
      expect(allowed, l).toContain(l)
    }
    expect(licenseIsFixed('srd-5.2')).toBe(false)
  })

  it('gives an OGL derivative no choice at all', () => {
    // Section 2: no other terms may be applied to Open Game Content under the license.
    expect(licensesForDerivative('kobold-press-tob3')).toEqual(['ogl-1.0a'])
    expect(licenseIsFixed('kobold-press-tob3')).toBe(true)
  })
})

describe('reading a license off a payload', () => {
  it('accepts only the ones we know', () => {
    expect(isContentLicense('cc-by-4.0')).toBe(true)
    expect(isContentLicense('unstated')).toBe(true)
    for (const junk of ['CC-BY-4.0', 'mit', '', null, 7, {}, 'toString']) {
      expect(isContentLicense(junk), String(junk)).toBe(false)
    }
  })

  it('has a label and a hint for every one of them', () => {
    const all = Object.keys(LICENSE_LABELS) as ContentLicense[]
    for (const l of all) {
      expect(LICENSE_LABELS[l], l).toBeTruthy()
      expect(LICENSE_HINTS[l], l).toBeTruthy()
    }
  })
})

describe('summarizing what an encounter is made of', () => {
  it('reports the strictest term present', () => {
    expect(summarizeLicenses(['cc-by-4.0', 'cc-by-nc-4.0'])).toEqual({
      kind: 'single',
      license: 'cc-by-nc-4.0',
    })
    expect(summarizeLicenses(['cc-by-4.0', 'reserved', 'cc0-1.0'])).toEqual({
      kind: 'single',
      license: 'reserved',
    })
  })

  it('lets one undeclared creature make the whole thing unknown', () => {
    // A reader has nothing to go on for that piece, so the summary must not imply they do.
    expect(summarizeLicenses(['cc-by-4.0', 'unstated'])).toEqual({ kind: 'unknown' })
    expect(summarizeLicenses([])).toEqual({ kind: 'unknown' })
  })

  it('keeps OGL outside the order rather than ranking it', () => {
    // It is not stricter or looser than the Creative Commons terms; it is a different
    // license with its own obligations, so a mix sends the reader to each creature.
    expect(summarizeLicenses(['ogl-1.0a', 'ogl-1.0a'])).toEqual({
      kind: 'single',
      license: 'ogl-1.0a',
    })
    expect(summarizeLicenses(['ogl-1.0a', 'cc-by-4.0'])).toEqual({ kind: 'mixed' })
    expect(summarizeLicenses(['ogl-1.0a', 'reserved'])).toEqual({ kind: 'mixed' })
  })
})

describe('what may be published to a link', () => {
  it('refuses anything brought in from outside the console', () => {
    // The extension reads paid books, and a forum paste is the same trust level wearing a
    // friendlier hat. Putting either on a public URL republishes somebody else's content.
    expect(mayShare({ imported: true })).toBe(false)
  })

  it('allows a Game Master’s own work, whatever they said about reusing it', () => {
    // Reserved means nobody else may reuse it, not that its author may not show it. What a
    // Game Master does with their own creatures is their business.
    expect(mayShare({})).toBe(true)
    expect(mayShare({ imported: false })).toBe(true)
  })
})

describe('what a reader may take a copy of', () => {
  it('refuses all rights reserved, and refuses silence for the same reason', () => {
    // An absent license grants nothing. Copyright reserves everything by default, so
    // reading it as permission would invent a grant nobody made.
    expect(mayCopy({ source: 'custom', license: 'reserved' })).toBe(false)
    expect(mayCopy({ source: 'custom', license: 'unstated' })).toBe(false)
    expect(mayCopy({ source: 'custom' })).toBe(false)
  })

  it('allows anything published under terms that permit reuse', () => {
    expect(mayCopy({ source: 'custom', license: 'cc-by-4.0' })).toBe(true)
    expect(mayCopy({ source: 'custom', license: 'cc0-1.0' })).toBe(true)
    // Library creatures included: their books already answered this.
    expect(mayCopy({ source: 'srd-5.2' })).toBe(true)
    expect(mayCopy({ source: 'kobold-press-tob' })).toBe(true)
  })
})
