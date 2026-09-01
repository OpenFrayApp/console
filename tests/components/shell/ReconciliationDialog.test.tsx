// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReconciliationDialog } from '../../../src/components/shell/ReconciliationDialog.tsx'
import { recoverySnapshot as snapshot } from '../../fixtures/sessionSnapshot.ts'

describe('ReconciliationDialog', () => {
  it('shows both activity times and leaves the branch choice explicit', () => {
    const choose = vi.fn()
    const download = vi.fn()
    const { container } = render(
      <ReconciliationDialog
        conflict={{
          id: 'conflict-a',
          device: { snapshot: snapshot('device'), activeAt: '2026-09-02T10:11:12.000Z' },
          cloud: {
            snapshot: snapshot('cloud'),
            activeAt: '2026-09-02T09:10:11.000Z',
            revision: 8,
          },
        }}
        onChoose={choose}
        onDownload={download}
        onClose={vi.fn()}
      />,
    )

    expect(container.querySelector('time[datetime="2026-09-02T10:11:12.000Z"]')).toBeVisible()
    expect(container.querySelector('time[datetime="2026-09-02T09:10:11.000Z"]')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Use device copy' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use cloud copy' }))
    fireEvent.click(screen.getByRole('button', { name: 'Download both copies' }))
    expect(choose).toHaveBeenNthCalledWith(1, 'device')
    expect(choose).toHaveBeenNthCalledWith(2, 'cloud')
    expect(download).toHaveBeenCalledOnce()
  })
})
