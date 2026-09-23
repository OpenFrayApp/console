// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

const STORAGE_KEY = 'openfray:encounter-writer'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type TabStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type WriterLocks = Pick<LockManager, 'request'>

/** Hold one writer identity exclusively until this document is destroyed. */
function holdIdentity(locks: WriterLocks, id: string): Promise<boolean> {
  return new Promise((resolve) => {
    void locks
      .request(`openfray:encounter-writer:${id}`, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false)
          return
        }
        resolve(true)
        // Document destruction releases the lock; pagehide can also mean a live bfcache entry.
        return new Promise<void>(() => {})
      })
      .catch(() => resolve(false))
  })
}

/** Reuse a tab's writer only when no other live document holds its browser lock. */
export async function claimWriterIdentity(
  storage: TabStorage,
  locks: WriterLocks | undefined,
  randomId: () => string = () => crypto.randomUUID(),
): Promise<string> {
  if (!locks) return randomId()
  let previous: string | null
  try {
    previous = storage.getItem(STORAGE_KEY)
  } catch {
    return randomId()
  }
  const candidate = previous && UUID.test(previous) ? previous : randomId()
  let id = candidate
  if (!(await holdIdentity(locks, id))) {
    id = randomId()
    if (!(await holdIdentity(locks, id))) return randomId()
  }
  try {
    storage.setItem(STORAGE_KEY, id)
  } catch {
    // The held identity remains safe; a reload will conservatively request a new one.
  }
  return id
}

let documentIdentity: Promise<string> | undefined

/** Share one guarded writer identity across lifecycle instances in this browser document. */
export function browserWriterIdentity(): Promise<string> {
  if (!documentIdentity) {
    try {
      documentIdentity = claimWriterIdentity(window.sessionStorage, navigator.locks)
    } catch {
      documentIdentity = Promise.resolve(crypto.randomUUID())
    }
  }
  return documentIdentity
}
