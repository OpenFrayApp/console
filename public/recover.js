// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

const repair = document.getElementById('repair')
const result = document.getElementById('result')

/** Replace only the console worker after confirming that the deployment is reachable. */
async function repairOfflineShell() {
  repair.disabled = true
  result.textContent = 'Checking the connection…'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch('/console/shell-manifest.json', {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error('Deployment unavailable')
    const manifest = await response.json()
    if (!Array.isArray(manifest.assets) || typeof manifest.version !== 'string')
      throw new Error('Deployment unavailable')
    const registration = await navigator.serviceWorker.getRegistration('/console/')
    if (registration?.scope === new URL('/console/', location.origin).href)
      await registration.unregister()
    location.replace('/console/')
  } catch {
    result.textContent =
      'Repair could not finish. Check your connection and retry. Device recovery has not been changed by this repair.'
    repair.disabled = false
  } finally {
    clearTimeout(timeout)
  }
}

repair.addEventListener('click', () => void repairOfflineShell())
