# Site sign-in and console recovery

The site owns `/sign-in/`, `/sign-up/`, and `/auth/callback/`.
Console entry points navigate in the same tab to
`/sign-in/?returnTo=<encoded pathname+query+hash>`.
The site validates the return destination. Navigation carries no session tokens.
Recognized legacy callback parameters are discarded before building the return
destination. The console never installs a session from those parameters.

This change remains unreleased until #140 provides `/account/`, the site's
fallback for direct authentication entry. Console profile editing, preferences,
sign-out, and account deletion remain available until that move.

## Shared session

Both surfaces must use the same Supabase project and public key on the same origin.
The console disables `detectSessionInUrl`. Only the site completes authentication
callback material after validating its originating attempt.

The SDK's default storage key, `persistSession=true`, `autoRefreshToken=true`, and
implicit flow remain unchanged. Console session lookup and auth events consume the
stored identity. Account preference writes remain fenced by identity. Sign-out
revokes live views before ending the session; account deletion keeps its existing
authenticated handler.

## Board recovery

Before leaving, the console checkpoints the latest committed action and verifies
recovery readback. A signed-in board also drains writable cloud work without
waiting for a debounce timer. Failed verification or draining keeps the working
board open and offers retry and recovery download.

Anonymous authentication recovery stays in this tab's `sessionStorage`, separate
from owner-scoped recovery. On authenticated return, a nonempty anonymous board
requires an explicit choice before replacement or cloud publication. This also
applies when the account has no cloud board. Choosing a copy archives the working
and cloud branches, plus any pre-existing owner recovery, before continuing.
These copies remain downloadable after later commits and restart.
A cloud outage retains the anonymous board without publishing it.
Closing the tab removes anonymous recovery.

If identity expires with unresolved copies, sign-in verifies their preservation
before leaving. Anonymous copies stay tab-scoped until explicit reconciliation.
Owner copies stay owner-scoped. On owner return, an active unresolved marker
requires explicit choice even when the cloud loads successfully or is empty.
The original cloud branch stays downloadable alongside the current cloud branch.
Resolved archived history alone does not require another choice.
Renewal does not require cloud resolution or grant expired cloud write authority.
Failed preservation blocks departure.
An anonymous return after cancellation restores the verified handoff even when
the session mirror could not be saved.

Tutorial completion still requires the normal confirmed board and log clearing.
Signing in after completion checkpoints that cleared board. It does not restore
the tutorial fight. Confirmed tutorial preferences continue through the existing
identity-fenced account preference hook.

## Local verification and provider configuration

Separate site and console development ports cannot share browser session storage.
The console uses a same-origin path and does not proxy to another development
server. Verify the complete return flow in the parent's assembled same-origin
preview, including direct visits, reloads, and callback query preservation.

Before release, the deployment owner must document and review Supabase's redirect
allowlist for the site's `/auth/callback/` on each intended origin. Retain Google,
Discord, and `custom:patreon`, with their existing verification settings. No live
configuration change is part of this source change.
