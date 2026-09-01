# Production-hardening specification

This is the reviewed production-hardening specification for the OpenFray consumer path.

Normative decisions:

- [Harden the consumer production path](https://github.com/OpenFrayApp/console/issues/3)
- [Choose the final hardening workstream sequence](https://github.com/OpenFrayApp/console/issues/22)

The reviewed source is [issue #23](https://github.com/OpenFrayApp/console/issues/23).

## Problem statement

Game Masters trust OpenFray with private encounter data while using it as a fast, local-first combat scratchpad. The current production path has useful local safeguards, but it cannot yet prove the agreed security, recovery, performance, accessibility, compatibility, and deployment guarantees.

Committed actions can be lost before delayed recovery writes finish. Cloud writes can fail silently or overwrite newer work. Persisted and Realtime values cross their ingress points without complete runtime decoding. Player-view authority depends on a bearer channel that does not prove which client is the Game Master. Anonymous reports and public edge routes lack sufficient abuse controls. Backup encryption can be skipped. Production database and provider controls do not have one tracked, attestable source of truth.

The release process also lacks one evidence-bearing gate across the console, Supabase, shared-link Functions, deployment assembly, physical devices, and provider configuration. Local performance passes many budgets, but retained heap fails its guard and several provider-backed journeys remain unmeasured. Accessibility has a defined target without complete release evidence.

## Solution

Harden the consumer production path through eight independently releasable implementation waves. Establish evidence and authority first. Close critical security boundaries before persistence and continuity cutovers. Complete performance, accessibility, operational controls, and combined assurance before calling a release hardened.

The console remains local-first and interaction-authoritative. Every committed action reaches a recoverable device copy immediately. Signed-in cloud copies use revisions, writer ownership, retained history, and explicit reconciliation. Persisted and wire values pass through versioned codecs with bounded migration, quarantine, and fallback behavior.

Only the authenticated encounter owner can publish live state. Player clients receive validated, filtered projections through a versioned protocol with capability rotation and freshness states. Anonymous reports cross a server-side abuse boundary. Backups fail closed without encryption. Supabase migrations, hosted configuration expectations, generated types, verification, and deployment attestations become tracked production authority.

A combined release-verification interface runs the applicable checks and emits immutable, privacy-safe evidence. Ordinary production releases pass their mandatory gate. A hardened release additionally passes the complete browser, device, accessibility, performance, security, recovery, restore, route, and provider-backed suite.

## User stories

1. As a Game Master, I want every committed action written to a recovery copy immediately, so that a crash does not silently erase table state.
2. As a Game Master, I want the console to remain responsive while persistence runs, so that network latency never slows combat.
3. As a Game Master, I want clear **Saving**, **Saved**, **Offline**, **Save failed**, and **Sign in to resume saving** states, so that I know what is durable.
4. As a Game Master, I want persistence failures surfaced without stopping play, so that I can keep running the encounter and recover later.
5. As a Game Master, I want retry and a local recovery download after persistence failure, so that my encounter remains portable.
6. As a Game Master, I want a warning before navigation when recovery storage is unavailable, so that I do not mistake unsafe state for saved state.
7. As an anonymous Game Master, I want recovery to remain tab-scoped, so that the console does not create unexpected durable anonymous data.
8. As a signed-in Game Master, I want device recovery to survive a browser restart, so that temporary cloud failure does not strand my encounter.
9. As a signed-in Game Master, I want the console to restore locally before waiting for authentication, so that I can resume quickly.
10. As a signed-in Game Master, I want cloud reconciliation to happen after local restoration, so that a stale cloud copy does not replace recent work.
11. As a Game Master, I want malformed persisted data quarantined instead of partially loaded, so that corrupt state cannot enter the encounter.
12. As a Game Master, I want the previous validated copy retained, so that one damaged write does not remove my recovery path.
13. As a Game Master, I want invalid and migrated copies available for recovery download, replacement, or deletion, so that authored data is not silently discarded.
14. As a Game Master, I want future-version data preserved without overwrite, so that an older client cannot destroy newer state.
15. As a Game Master, I want deterministic migrations to preserve supported saved encounters, so that upgrades do not change gameplay records.
16. As a Game Master, I want only one active writer for an encounter, so that two tabs cannot silently overwrite each other.
17. As a Game Master, I want writer takeover to create a checkpoint, so that opening the encounter elsewhere remains reversible.
18. As a Game Master, I want divergent copies shown as an explicit conflict, so that I decide which board continues.
19. As a Game Master, I want both divergent copies preserved, so that resolving a conflict does not destroy the unchosen state.
20. As a Game Master, I want rolls and log entries committed in the same snapshot, so that reconciliation never duplicates or loses random outcomes.
21. As a Game Master, I want authentication expiry to stop cloud writes without clearing the board, so that account state cannot erase table state.
22. As a Game Master, I want a previously loaded signed-in encounter to reopen offline, so that core combat actions remain available during an outage.
23. As a Game Master, I want application updates deferred during an active fight, so that a deployment cannot replace the running console unexpectedly.
24. As a Game Master, I want safe rollback after a client or schema deployment, so that a failed release does not trap my encounter in an incompatible version.
25. As a player, I want only the Game Master's configured projection, so that private notes and mechanics never leave the Game Master's browser.
26. As a player, I want the view to distinguish **Connecting**, **Live**, **Reconnecting**, **Connection lost**, and **Access ended**, so that stale information is never presented as current.
27. As a player, I want the age of the last update during reconnection, so that I can judge whether the displayed board is still useful.
28. As a player, I want stale content covered after 30 seconds, so that old hit points do not look live.
29. As a player, I want only a validated fresh payload to restore **Live** status, so that malformed traffic cannot revive the board.
30. As a Game Master, I want only my authenticated session to publish live state, so that viewers cannot impersonate me.
31. As a Game Master, I want stopping or rotating a live share to invalidate its prior capability, so that former recipients lose access promptly.
32. As a share recipient, I want malformed or unsupported shared content to fall back safely, so that hostile data cannot break the route.
33. As a publisher, I want publishing semantics consistent across the console and shared-link Functions, so that previews match the published page.
34. As a publisher, I want preview facts limited to an explicit allowlist, so that private encounter fields never enter cards or metadata.
35. As a publisher, I want unpublishing to revoke origin reads immediately, so that I can end access deliberately.
36. As a publisher, I want licensing facts validated during assembly, so that shared previews do not misstate content rights.
37. As a reporter, I want to report a published share without signing in, so that harmful public content remains reportable.
38. As a reporter, I want a failed notification not to lose my report, so that moderation does not depend on email delivery.
39. As an operator, I want anonymous reports validated, deduplicated, and quota-limited, so that abuse cannot create unbounded storage or notification cost.
40. As an operator, I want public share routes to enforce timeouts, payload limits, normalized cache keys, and rate limits, so that edge work remains bounded.
41. As an account holder, I want account deletion to remove every owner-linked active row, so that new data classes cannot escape deletion unnoticed.
42. As an account holder, I want deleted data and revoked shares excluded from restores, so that backup recovery does not resurrect them.
43. As an operator, I want backups to fail before export or upload when encryption is invalid, so that plaintext private data never reaches object storage.
44. As an operator, I want backup encryption material separated from storage credentials, so that one credential cannot expose both objects and plaintext.
45. As an operator, I want periodic isolated restore drills, so that backup existence is proven through recoverability.
46. As an operator, I want restore evidence to cover tenant isolation, authentication, row counts, critical functions, and encounter integrity, so that recovery preserves security.
47. As an operator, I want tracked Supabase migrations and configuration expectations, so that deployed authority can be compared with reviewed source.
48. As an operator, I want configuration drift detected before release, so that dashboard changes cannot silently weaken production controls.
49. As an operator, I want every privileged database function tested for grants and fixed search paths, so that old overloads or public execution cannot survive unnoticed.
50. As a maintainer, I want generated database types checked for drift, so that client assumptions stay aligned with the tracked schema.
51. As a maintainer, I want dependency advisories assessed for reachability, so that release decisions reflect actual exposure.
52. As a maintainer, I want secret-bearing workflow dependencies pinned immutably, so that mutable upstream tags cannot silently change privileged jobs.
53. As a maintainer, I want one evidence manifest tied to reviewed commits and configuration, so that every release claim is reproducible.
54. As a maintainer, I want missing applicable checks to fail explicitly, so that path selection cannot hide an untested production boundary.
55. As a maintainer, I want ordinary releases separated from hardened-release claims, so that expensive evidence is refreshed when the stronger claim is made.
56. As a maintainer, I want residual risks recorded with mitigation, owner, expiry, and follow-up, so that deferrals remain bounded.
57. As a maintainer, I want ineligible critical risks to block automatically, so that sign-off cannot waive tenant, authentication, secret, dice, or critical recovery failures.
58. As a maintainer, I want rollback targets and coordinated repository commits recorded, so that a failed release can restore one coherent production state.
59. As a Game Master, I want ordinary actions to remain within the agreed interaction budgets, so that large encounters stay usable.
60. As a Game Master, I want bulk actions to remain within the agreed stress budget, so that managing many combatants stays responsive.
61. As a Game Master, I want console restoration and cloud hydration to meet their readiness budgets, so that returning to a fight is fast.
62. As a Game Master, I want compendium search to retain measurable headroom, so that new libraries do not make first use unreliable.
63. As a share recipient, I want published pages to stay within their route budget, so that shared content opens quickly on constrained connections.
64. As a player, I want live updates to meet their latency and viewer-count budgets, so that the table follows the Game Master's board promptly.
65. As a maintainer, I want retained-heap growth attributed before changing encounter history, so that performance work does not destroy persisted records.
66. As a user with low vision, I want the console to reflow and zoom without losing controls, so that I can complete every task at my preferred scale.
67. As a keyboard user, I want visible, unobscured focus and complete keyboard operation, so that pointer input is never required.
68. As a touch user, I want primary and repeated controls to meet the agreed target size, so that dense combat controls remain usable.
69. As a user sensitive to motion, I want non-essential motion suppressed when requested, so that the console respects my system preference.
70. As a screen-reader user, I want complete processes tested with the agreed assistive-technology combinations, so that automated checks are not the only evidence.
71. As a user of a supported browser, I want core tasks built on Baseline Widely available features or working fallbacks, so that newer platform features do not block me.
72. As a maintainer, I want route and browser evidence to identify the tested combinations accurately, so that the product does not overstate compatibility or conformance.
73. As an operator, I want privacy-safe alerts for backup, tenant, persistence, authentication, Realtime, share, and quota failures, so that incidents are actionable.
74. As an operator, I want every alert to name an owner, evidence source, threshold, and runbook, so that response does not depend on memory.
75. As a user, I want diagnostics to exclude authored content, account identifiers, capability codes, tokens, and full URLs, so that monitoring does not create another disclosure path.

## Implementation decisions

### Delivery and ownership

- Implementation uses eight ordered waves: evidence foundation; authority and contract foundation; critical boundary closure; durability and conflict safety; runtime continuity; performance and compatibility; operational hardening; combined assurance.
- A wave may ship independently after its ordinary production gate passes. A deployed intermediate state must remain backward-compatible and no weaker than the current production boundary.
- Parallel work is allowed only when the relevant schemas, fixtures, authority, interfaces, and rollback contracts are stable.
- Foundations may ship dormant or in verified parity mode. Authority, persistence, migration, and publication cutovers ship with their dependent controls, negative tests, and rollback path.
- The console repository owns the specification, Supabase lineage, codecs, encounter recovery, Realtime semantics, console performance, and console accessibility.
- The deployment repository owns site assembly, Cloudflare routes and Functions, generated deployment artifacts, route integration, and combined release evidence.
- Provider configuration belongs to the repository that deploys it. Every cross-repository implementation issue names one accountable owner and its coordinated commits.
- Code remains local by default. Extraction requires a current named consumer, product-neutral interface, owner, migration cost, measurable benefit, and exit path.
- Third-party dependencies must reduce total burden, have compatible licensing, credible maintenance and security response, no disqualifying reachable advisory, and a bounded replacement path.

### Test seams and modules

- One combined assurance module provides the release-verification interface and emits the evidence manifest. This is the highest acceptance seam.
- One deep encounter lifecycle module owns committed-action recovery, save status, cloud persistence, revisions, writer ownership, reconciliation, and conflict outcomes.
- Storage, IndexedDB, Supabase, clocks, and network state are adapters behind the encounter lifecycle interface. Callers do not coordinate these mechanisms independently.
- One codec convention owns structural decoding across persisted and wire values. Local modules retain envelope versions, migrations, semantic invariants, repair policy, quarantine, limits, and fallback behavior.
- One pure live-view protocol module owns message types, protocol versions, publisher authority, capability lifecycle, sequence handling, validation outcomes, and freshness transitions.
- Supabase Realtime is an adapter at the live-view protocol seam. Viewer and Game Master interfaces cannot send messages outside their allowed protocol roles.
- One private, pure publication entrypoint owns share-code validation, published-share decoding, presentation-neutral facts, licensing facts, manifest descriptions, and console-route classification.
- Deployment production code imports console semantics only through the publication entrypoint and declared generated assets.
- The existing encounter reducer remains the pure working-board seam. The existing player-board projection remains the pre-transmission privacy seam.

### EF: evidence foundation

- **EF-1:** Establish canonical hostile, malformed, legacy, performance, recovery, publication, and tenant-isolation fixtures.
- **EF-2:** Map every requirement identifier to an owner, dependencies, acceptance check, evidence class, rollback condition, and release-blocking status.
- **EF-3:** Establish authorized staging, representative physical-device coverage, provider baselines, machine-readable evidence manifests, and human-readable release reports.
- Evidence records immutable commits, lockfiles, migration heads, generated-type hashes, provider-configuration hashes, fixtures, environment identities, commands, results, timestamps, approver, and rollback target.
- Evidence contains no authored content, account identifiers, capability codes, credentials, secrets, or raw rejected values.

### AC: authority and contract foundation

- **AC-1:** The console owns one forward-only Supabase migration lineage across separate local, staging, and production projects.
- Tracked authority covers schema, Row-Level Security, grants, security-definer functions, Realtime authorization, local configuration, hosted non-secret configuration expectations, verification, and break-glass recovery.
- Generated database types are committed derived artifacts and checked for unexplained drift. Migrations remain authoritative.
- Hosted settings supported by provider interfaces are inspected and compared automatically. Unsupported settings require explicit manual evidence.
- Every deployment emits an attestation containing the console commit, environment identity, migration head, schema and configuration hashes, generated-type hash, results, approver, workflow, and timestamp.
- **AC-2:** Persisted and wire values use versioned envelopes with an aggregate kind and schema or protocol version. Realtime envelopes also carry sequence or revision and send time.
- Valibot owns structural schemas and inferred input and output types. Local modules own semantic validation, migrations, repair, quarantine, limits, and fallback.
- Valibot remains replaceable behind the local interface and must satisfy licensing, maintenance, advisory, and route-transfer gates.
- Migrations are pure, deterministic, sequential, idempotent, and validated on input and output. Encoding emits only the current canonical version.
- Only named non-semantic repairs are allowed. Required gameplay fields, combatants, dice data, counters, and authored records are never silently coerced or dropped.
- **AC-3:** The console publication entrypoint is Worker-safe and browser-safe. It has no React, Supabase client, Node, filesystem, or ambient-browser dependency.
- Publication normalization accepts unknown input and returns bounded ok, unsupported, or invalid outcomes without raw values.
- Preview facts use an explicit allowlist. Unknown fields and newly added schema fields cannot enter previews implicitly.
- Separate integer versions govern the publication interface, published-share schema, source manifest, and deployment manifest.
- The deployment repository owns fetching, wording, visual presentation, caching, route integration, sidecar generation, and generic fallbacks.

### CB: critical boundary closure

- **CB-1:** Staging proves cross-tenant denial, owner-scoped success, minimal grants, fixed security-definer search paths, removal of deprecated overloads, restricted execution, Realtime authorization, and complete account deletion.
- Compatibility fallbacks cannot conceal partial production migration after the new tracked baseline is established.
- **CB-2:** Missing or invalid backup encryption configuration fails before export or upload.
- Encryption material remains separate from object-storage credentials. Upload and deletion permissions use least privilege.
- Backup evidence covers ciphertext upload, decryptability, integrity, freshness, retention, deletion permissions, and isolated restoration.
- Secret-bearing workflow dependencies are pinned to immutable revisions.
- **CB-3:** Only the authenticated encounter owner may publish live board or lifecycle messages.
- A high-entropy underlying capability identifies each live session. The short PIN remains an audience latch and never determines authority.
- Stop and rotate operations invalidate prior capabilities. Joins, retries, presence, and broadcasts have bounded rates and payloads.
- **CB-4:** Anonymous reports cross a server-side Turnstile interface that verifies the challenge and published share before restricted insertion.
- The report interface applies runtime validation, size limits, deduplication, per-share quotas, and network-level quotas.
- Notifications are queued separately so report submission cannot amplify mail or webhook cost.

### DC: durability and conflict safety

- **DC-1:** The in-memory encounter is the working board. The device-local snapshot is the recovery copy. The owner-scoped Supabase snapshot is the cloud copy.
- A committed action is an action already applied to the working board. Draft form state is outside the durability guarantee.
- Anonymous recovery remains tab-scoped in session storage. Signed-in recovery uses a restart-safe, versioned IndexedDB store.
- **DC-2:** Every committed action reaches the recovery copy immediately and before the next paint where practical.
- A committed action remains pending until its recovery write succeeds. Persistence failure does not stop use of the working board.
- The interface exposes **Saving**, **Saved**, **Offline**, **Save failed**, and **Sign in to resume saving** states with the agreed timing semantics.
- Recovery failure offers retry and a locally generated recovery download. Navigation cannot imply safety after storage denial or quota exhaustion.
- The device retains the current recovery copy and one previous validated copy.
- **DC-3:** Cloud writes use atomic expected revisions and active writer leases. Successful writes create retained validated revisions.
- Cloud history retains the latest ten revisions and every revision from the previous seven days.
- Writer takeover creates a recovery checkpoint and invalidates the previous lease. Other writers remain read-only until takeover.
- **DC-4:** A newer descendant may open automatically. Divergent copies never overwrite each other automatically.
- Conflict choices identify each copy's activity time and preserve the unchosen copy. Downloads can include both copies.
- Every roll and log entry has a stable identifier and lands in the same committed snapshot. Reconciliation never replays random actions.
- Authentication expiry preserves the working and recovery copies, stops cloud writes, and resumes only after identity is re-established.

### RC: runtime continuity

- **RC-1:** Player sharing uses **Connecting**, **Live**, **Reconnecting**, **Connection lost**, and **Access ended** states.
- Every live payload is validated. The player view tracks the last accepted update and displays its age during a 30-second grace period.
- Content older than 30 seconds never appears current. Only a validated fresh board restores **Live**.
- Confirmed sharing termination and authorization failure end access immediately.
- **RC-2:** A service worker caches a versioned application shell and required static assets for controlled offline reopening.
- A new client never activates during an active fight. The interface announces an available version and reloads only from a validated checkpoint after confirmation.
- Failed installation or update preserves the previous validated shell or provides an explicit recovery path.
- **RC-3:** Application and database deployment use expand-and-contract migrations.
- The previous client remains compatible through the deployment and rollback window. Irreversible cleanup cannot ship with the first client requiring it.
- Promotion checks authentication, tenant isolation, persistence, Realtime authorization, publishing, and shared-link rendering.
- **RC-4:** Encrypted backups have a maximum 24-hour recovery point and an eight-hour operator recovery target.
- Restoration uses a deletion ledger or equivalent replay control so deleted accounts and revoked shares remain absent.
- Before the hardened release, an isolated staged restore verifies tenant isolation, authentication, row counts, critical functions, representative encounter integrity, and deletion handling.
- Required monitoring covers persistence, authentication, Realtime, share Functions, backup freshness, restore failures, quota pressure, and critical service degradation.

### PC: performance and compatibility

- **PC-1:** Retained-heap growth is attributed with heap snapshots before changing encounter history or adding destructive lifecycle rules.
- Acceptance uses the complete mixed-action soak, no more than 10 percent retained-heap growth after warm-up and garbage collection, and a fresh-fight interaction retest.
- **PC-2:** First compendium search must create practical constrained-profile headroom. Generated-payload reduction is the first candidate.
- A metadata index with lazy detail loading is considered only when payload reduction cannot create enough headroom.
- First constrained search targets 4.8 seconds for remediation acceptance and may never exceed the six-second release budget. Subsequent search remains within 200 milliseconds.
- **PC-3:** Published-share JavaScript and CSS remain below 175 KiB compressed. Route-specific bundle evidence records composition and baseline change.
- The Game Master console remains below 325 KiB compressed. The player view remains below 175 KiB compressed.
- A 10 percent baseline regression requires investigation even when the absolute budget passes.
- **PC-4:** Complete user processes target WCAG 2.2 Level AA.
- Primary and repeated touch controls target 44 CSS pixels where practical. Non-essential motion is suppressed or replaced when reduced motion is requested.
- Core tasks use Baseline Widely available features. Newer features require detection and working fallback or progressive enhancement.
- Coverage includes current Safari on supported iPadOS and macOS, Chrome and Edge on supported Windows, Firefox on supported Windows and macOS, and Chrome on supported Android.
- Input and display coverage includes keyboard, touch, mouse, trackpad, pen-compatible pointers, tablet orientations, 200 percent text zoom, narrow reflow, intermediate zoom, pinch zoom, text spacing, on-screen keyboards, focus visibility, forced colors, and reduced motion.
- Assistive-technology priority covers NVDA with Firefox and Chrome, VoiceOver with Safari, and TalkBack with Chrome. Other combinations receive smoke coverage when access permits.
- Tested combinations are described as tested combinations, not exclusive support claims.

### OH: operational hardening

- **OH-1:** Content Security Policy progresses from privacy-safe reporting to enforcement. Required application paths must pass the enforced policy.
- CSP diagnostics exclude authored content, capability codes, tokens, account identifiers, and full URLs.
- **OH-2:** Public share and preview routes use bounded upstream timeouts, normalized cache keys, payload limits, route-specific rate limits, coarse abuse thresholds, appropriate status codes, and privacy-safe request identifiers.
- **OH-3:** Redacted source-controlled baselines cover Supabase, Cloudflare, R2, GitHub, OAuth, and relevant integrations.
- Unexplained drift affecting authentication, tenant isolation, secrets, backups, or public access blocks release.
- **OH-4:** A compact incident matrix names each event, evidence source, redaction rule, retention period, alert threshold, owner, and response action.
- Mandatory signals and runbooks receive staged delivery exercises before the hardened release.
- The public status surface, service-objective burn alerts, and recurring post-release drills may follow with explicit accepted risk and dated follow-up.

### CA: assurance and release gates

- **CA-1:** Pull-request evidence includes formatting, linting, type checking, tests, production builds, secret scanning, dependency and license review, transfer and action benchmarks, migration reset, generated-type drift, hostile database fixtures, codec fixtures, publication fixtures, and route-boundary checks when applicable.
- **CA-2:** Every production release requires passing pull-request evidence, a staging attestation, applicable migration and configuration evidence, backup health, route and assembly evidence, coordinated commits, and a tested rollback target.
- Production promotion uses a protected environment with maintainer approval.
- **CA-3:** A named hardened release additionally refreshes the complete performance suite, browser and device journeys, accessibility matrix, fault injection, restore drill, monitoring exercises, and residual-risk register.
- Missing full-suite evidence is marked Not measured. It blocks a hardened-release claim and blocks an ordinary release when it covers a mandatory gate or critical boundary.
- Unchanged expensive evidence may be reused for up to 90 days only when commits, dependencies, migrations, fixtures, provider configuration, and environment identity remain identical.
- Restore drills remain quarterly. Accessibility and compatibility priorities are reassessed annually and after major interaction or platform changes.
- The sole maintainer approves releases and eligible residual risks.
- Known exploitable critical or high findings cannot be accepted. Tenant isolation, authentication, secret exposure, dice integrity, the four critical security boundaries, and tier-one resilience failures always block.
- Eligible medium findings and operational deferrals record the affected boundary, likelihood, impact, mitigation, reason, owner, approval, expiry, and follow-up issue.
- Risk acceptance expires after 90 days or immediately after a material change. Expired acceptance blocks the next production release.
- Maintainer review is sufficient for this effort. The release makes no accessibility-conformance, penetration-test, certification, or independent-audit claim.

## Testing decisions

- Tests assert external behavior through module interfaces. They do not couple to internal helpers, storage layout, provider-client call order, or implementation-specific state unless that detail is itself a contract.
- The combined assurance interface is the highest acceptance seam. One invocation determines applicable gates, fails on missing checks, and emits the evidence manifest and report.
- The encounter lifecycle interface is tested with deterministic storage, clock, identity, and cloud adapters. The same behavior suite runs against relevant real adapters where practical.
- The codec interface is tested with fixtures for every supported version, sequential migration, idempotence, canonical round trips, future-version rejection, unknown-key removal, prototype pollution, resource limits, malformed children, quarantine, fallback, and non-overwrite.
- The live-view protocol interface is tested as a pure state machine before transport tests. Cases cover publisher authority, viewer restrictions, message versions, ordering, duplication, malformed payloads, delayed traffic, reconnect loops, freshness, rotation, revocation, and rate limits.
- The publication interface is tested with canonical, legacy, malformed, hostile, licensing, and missing-compendium fixtures in browser and Worker environments.
- Existing encounter reducer tests remain prior art for pure state transitions. Existing player-board tests remain prior art for pre-transmission privacy filtering.
- Existing session-persistence tests remain prior art for browser-storage behavior, but prohibited silent discard and silent failure expectations must be replaced with the new recovery contract.
- Existing cloud-encounter tests remain prior art for provider adapter outcomes, but success and failure must become distinguishable and revision-aware.
- Existing Realtime hook tests remain prior art for transport behavior, but protocol authority and freshness are proven at the pure protocol seam.
- Existing Supabase stubs remain useful for fast client-adapter tests. They never count as evidence of Row-Level Security, grants, deployed functions, Realtime authorization, or hosted configuration.
- Fresh database integration tests rebuild the tracked migration lineage and use hostile fixtures for at least two tenants, anonymous callers, authenticated owners, viewers, stale writers, and restricted functions.
- Database tests cover fixed search paths, minimal grants, deprecated overload removal, unintended public execution, account deletion completeness, revision compare-and-swap, writer leases, history retention, report quotas, Realtime authorization, and restoration controls.
- Persistence fault tests interrupt every recovery and cloud stage. They cover storage denial, quota exhaustion, corruption, reload before cloud completion, authentication expiry, duplicate requests, delayed responses, reordered responses, stale writers, expired leases, and takeover.
- Browser journeys cover cold anonymous startup, session restoration, signed-in hydration, encounter operation, group actions, spell and legendary-resource use, player-view connection and reconnection, publishing, shared routes, and compendium search.
- Browser recovery journeys cover offline restart, stale caches, failed service-worker installation, deferred updates, rollback, malformed copies, conflict selection, recovery downloads, and navigation warnings.
- Accessibility testing combines automated checks with manual complete-process testing. Automated results alone never establish conformance.
- Accessibility journeys exercise the maintained browser, input, zoom, display-preference, and assistive-technology matrix.
- Performance fixtures include representative 20-combatant and stress 100-combatant encounters with complex creatures, effects, resources, relations, initiative ties, and at least 200 log entries.
- Performance evidence covers ordinary and bulk action percentiles, Core Web Vitals, readiness, transfer ceilings, compendium search, live-view latency, viewer concurrency, preview generation, trusted INP, and the complete soak.
- Heap testing distinguishes intentionally retained encounter history from obsolete immutable states, subscriptions, render structures, and accidental retention.
- Backup testing fails on missing encryption, checks ciphertext and decryptability, verifies least privilege and retention, and restores into an isolated environment.
- Restore tests verify elapsed recovery time, tenant isolation, authentication, row counts, critical functions, representative encounters, deleted accounts, revoked shares, policies, and grants.
- Root integration tests run every declared route through the console classifier and assembled Cloudflare routing. The same gate exercises Function fallbacks, manifest hashes, route budgets, and local Pages routing.
- Release tests verify previous-client compatibility with expanded schemas, mixed-version deployment, rollback before contraction, interrupted migration recovery, irreversible-migration rejection, and coordinated repository rollback.
- Monitoring tests use staged event injection and confirm delivery, redaction, threshold behavior, runbook ownership, and privacy-safe evidence.
- No test or assessment performs active production probing without separate written authorization.

## Out of scope

- Implementing the hardening work inside this specification issue.
- Modeling player-character builds or expanding the console beyond its scratchpad scope.
- Replacing local-first interaction with server-read-through behavior.
- Bulk export unless a separate requirement adds it.
- Automatic expiry, truncation, or compaction of authored encounter history without a separate lifecycle decision.
- Formal compliance certification.
- Describing maintainer review as an independent audit or penetration test.
- Making a public accessibility-conformance claim without separately scoped expert evidence.
- Active probing of production infrastructure without written authorization.
- The admin, importer, compendium, site, and handbook as standalone products. Their consumer-path interfaces remain in scope.
- Extracting product-specific hardening modules as independently supported packages without a current external consumer and separate approval.
- Public service-level guarantees before monitoring supports accurate claims.
- A public status surface, service-objective burn alerts, and recurring post-release drills when they have valid accepted risk and dated follow-up.

## Further notes

The source decision map is [Harden the consumer production path](https://github.com/OpenFrayApp/console/issues/3). Its final sequencing decision is [Choose the final hardening workstream sequence](https://github.com/OpenFrayApp/console/issues/22).

Implementation tickets must preserve the stable requirement identifiers. Each ticket must name its owning repository, blocking edges, acceptance criteria, evidence class, rollback condition, and release-blocking status.

The implementation should proceed as tracer bullets through complete behavior where possible. Security, persistence, migration, and publication cutovers must not be split into production states that weaken an existing boundary.

The specification treats all user-authored content as sensitive private data. Diagnostic and evidence systems must remain useful without capturing that content.
