// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ConditionCard } from '../../src/components/ConditionCard.tsx'
import { CONDITION_TEXT } from '../../src/compendium/conditions.ts'

afterEach(cleanup)

describe('ConditionCard', () => {
  it('renders the condition name and its SRD rules text', () => {
    render(<ConditionCard name="Stunned" text={CONDITION_TEXT.Stunned} />)
    expect(screen.getByRole('heading', { name: 'Stunned' })).toBeInTheDocument()
    expect(
      screen.getByText(/automatically fail Strength and Dexterity saving throws/i),
    ).toBeInTheDocument()
  })

  it('renders the rules as markdown, not raw source', () => {
    render(<ConditionCard name="Prone" text={CONDITION_TEXT.Prone} />)
    // The **bold** lead-ins render as emphasis, so no literal asterisks remain.
    expect(screen.getByText('Restricted Movement.')).toBeInTheDocument()
    expect(screen.queryByText(/\*\*/)).toBeNull()
  })
})
