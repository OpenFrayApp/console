// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/** A fresh random UUID for draft rows and custom ids. */
export const uid = (): string => crypto.randomUUID()
