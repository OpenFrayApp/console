// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
// @ts-expect-error — plain .mjs module without type declarations.
import { drawAnnotations } from '../../scripts/lib/annotations.mjs'

/** A callout item over a fixed rect; overrides merge on top. */
function item(over: Record<string, unknown> = {}) {
  return { rect: { x: 100, y: 100, width: 200, height: 50 }, ...over }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('drawAnnotations', () => {
  it('draws one outline box per item in the annotation layer', () => {
    drawAnnotations([item(), item({ rect: { x: 400, y: 300, width: 80, height: 40 } })])
    const layer = document.getElementById('of-annotations')
    expect(layer).not.toBeNull()
    const boxes = layer!.querySelectorAll('div[data-of-mark]')
    expect(boxes).toHaveLength(2)
    // jsdom normalizes the hex to rgb; 229/72/74 is #E5484A.
    expect((boxes[0] as HTMLElement).style.border).toBe('3px solid rgb(229, 72, 74)')
  })

  it('skips the outline when box is false but still draws the label pill', () => {
    drawAnnotations([item({ box: false, text: 'the tracker' })])
    const marks = [...document.querySelectorAll('[data-of-mark]')] as HTMLElement[]
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('the tracker')
  })

  it('renders a numbered corner badge inside the region', () => {
    drawAnnotations([item({ n: 3, place: 'corner' })])
    const marks = [...document.querySelectorAll('[data-of-mark]')] as HTMLElement[]
    const badge = marks.find((m) => m.textContent === '3')
    expect(badge).toBeDefined()
    expect(badge!.style.borderRadius).toBe('999px')
  })

  it('numbers a pill label so it can match the prose list', () => {
    drawAnnotations([item({ n: 2, text: 'Apply effect' })])
    const layer = document.getElementById('of-annotations')!
    expect(layer.textContent).toContain('2')
    expect(layer.textContent).toContain('Apply effect')
  })

  it('replaces a previous layer instead of stacking a second one', () => {
    drawAnnotations([item()])
    drawAnnotations([item()])
    expect(document.querySelectorAll('#of-annotations')).toHaveLength(1)
  })
})
