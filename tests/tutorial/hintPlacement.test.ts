// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { expect, it } from 'vitest'
import { placeTutorialHint } from '../../src/tutorial/hintPlacement.ts'

it('places the hint beside a tracker control without covering its context', () => {
  expect(
    placeTutorialHint(
      { left: 8, top: 8, right: 1432, bottom: 892 },
      { width: 384, height: 180 },
      { left: 20, top: 100, right: 350, bottom: 180 },
    ),
  ).toEqual({ left: 362, top: 100, docked: false })
})

it('uses the bottom dock when the target is outside the visible viewport', () => {
  expect(
    placeTutorialHint(
      { left: 8, top: 8, right: 1432, bottom: 892 },
      { width: 384, height: 180 },
      { left: 20, top: 1000, right: 350, bottom: 1080 },
    ),
  ).toEqual({ left: 528, top: 712, docked: true })
})

it.each([
  {
    target: { left: 1000, top: 100, right: 1420, bottom: 400 },
    expected: { left: 604, top: 100, docked: false },
  },
  {
    target: { left: 8, top: 8, right: 1432, bottom: 300 },
    expected: { left: 8, top: 312, docked: false },
  },
  {
    target: { left: 8, top: 600, right: 1432, bottom: 892 },
    expected: { left: 8, top: 408, docked: false },
  },
  {
    target: { left: 8, top: 8, right: 1432, bottom: 892 },
    expected: { left: 528, top: 712, docked: true },
  },
  { target: null, expected: { left: 528, top: 712, docked: true } },
])('keeps the hint clear of the task when placement is $expected', ({ target, expected }) => {
  expect(
    placeTutorialHint(
      { left: 8, top: 8, right: 1432, bottom: 892 },
      { width: 384, height: 180 },
      target,
    ),
  ).toEqual(expected)
})

it('respects a visual viewport shifted by a keyboard and safe-area insets', () => {
  expect(
    placeTutorialHint(
      { left: 20, top: 40, right: 355, bottom: 390 },
      { width: 335, height: 140 },
      { left: 20, top: 40, right: 355, bottom: 300 },
    ),
  ).toEqual({ left: 20, top: 250, docked: true })
})
