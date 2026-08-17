// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The link preview for a console URL pasted into a chat. Nothing in the app renders these
 * tags, so nothing else can catch them going wrong: a relative image URL, a size that no
 * longer matches the file, or a rename in `public/` all look fine locally and unfurl as a
 * bare link everywhere else.
 */

const html = readFileSync('index.html', 'utf8')
const image = readFileSync('public/og-image.png')

const tag = (attr: 'property' | 'name', key: string): string | null => {
  const match = new RegExp(`<meta[^>]*\\b${attr}="${key}"[^>]*>`, 'i').exec(html)
  return match ? (/content="([^"]*)"/.exec(match[0])?.[1] ?? null) : null
}

/** Width and height out of the PNG's IHDR: 8-byte signature, 4-byte length, 4-byte type. */
const pngSize = (file: Buffer) => ({
  width: file.readUInt32BE(16),
  height: file.readUInt32BE(20),
})

describe('social card', () => {
  it('points at an absolute image URL', () => {
    // A crawler has no page to resolve against, so a root-relative or relative path is
    // simply dropped — and this app's own asset prefix (/console/) is not the site root.
    for (const url of [tag('property', 'og:image'), tag('name', 'twitter:image')]) {
      expect(url).toBe('https://openfray.app/console/og-image.png')
    }
  })

  it('ships the image the tags name, at the size they declare', () => {
    // The declared numbers are what a crawler lays the card out from before the file
    // arrives; a mismatch crops or letterboxes the picture.
    expect(pngSize(image)).toEqual({ width: 1200, height: 630 })
    expect(tag('property', 'og:image:width')).toBe('1200')
    expect(tag('property', 'og:image:height')).toBe('630')
    expect(tag('property', 'og:image:alt')).toBeTruthy()
  })

  it('asks for the large card', () => {
    // `summary` is the small thumbnail, which is the default when the tag is missing.
    expect(tag('name', 'twitter:card')).toBe('summary_large_image')
  })

  it('says the same thing in the card as in the page', () => {
    // Three copies of one sentence drift apart otherwise, and the card is the copy nobody
    // sees while working on the app.
    const description = tag('name', 'description')
    expect(description).toBeTruthy()
    expect(tag('property', 'og:description')).toBe(description)
    expect(tag('name', 'twitter:description')).toBe(description)
    expect(tag('property', 'og:title')).toBe(tag('name', 'twitter:title'))
  })

  it('names the console rather than the site', () => {
    // One shell serves the Game Master's console and a player's shared view, so the card
    // has to be true of both — but never of the marketing site, which unfurls its own.
    expect(tag('property', 'og:title')).toBe('Combat console — OpenFray')
    expect(tag('property', 'og:url')).toBe('https://openfray.app/console/')
    expect(tag('property', 'og:site_name')).toBe('OpenFray')
  })
})
