// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

// Registers jest-dom matchers (toBeInTheDocument, etc.) for component tests.
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Vitest 4 defaults this built-in to `/`; production Vite serves the console at `/console/`.
vi.stubEnv('BASE_URL', '/console/')
