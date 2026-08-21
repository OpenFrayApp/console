// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ConditionCard } from '../../../src/components/statblock/ConditionCard.tsx'
import { CONDITION_TEXT } from '../../../src/compendium/conditions.ts'

afterEach(cleanup)

describe('ConditionCard', () => {
  it('renders the rules as markdown, not raw source', () => {
    render(<ConditionCard name="Prone" text={CONDITION_TEXT.Prone} />)
    // The **bold** lead-ins render as emphasis, so no literal asterisks remain.
    expect(screen.getByText('Restricted Movement.')).toBeInTheDocument()
    expect(screen.queryByText(/\*\*/)).toBeNull()
  })
})
