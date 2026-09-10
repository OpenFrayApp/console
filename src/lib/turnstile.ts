// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/** Whether this build has the public Turnstile site key needed to render a challenge. */
export const turnstileConfigured = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)
