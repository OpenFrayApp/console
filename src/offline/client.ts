// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

export type ShellStatus = 'installing' | 'ready' | 'available' | 'failed' | 'unsupported'
export type ActivationResult = 'activated' | 'other-tabs' | 'failed'

/** Keep mutable static resources pinned to the shell already loaded in this document. */
export function answerShellVersion(): void {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'SHELL_DOCUMENT_VERSION' || !event.ports[0]) return
    const version = document.querySelector<HTMLMetaElement>('meta[name="openfray-shell"]')?.content
    event.ports[0].postMessage({ version })
  })
}

/** Register the production shell and report installation failures without changing the board. */
export function watchOfflineShell(
  report: (status: ShellStatus, worker?: ServiceWorker) => void,
): () => void {
  if (!('serviceWorker' in navigator)) {
    report('unsupported')
    return () => undefined
  }
  let disposed = false
  const cleanups: (() => void)[] = []
  /** Publish status only while the console is mounted. */
  function publish(status: ShellStatus, worker?: ServiceWorker): void {
    if (!disposed) report(status, worker)
  }
  publish('installing')
  void navigator.serviceWorker
    .register('/console/sw.js', { scope: '/console/', updateViaCache: 'none' })
    .then((registration) => {
      if (disposed) return
      /** Report the waiting deployment or the installed offline shell. */
      function inspect(): void {
        if (registration.waiting) publish('available', registration.waiting)
        else if (registration.active) publish('ready')
      }
      /** Follow this installation through validation or failure. */
      function installing(): void {
        const worker = registration.installing
        if (!worker) return
        /** React to the browser's installation lifecycle without activating an update. */
        function changed(): void {
          if (worker!.state === 'redundant') publish('failed')
          else if (worker!.state === 'installed' || worker!.state === 'activated') inspect()
        }
        worker.addEventListener('statechange', changed)
        cleanups.push(() => worker.removeEventListener('statechange', changed))
      }
      /** Check for updates when the console returns to the foreground or reconnects. */
      function check(): void {
        void registration.update().catch(() => {
          /* An offline update check leaves the validated shell usable. */
        })
      }
      registration.addEventListener('updatefound', installing)
      window.addEventListener('online', check)
      window.addEventListener('focus', check)
      cleanups.push(
        () => registration.removeEventListener('updatefound', installing),
        () => window.removeEventListener('online', check),
        () => window.removeEventListener('focus', check),
      )
      inspect()
      installing()
    })
    .catch(() => publish('failed'))
  return () => {
    disposed = true
    for (const cleanup of cleanups) cleanup()
  }
}

/** Request activation after confirmation and checkpointing, with a bounded failure path. */
export function activateShell(worker: ServiceWorker): Promise<ActivationResult> {
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const nonce = crypto.randomUUID()
    /** Confirm only this user-requested activation while its checkpoint flow remains open. */
    function consent(event: MessageEvent): void {
      if (
        event.source !== worker ||
        event.data?.type !== 'SHELL_ACTIVATION_CONSENT' ||
        event.data?.nonce !== nonce
      )
        return
      event.ports[0]?.postMessage({ confirmed: true, nonce })
    }
    navigator.serviceWorker.addEventListener('message', consent)
    /** Release listeners and settle once without installing a later automatic reload. */
    function finish(result: ActivationResult): void {
      clearTimeout(timeout)
      worker.removeEventListener('statechange', changed)
      navigator.serviceWorker.removeEventListener('message', consent)
      channel.port1.close()
      resolve(result)
    }
    /** Observe activation even when its message acknowledgement is interrupted. */
    function changed(): void {
      if (worker.state === 'activated') finish('activated')
      else if (worker.state === 'redundant') finish('failed')
    }
    const timeout = setTimeout(() => finish('failed'), 15_000)
    channel.port1.onmessage = (event) => {
      if (event.data?.status === 'other-tabs') finish('other-tabs')
      else if (event.data?.status === 'incomplete') finish('failed')
      else changed()
    }
    worker.addEventListener('statechange', changed)
    if (worker.state === 'activated') finish('activated')
    else {
      try {
        worker.postMessage({ type: 'ACTIVATE_CHECKPOINT', nonce }, [channel.port2])
      } catch {
        finish('failed')
      }
    }
  })
}
