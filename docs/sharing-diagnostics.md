# Temporary sharing diagnostics

Capture timing and connection metadata for intermittent player-view interruptions.
This capture is opt-in and available only on the staging console or a local development build.

## Capture on both devices

1. Open `https://develop.openfray.pages.dev/console/?sharingDiagnostics=1` on the GM device.
2. Start sharing as usual.
3. Add `?sharingDiagnostics=1` to the player link, immediately before its `#live=` fragment.
   Keep the existing fragment intact. Do not paste the private link into an issue.
4. Keep the player view visible and use another tab on the GM device.
5. After an interruption recovers, expand **Sharing diagnostics (staging)** on each device.
6. Choose **Copy diagnostics** and send both reports, identifying the GM and player reports.
   If clipboard access fails, select and copy the report text instead.

Copy both reports before reloading either device. Reloading clears the in-memory capture.

## Recorded fields

Reports contain relative elapsed times, heartbeat and receive gaps, protocol sequence numbers,
message kinds, send outcomes, channel states, presence flags, tab visibility, and online hints.
They include the console version and whether `Date.now` has been overridden relative to `new Date()`.

Capture keeps the last 300 events and reports how many earlier events were dropped.
It records no encounter contents, creature names, owner or sender IDs, share codes, capabilities,
PINs, URLs, request headers, credentials, IP addresses, or raw errors.
Nothing is persisted or uploaded. The report reaches another person only when copied manually.

## Scope

Capture adds no network requests, retries, or heartbeat timers.
It leaves the 30-second freshness limit and sharing authorization unchanged.
Production hosts cannot enable capture, even with the query parameter.
Remove the temporary instrumentation before promoting the pending patch to production.
