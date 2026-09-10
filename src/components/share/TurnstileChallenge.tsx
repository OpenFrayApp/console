// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useRef } from 'react'
import { turnstileConfigured } from '../../lib/turnstile.ts'

const SCRIPT_ID = 'openfray-turnstile'
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/** Load Turnstile once and report whether its explicit renderer became available. */
function loadTurnstile(ready: () => void, failed: () => void): () => void {
  if (window.turnstile) {
    ready()
    return () => undefined
  }
  let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (!script) {
    script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    document.head.append(script)
  }
  script.addEventListener('load', ready)
  script.addEventListener('error', failed)
  return () => {
    script?.removeEventListener('load', ready)
    script?.removeEventListener('error', failed)
  }
}

/** Render and clean up one report-specific Turnstile challenge. */
export function TurnstileChallenge({
  onToken,
  resetKey,
  onUnavailable,
}: {
  onToken: (token: string) => void
  resetKey: number
  onUnavailable: () => void
}) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!turnstileConfigured) return
    let widget: string | undefined
    const unavailable = () => {
      onToken('')
      onUnavailable()
    }
    const unload = loadTurnstile(() => {
      if (!host.current || !window.turnstile) return unavailable()
      widget = window.turnstile.render(host.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '',
        action: 'report',
        theme: 'auto',
        callback: onToken,
        'expired-callback': () => onToken(''),
        'timeout-callback': () => onToken(''),
        'error-callback': unavailable,
      })
    }, unavailable)
    return () => {
      unload()
      if (widget && window.turnstile) window.turnstile.remove(widget)
    }
  }, [onToken, onUnavailable, resetKey])

  if (!turnstileConfigured) return null
  return <div ref={host} />
}
