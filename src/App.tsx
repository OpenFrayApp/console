// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'

const REPO_URL = 'https://github.com/SirDarcanos/openfray'

type Theme = 'dark' | 'light'

/**
 * App shell. Designed tablet/desktop-first (the combat console is a dense
 * landscape layout); this is just the scaffold landing until the tracker lands.
 *
 * Theming: dark is the default; light is fully supported. Every element is
 * styled for both modes (light base + `dark:` override).
 */
function App() {
  // Dark by default — matches <html class="dark"> set in index.html (no flash).
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () =>
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">OpenFray</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            D&amp;D 5e combat console
          </p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? 'Light' : 'Dark'} mode
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-semibold">Scaffold ready</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            React + Vite + TypeScript + Tailwind, dark/light themed. Next: the
            shared{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              Creature / Action / Effect
            </code>{' '}
            schema (build step 1).
          </p>
        </div>
      </main>

      {/* AGPL §13: a network-deployed copy must offer its source. */}
      <footer className="border-t border-slate-200 px-6 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-slate-200"
        >
          Source
        </a>
        <span className="mx-2">·</span>
        <span>AGPL-3.0</span>
      </footer>
    </div>
  )
}

export default App
