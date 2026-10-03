// @vitest-environment jsdom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { version } from '../../../package.json'
import { LegalLinks } from '../../../src/components/shell/LegalLinks.tsx'

afterEach(cleanup)

it.each([false, true])(
  'shows the package version after the license with sourceAsIcon=%s',
  (sourceAsIcon) => {
    const { container } = render(<LegalLinks sourceAsIcon={sourceAsIcon} />)
    const license = screen.getByRole('link', { name: 'AGPL-3.0' })
    const release = screen.getByText(`v${version}`)
    expect(license.compareDocumentPosition(release) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.textContent).toMatch(
      new RegExp(`AGPL-3\\.0.*v${version.replaceAll('.', '\\.')}$`),
    )
    expect(release.className).toContain('whitespace-nowrap')
    expect(
      screen
        .getByRole('link', { name: sourceAsIcon ? 'OpenFray on GitHub' : 'Source' })
        .getAttribute('href'),
    ).toBe('https://github.com/OpenFrayApp/console')
  },
)
