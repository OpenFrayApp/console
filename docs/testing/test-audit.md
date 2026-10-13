# Test audit

## Policy

The console’s `AGENTS.md` selects tests by regression risk and maintenance cost.
Keep explicit coverage for critical combat rules, security, privacy, destructive
operations, and recovery. Every shipped spell still requires a modeled or
reasoned manual verdict.

The parent repository’s `AGENTS.md` still requires “everything testable” and
“pure logic always.” Those upstream instructions conflict with the revised
console policy. Updating the parent guidance remains a separate cross-repo task;
this change modifies only the console.

## First batch

| Test file under `tests/`                   | Change                                                                                                                                                             | Retained confidence and accepted gap                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `combat/spellIntegrationStandards.test.ts` | Select cards with a reviewed effect for reminder validation. Remove 718 no-effect cases that executed no assertions. Require selected builders to produce effects. | Every authored effect definition in these libraries still receives the reminder checks. Skip verdicts and targeted casting regressions remain. `spellCoverage.test.ts` and library casting tests retain the verdict contract.                                                                                                                                                                                                                     |
| `combat/spellEffects.invariants.test.ts`   | Replace 177 bundling cases with Bless and Haste. Require a nonempty bundle ID. The third batch corrects the single-effect representative.                          | Haste still checks grouping, naming, and independent bundle IDs across builds. Bless also builds multiple effects, so this pair does not check the unbundled path. All entries retain badge shape, authored effect counts, fresh IDs, targeting, condition names, save propagation, and edition checks. Per-entry wrapper repetition is removed; entry-specific wrapper faults could require additional cases if the wrapper gains such branches. |
| `combat/deepMagic2020Casting.test.ts`      | Remove four altered-identity lookups from each of 503 source-hash cases (2,012 repeated negative assertions).                                                      | The shared lookup’s source, edition, name, and ID rejection remains in `reviewedSpells.test.ts`. Every Deep Magic source hash, positive lookup, non-mutation check, authored verdict, and targeted regression remains. Negative identity permutations are no longer repeated for each card.                                                                                                                                                       |
| `tutorial/TutorialSetup.copy.test.tsx`     | Remove exact headings and the 65-word ceiling from 21 task cases.                                                                                                  | Next-action guidance, destructive-action consequences, roster wording, committed hit/miss/critical outcomes, and the absence of an acknowledgement button remain. Editorial heading wording and length are no longer test contracts.                                                                                                                                                                                                              |

The two largest reductions remove redundant execution, not just parameterized
case names. Deep Magic and tutorial changes reduce assertions and expected-copy
maintenance without reducing their collected case counts.

The remaining large spell checks validate independently authored data. Their
size alone does not justify pruning them. Settings, color validation, browser
flows, database permissions, privacy filtering, and persistence/recovery tests
are outside this batch and unchanged.

## Second batch: spell checks

- **Identity rejection:** remove 1,475 repeated negative lookups from Kibbles
  (five per card) and 724 from Spells That Don’t Suck (four per card).
  Each card still has a source hash, positive identity lookup, and non-mutation
  check. Shared identity rejection remains in `reviewedSpells.test.ts`.
- **Forged mechanics:** replace Deep Magic’s 503 per-verdict precedence checks
  and 334 manual-profile fallback checks with four representative profiles:
  attack, save, effect-only, and manual. Every authored verdict remains checked.
  The removed loop also repeated 334 reference-only checks; the exhaustive
  per-card checks and empty reference-only inventory remain.
- **Authored effect invariants:** combine badge, summary, targeting, and condition
  validation into one case per entry. All assertions remain. This consolidates
  531 cases into 177 and removes 708 redundant builder calls. Badge bundling
  classification also moves outside the per-effect loop.
- **So Many Spells bundles:** keep all six authored multipart requirements.
  Replace repeated wrapper grouping and fresh-bundle checks with effect-count
  assertions. The shared wrapper is covered by the retained Haste tests.
- **Casting UI:** reduce `ReviewedSpellCasting.test.tsx` from 380 to 236 cases.
  Both the prepared-spell panel and creature casting routes remain exercised.
  Independently authored mechanics stay covered by the pure casting tests.

The UI reductions cover these equivalence classes:

| UI group                               | Cases per route before | Cases per route after | Retained checks                                                                                                                                                         |
| -------------------------------------- | ---------------------: | --------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tome of Heroes save display            |                     28 |                     3 | Butterfly Effect (save-only), Conjure Spectral Allies (damage), and Eruption (area). All printed saves and attack absence remain in `reviewedSpells.test.ts`.           |
| Deep Magic successful area saves       |                      8 |                     3 | Black Swan Storm (damage), Creeping Ice (save-only), and Mire (non-concentration). Add eight pure cases for authored persistence flags and absence of creature effects. |
| Deep Magic manual outcomes             |                      6 |                     1 | Time Loop exercises the shared UI. All 503 authored verdicts still check modeled/manual boundaries.                                                                     |
| So Many Spells later damage            |                      8 |                     1 | Deadly Light exercises the zero-damage save UI. Per-spell save and damage expectations remain in `soManyCasting.test.ts`.                                               |
| So Many Spells ambiguous outcomes      |                      7 |                     1 | Ghastly Stampede exercises the manual UI. Retain all seven roll boundaries and add seven pure no-effect checks.                                                         |
| Spells That Don’t Suck later damage    |                     11 |                     1 | Animal Transformation exercises the zero-damage save UI. Per-spell save and damage expectations remain in `spellsThatDontSuckCasting.test.ts`.                          |
| Spells That Don’t Suck manual outcomes |                      7 |                     1 | Death Ray exercises the manual UI. All seven pure checks still require no action and no effect.                                                                         |
| Kibbles secondary saves                |                      4 |                     1 | Poison Dart exercises attack dispatch without a secondary condition. All four pure no-effect checks remain.                                                             |
| Kibbles incompatible outcomes          |                      6 |                     1 | Acidic Pit exercises the manual UI. Every removed card remains in the pure incompatible-branch checks.                                                                  |

The accepted gap is per-card repetition of shared UI behavior. A future
card-specific branch in the casting components would require its own wiring
case. Distinct rider, concentration, turn-boundary, mixed-damage, healing, and
resource behavior outside these groups remains covered as before.

This batch removes 144 UI cases, consolidates 354 invariant cases, and adds
19 lower-cost or representative cases. Its net reduction is 479 cases.
The invariant assertions were preserved; their case-count reduction is not
removed coverage.

## Inventory and baseline

Collected with `vitest list --json` and separately with
`vitest list --config vitest.browser.config.ts --json`.
The refreshed default inventory is 8,052, five above the handoff inventory.

| Suite   | Original | First batch | Second batch | Original duration | First-batch duration | Second-batch duration |
| ------- | -------: | ----------: | -----------: | ----------------: | -------------------: | --------------------: |
| Default |    8,052 |       7,159 |        6,680 |     23.99 seconds |        26.72 seconds |         25.13 seconds |
| Browser |      179 |         179 |          179 |     18.83 seconds |        19.27 seconds |         18.69 seconds |

Both baseline suites passed: 213 default files and 17 browser files.
The browser command also passed all four writer-identity checks.
The focused run passed 2,993 tests across seven files.

Durations are Vitest-reported wall times from one run of each suite. The browser
figure excludes installation and the separate writer-identity script. A single
before/after run cannot establish a performance improvement.

## First-batch verification

- Final default suite: 7,159 tests passed across 213 files.
- Final browser suite: 179 tests passed across 17 files. All four
  writer-identity checks also passed.
- Typecheck, ESLint, changed-file Prettier checks, and `git diff --check` passed.
- Temporarily bypassing multipart bundling failed the retained Haste invariant.
- Temporarily removing reviewed-card name matching failed the retained renamed
  card rejection test in `reviewedSpells.test.ts`.
- Both mutations were restored before final verification. Production files have
  no diff.
- The parent prose checker reports five existing em-dash violations in unchanged
  portions of `AGENTS.md`. Checking the baseline and changed documents in
  isolated directories produced the same five failures. No new fatal prose
  violations were introduced.

The first-batch final runs were slower than the baselines. This batch establishes reduced
redundant execution and maintenance, without a measured speed improvement.
No build was run because production code, configuration, and dependencies are
unchanged.

## Second-batch verification

- The same six focused files passed before and after the changes:
  3,468 cases in 4.24 seconds, then 2,989 in 3.43 seconds.
- The full default suite passed 6,680 tests across 213 files.
- The browser suite passed 179 tests across 17 files. All four writer-identity
  checks also passed.
- Typecheck, ESLint, changed-file Prettier checks, and `git diff --check` passed.
- Allowing reviewed manual/effect-only profiles to fall back to forged mechanics
  failed two representative precedence tests.
- Dropping area concentration on successful saves in the prepared-spell panel
  failed two retained UI tests. The creature casting route remained unaffected.
- Misspelling Hold Person’s condition failed the consolidated authored invariant.
- All three mutations were restored before final verification. Production files
  have no diff.

The focused timing is lower in this single pair of runs. The full default suite
is still slower than the original baseline; no overall speed improvement is
established. Both batches together reduce the default inventory by 1,372 cases.
Of those, 354 are consolidation with all authored invariant assertions retained.

The remaining large spell tests predominantly check independently authored source
cards, casting verdicts, badge wording, and combat semantics. Those contracts
remain exhaustive. This audit has not established that all remaining tests across
the repository are necessary.

## Third batch: redundant rendering and invariant checks

A rendering assertion earns its place when it protects conditional display,
correct data wiring, an interaction, or an accessibility requirement. Check for
an existing assertion of the same behavior before adding a separate presence test.
DOM presence alone does not establish visibility or reachability in a browser.

| Test file under `tests/`                           | Change                                                                                                                                                    | Retained protection                                                                                                                                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `combat/spellEffects.invariants.test.ts`           | Fold save propagation into the existing authored invariant builds. Remove the 177-case save matrix, whose 160 non-save cases had no assertions.           | Every built save-ends effect still carries the supplied ability and DC.                                                                                                                                                 |
| `combat/spellEffects.invariants.test.ts`           | Remove 177 per-edition nonempty checks and the arbitrary 150-entry minimum.                                                                               | `spellBadges.test.ts` checks the complete table and exact nonempty output in both editions. `spellCoverage.test.ts` requires every shipped spell to have a verdict. Target-dependent effects keep their semantic tests. |
| `combat/spellEffects.invariants.test.ts`           | Use Mage Armor and Haste for single/multipart wrapping; require their expected effect counts and exactly one row group.                                   | Both wrapper branches have explicit representatives. Bundle naming, fresh bundle IDs, and unbundled single effects remain checked.                                                                                      |
| `components/resolve/ReviewedSpellCasting.test.tsx` | Reduce Kibbles initial-save display examples from six to two per route.                                                                                   | Acid Bubble covers damage and Shadow Bind covers save-only entry. Every authored save stays in the pure casting tests. Mind Blast retains its dedicated UI application test. Both casting routes remain covered.        |
| `components/statblock/SpellCard.test.tsx`          | Replace six formatting renders with one component wiring check.                                                                                           | Formatter equivalence classes stay in `compendium/format.test.ts`. The component still checks casting time, duration, and source non-mutation. Browser coverage retains reaction formatting and actual text alignment.  |
| `components/tracker/CombatantRow.test.tsx`         | Fold temporary HP into PC display coverage; remove the duplicate active-marker case. Use distinct current/max HP values and check their combined display. | Monster and PC data paths remain covered. Color updates already check the active marker; a new assertion checks its removal when inactive. Swapping current and maximum HP now fails the display checks.                |
| `components/shell/MobileNav.test.tsx`              | Combine label presence with tab interaction and active-state checks.                                                                                      | Every authored tab dispatches its own ID exactly once. Updating the active tab moves the accessible marker.                                                                                                             |
| `components/editors/FormSection.test.tsx`          | Remove the browser-owned native details-toggle test.                                                                                                      | The component must render the summary first inside details, contain its fields, and honor default/explicit open state.                                                                                                  |

The accepted reduction is repeated UI execution for equivalent inputs. Per-card
resolver routing and formatter wiring now rely on representatives plus lower-layer
coverage. Distinct save outcomes, rider application, concentration, temporary HP,
and navigation behavior remain covered. Privacy, recovery, ownership, and browser
reachability tests are unchanged.

This batch removes 372 standalone cases: 355 invariant cases and 17 component
cases. The save assertions and several component assertions move into existing
scenarios. The reduction includes consolidation and redundant execution; it does
not represent 372 discarded behaviors.

### Third-batch verification

The same 11 focused files passed before and after cleanup: 1,647 cases in
3.48 seconds, then 1,275 in 3.49 seconds. This pair of runs establishes no speed
improvement.

- Full default suite: 6,308 tests passed across 213 files in 30.11 seconds.
- Browser suite: 179 tests passed across 17 files in 19.26 seconds. All four
  writer-identity checks passed.
- Typecheck, ESLint, changed-file Prettier, and `git diff --check` passed.
- The parent prose checker passed for this audit document in an isolated directory.
- Increasing the supplied save DC failed the consolidated Hold Person invariant.
- Bundling single effects failed the Mage Armor wrapper check.
- Displaying maximum HP as current HP failed both monster and PC display checks.
- Bypassing casting-time formatting failed the retained SpellCard wiring check.
- All four temporary faults were restored before full verification. Production
  files have no diff.

The default inventory is 372 below the second batch and 1,744 below the original
baseline. Browser coverage is unchanged. The full default run took longer than the
recorded second-batch run; typecheck and lint ran concurrently with this test run.
These measurements establish no overall speed improvement. No build was run because
production code, dependencies, and configuration are unchanged.
