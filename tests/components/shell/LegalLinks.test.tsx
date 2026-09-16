// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

import { LegalLinks } from '../../../src/components/shell/LegalLinks'

afterEach(cleanup)

it('opens the public content credits from every legal row', () => {
  render(<LegalLinks />)

  expect(screen.getByRole('link', { name: 'Credits' })).toHaveAttribute(
    'href',
    'https://github.com/OpenFrayApp/console/blob/main/CREDITS.md',
  )
})
