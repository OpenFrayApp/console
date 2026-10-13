# Site account navigation and console recovery

The site owns `/sign-in/`, `/sign-up/`, `/auth/callback/`, and `/account/`.
Console sign-in entry points navigate in the same tab to
`/sign-in/?returnTo=<encoded pathname+query+hash>`.
**Profile** in the account menu and quick search opens
`/account/?returnTo=<encoded pathname+query+hash>` through the same recovery checkpoint.
The site validates the return destination. Navigation carries no session tokens.
Recognized legacy callback parameters are discarded before building the return
destination. The console never installs a session from those parameters.

The site account page owns profile editing, the default shared-encounter license,
and account deletion, and provides sign-out with a confirmed sign-in redirect.
The console account menu also offers **Sign out**, through its recovery checkpoint
and existing identity-fenced `AuthProvider.signOut` path, without site navigation.
An unverified recovery checkpoint blocks termination; an unconfirmed cloud copy
requires explicit device-copy continuation. The menu never calls the SDK directly.
**Shared links**, device settings, and encounter controls stay in the console. Publishing can still update the display name. Tutorial account
preferences still use their existing console API.
Source remains unreleased pending assembled authenticated checks and handbook updates.

## Shared session

Both surfaces must use the same Supabase project and public key on the same origin.
The console disables `detectSessionInUrl`. Only the site completes authentication
callback material after validating its originating attempt.

The SDK's default storage key, `persistSession=true`, `autoRefreshToken=true`, and
implicit flow remain unchanged. Console session lookup and auth events consume the
stored identity. Returned profile and license changes update the console's publishing
metadata. Pending metadata replies and account termination results cannot replace or
end a newer identity. Tutorial preference writes remain fenced by identity.
Sign-out revokes live views before ending the session. Account deletion uses the
existing authenticated handler with an empty request body.
An unauthenticated return starts an anonymous board without adopting private owner
recovery or its session mirror. Owner recovery remains owner-scoped.
Session writes record explicit recovery ownership independently of IndexedDB.
Owner rollback mirrors use separate tab-scoped slots. Genuine anonymous recovery takes
precedence over retained owner data after reload.
Identity expiry retains the existing offline-owner recovery boundary.

Explicit termination uses a source-review-gated auth-js 2.108.2 compatibility shim.
It delegates to the SDK-selected native or memory storage without changing session defaults.
Captured-token transport, storage cleanup, and null-event reconciliation fence observed replacements.
Null events re-read the original storage delegate and verify replacement profiles with captured-bearer GET.
The console never reinstalls a session or fabricates an auth event for this reconciliation.
SDK upgrades require the real-client regression suite and source review.
Native compare/remove is not an atomic cross-tab operation. An unrelated tab can write a
replacement after the captured-session comparison and before native removal, without its event
being observed first. That replacement can be erased before reconciliation can see it.
This precise interleaving remains an assembled review and release limitation; no locks are added.
An already-dispatched default global logout also cannot undo server revocation if a new session
for the same account is created while the request is pending. Local replacement preservation is
not a guarantee about the server's global revocation timing.

Legacy browser recovery without ownership metadata remains unverified. The console
preserves its bytes and blocks automatic restoration and overwrite.
**Download retained recovery** exports those bytes separately from the current working
board's **Download recovery copy**. Neither action chooses or publishes a copy.
Imported recovery files still use the existing snapshot decoder.

## Board recovery

Before leaving, the console checkpoints the latest committed action and verifies
recovery readback. A signed-in board also drains writable cloud work without
waiting for a debounce timer. Failed verification or draining keeps the working
board open and offers retry and recovery download.
After an unconfirmed cloud drain, account navigation also offers **Continue with device copy**.
Retry alone does not treat a failed cloud write as confirmed.
Device-copy continuation verifies recovery again. Unavailable cloud authority permits no new cloud write.

Anonymous authentication recovery stays in this tab's `sessionStorage`, separate
from owner-scoped recovery. On authenticated return, a nonempty anonymous board
requires an explicit choice before replacement or cloud publication. This also
applies when the account has no cloud board. Choosing a copy archives the working
and cloud branches, plus any pre-existing owner recovery, before continuing.
These copies remain downloadable after later commits and restart.
A cloud outage retains the anonymous board without publishing it.
Closing the tab removes anonymous recovery.

Account departure and expired-identity sign-in verify unresolved copies before leaving.
They preserve every branch without choosing or publishing one.
Anonymous copies stay tab-scoped until explicit reconciliation.
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

## Current profile metadata

The console reads the account profile with a captured-bearer GET at startup and when a preserved
page is shown, focused, or made visible again. It does not call SDK `getUser`, reinstall a session,
or depend on `USER_UPDATED` from the site. Site PUT/readback leaves SDK metadata unchanged.
The console's trusted read supplies current publishing name and license defaults independently
of board recovery, activation, and local editing. While the profile is unverified, those defaults
are empty; the account menu reports checking or failure without blocking Profile navigation.

Publishing metadata uses captured-bearer PUT followed by trusted GET/readback. Tutorial metadata
keeps its existing captured PUT and reason validation, adds trusted GET/readback, and retains
confirmed preferences and unrelated publishing fields. Selected-storage tokens and identity
generations fence both success and failure. These operations never write SDK storage or fabricate
auth events. Reserved-name permission and publication remain in their existing server RPC/table
boundaries, not user metadata.

Destructive console requests also check the original selected storage before dispatch. The existing
`stop_all_live_views` RPC builder and `account-delete` invoke carry request-local captured
Authorization headers, not global client headers or caller target identifiers. A replacement
while the SDK acquires its transport cannot retarget the request to the new bearer. Responses
recheck native tokens and generation; mismatches reconcile verified replacement identity and do
not claim the new account was revoked or deleted. Already-issued authorized requests for the
original account cannot recall server-side effects.
