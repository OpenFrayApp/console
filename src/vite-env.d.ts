/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://abc.supabase.co. Absent → anonymous-only. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon/publishable key (public, RLS-gated — safe in the browser). */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Public Turnstile site key for the anonymous report challenge. */
  readonly VITE_TURNSTILE_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  turnstile?: {
    render(
      container: HTMLElement,
      options: {
        sitekey: string
        action: string
        theme: 'auto'
        callback: (token: string) => void
        'expired-callback': () => void
        'timeout-callback': () => void
        'error-callback': () => void
      },
    ): string
    remove(widget: string): void
  }
}
