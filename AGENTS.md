Guidance for AI agents (and humans) working in the OpenFray codebase. Read this
before writing code. It is the source of truth for _how_ to build here. The full
reasoning lives in the maintainer's working notes — `local/docs/PROJECT-PLAN.md`
and `local/docs/specs/` — which are **not committed**; everything a contributor
needs to follow the rules is in this file.

Its counterpart for words is [`STYLE.md`](./STYLE.md) — the writing style guide for
every word we publish: the handbook, the marketing site, and the app's own labels
and messages. **Read it before writing or changing any user-facing copy.**

In here:

- [The one principle](#the-one-principle--apply-it-to-every-change) — the scope test
- [Architectural rules](#architectural-rules-do-not-violate-without-explicit-discussion)
- [Repo layout](#repo-layout) — the three parts, the print edition, how the site is styled
- [Code style](#code-style) · [Tests](#tests) · [Committing](#committing)
- [Working agreements](#working-agreements) · [Licensing of content](#licensing-of-content)

---

## What OpenFray is

A fast, browser-based **combat console** for Game Masters running DnD 5e
(5.5e/2024-first, with 5.0 support). It tracks what's happening in a fight:
initiative order, monster resources, conditions, and the relational state between
combatants — plus dice and an SRD reference.

## The one principle — apply it to every change

> **OpenFray is a fast scratchpad, not a system of record.**
> We track what happens at the table — plus the reference a GM jots — never the
> _rules engine_ behind a character.

**The test for any feature, before building it:**

> **Does it require knowing a player character's build? If yes, it is out of scope.**

"Knowing the build" means the app having to _model, derive from, or run_ class,
level, features, or spells — not the descriptive facts a GM chooses to type in.

Out of scope (belongs on a character sheet / D&D Beyond, never here): modeling
class features or what an ability _does_; tracking PC spell slots, resources, or
level; importing/syncing character sheets; auto-converting content between
editions; auto-matching or deduplicating user-created creatures.

In scope (board state — what is happening now): conditions, advantage/disadvantage,
flat modifiers, reminders; monster resources (spell slots, legendary/lair actions,
recharge); concentration, initiative, HP, turn/round tracking; dice and group
saves.

**Two flavours of lightweight combatant** (neither is a character sheet): a **PC**
holds the board facts plus the reference the GM chooses to jot — AC, HP, conditions;
optionally ability scores, senses, speed, an initiative modifier, and damage
resistances/immunities/vulnerabilities (these feed damage like a monster's); and
character context like race, alignment, faith, personality traits/ideals/bonds/flaws,
a backstory, and private GM notes. A **Quick add** is just name/HP/AC for a throwaway
NPC. The test still holds: the GM _transcribes_ these facts and the app displays them;
it never models class/level/spells, derives a build, or runs what a character can do.
GM-entered defenses are "what damage this takes" — a board consequence — not a sheet
we read.

**One deliberate carve-out (issues #5/#6, maintainer-decided 2026-08-03):** a
signed-in roster character may also carry a **class, level, and the armor worn**, and
exactly two numbers derive from them — **armor class** (the SRD armor table, shield,
magic enhancements, and the Barbarian/Monk unarmored formulas) and the **initiative
modifier** (DEX, plus Jack of All Trades) — each behind an opt-in, with the GM's
typed number always available instead. `src/schema/pcStats.ts` is the whole of it.
This is still transcription plus a lookup, not a rules engine: nothing else may read
class or level without the maintainer widening this carve-out explicitly, and the
anonymous forms never gain these fields.

If a feature is useful but fails the test, it is still a no. When a request tempts
you toward "it should really _know_ X about the player," stop — that temptation is
the signal, not a reason to proceed. Flag it rather than building it.

---

## Architectural rules (do not violate without explicit discussion)

These each exist for a reason; all of them point toward the simpler, more
independent, more local-first option.

1. **One shared schema** for monsters, NPCs, and the compendium. Library creatures
   are read-only templates; combat instantiates them into mutable Combatants.
2. **Mechanics in structured fields, prose in `text`.** Never parse prose back into
   numbers. `toHit`, `damage[].formula`, `save.dc` are data; the stat-block text is
   display-only.
3. **The Effect abstraction.** Conditions, advantage/disadvantage, flat modifiers,
   and reminders are all one `Effect` type. There are ~6 consequence shapes in all
   of 5e; model those, never the class features that produce them. The
   `direction: incoming|outgoing` field captures both "advantage against me" and "I
   roll at disadvantage."
4. **Snapshot, don't reference.** Putting a creature into combat copies its data
   into the encounter. Editing a library template must never mutate an in-progress
   fight.
5. **Turn ownership is by `combatantId`, never array index.** Any list mutation
   re-derives `activeIndex` from the active creature's id. Effects keyed to "start
   of source's next turn" tick at **start**, not end.
6. **One dice chokepoint.** Every roll goes through `roll(formula, ctx)`. That is
   where randomness, effect-awareness, and the roll log live.
7. **Randomness: CSPRNG + modulo-bias rejection.** Use `crypto.getRandomValues()`,
   reject the biased top slice and redraw. **Never** add "anti-streak" or
   "feels-fair" logic — uniform and transparent only. Trust comes from the
   transparent roll log, not from tampering.
8. **Local-first, never server-read-through.** Mutate in-memory state, render
   immediately, persist to the backend in the **background** (debounced autosave).
   The UI must never wait on a network round-trip to reflect the GM's own action.
9. **Multi-tenant isolation via `owner_id` + Row-Level Security**, from the first
   line of backend code. Every user-owned row carries `owner_id`; the database
   enforces isolation. This is security-critical — treat changes here with extra
   caution and never weaken the boundary to make something "work."
10. **Encounter state is one autosaved JSONB blob.** Combatants live inside it, not
    as separately-queried rows.

## Editions & sources

`source` (`srd`, `kobold-press-…`, `custom`) + `edition` (`5.0`/`5.5`) +
intra-source identity key. Edition is a **campaign-level setting**, not a per-block
toggle. Grouping "same creature, two editions" happens **only within one source**,
over import-controlled content, never across sources and **never on user content**
(every custom creature is an independent entity). Duplicate detection on custom
content is advisory only — "warn, then forget"; it must never link, merge, or
dedup.

---

## Repo layout

Three parts ship as **one site from this one repo**; `scripts/assemble-site.mjs` merges
their builds into `dist/` for Cloudflare Pages.

| Folder               | What it is                                          | Served at  |
| -------------------- | --------------------------------------------------- | ---------- |
| `src/` (repo root)   | the React + Vite combat console                     | `/console` |
| `site/`              | Astro marketing site, plus the published libraries  | `/`        |
| `docs/`              | Starlight handbook for players and GMs              | `/docs`    |
| `public/compendium/` | generated SRD / Tome of Beasts JSON the app fetches | —          |
| `local/`             | maintainer working notes — **not committed**        | —          |

`STYLE.md` at the root governs the copy in all three of them.

### Where a published library's content lives

A first-party library (_The Waking Garden_) is published as a section of `site/`, and it
has exactly two sources. Edit them; don't generate them.

- **Prose** — `site/src/content/waking-garden/*.mdx`, one file per chapter. These are
  written by hand. They were imported once from the authored manuscript, but they have
  since diverged on purpose (the web edition says "library" where print says "book", and
  it reorders an encounter's parts), so the MDX is the source now and re-importing would
  undo those edits. There is no generator to re-run, and adding one back would only turn
  every copy edit into a string substitution keyed to a sentence that might change.
- **Stat blocks** — `public/compendium/<library>-creatures.json`, rendered at build time
  by `site/src/components/Creature.astro`. Never transcribe a stat block into the prose:
  the page and the console read the same file, which is what stops them disagreeing. That
  JSON is generated from the openfray-compendium repo; edit it there.

The print edition is built from these same two sources, with only the differences that
print needs (its own wording for "book", a two-column page). It is not a separate text.
Its licensing page also keeps a fineprint line the web edition drops, because print has no
footer to carry the compatibility and trademark notices.

### How the print edition is built

`site/src/pages/the-waking-garden/print.astro` renders the whole book as one page and
[Paged.js](https://pagedjs.org) lays it out on A4. Run the site's dev server, open
`/the-waking-garden/print/`, and print to PDF. Pagination takes about a minute and the
page is blank while it runs.

It is a **local tool, not a page of the site**: `scripts/assemble-site.mjs` removes the
route from `dist/` and the sitemap filter keeps it unadvertised. It lives under
`src/pages` anyway so it renders through the site's own components and stylesheet — an
earlier Typst edition restated that CSS in another language, and nearly all the work went
into the restating rather than the book.

**Layout is authored, not inferred.** Three controls in the MDX, and nothing else decides:

|                        |                                                           |
| ---------------------- | --------------------------------------------------------- |
| `<div class="wide">`   | span the page — wrap the **whole section**, not the table |
| `<PageBreak />`        | start a new page                                          |
| `<div class="run-in">` | set a lookup table as a run-in list                       |

Wrapping only a table is the mistake to avoid: a spanning element splits the column flow,
and the short run left above it balances into two stubby columns.

Things that will bite whoever changes this next:

- **Paged.js is handed only `print-paged.css`.** Given no stylesheets it strips every one
  in the document and parses them with css-tree, which cannot read Tailwind v4's
  `@media (width >= 40rem)` — the prelude comes back raw and Paged.js's own print-media
  handler throws on it, leaving a blank page and no error.
- **The root font size is the scale.** Everything on the site is in `rem`, so one
  declaration sizes the whole book and keeps its proportions.
- **`break-after: avoid` does nothing** — Paged.js discards it. Keeping a heading with its
  paragraph, and a stat block's identity together, is done by wrapping them in a group
  that carries `break-inside: avoid`. `print.astro` builds those groups.
- **Spacing on an element's top misaligns at every fragment boundary** — page tops, column
  tops, multicol starts. Print corrects it by measuring per column after layout, because
  Paged.js rebuilds the ancestor chain per page and `:first-child` cannot find it. The
  site pushes spacing downward in CSS instead.
- **Pagination waits on `document.fonts.ready`.** Without it the book measures against the
  fallback face and the page count varies run to run.
- **Cross-references resolve after pagination**, not by `target-counter`, which only sees
  pages already laid out and so misses every forward reference. A placeholder reserves the
  space during layout; the digits are filled in against the rendered clones, not the source
  markup Paged.js keeps in a `<template>`.
- **The site's `--faint` is 2.6:1 on white.** Print overrides it — with `!important`, since
  `global.css` sets it on `:root.light`.
- **Stat blocks are `<details>` on the site**, collapsed to name, type line and lore. Print
  flattens them before paginating, so the markup serves both.

One print/web difference is encoded rather than hand-maintained: the web's "library"
becomes "book" via a whole-word map that **asserts its occurrence count**, so a copy edit
that changes it warns in the console instead of silently rewriting prose.

### How the site is styled

`site/` is **Tailwind v4, utilities-first**: a component, layout or page carries its own
utilities, and the two stylesheets hold only what a utility can't reach.

- The theme lives in CSS custom properties mapped into `@theme`, so `bg-panel` resolves
  through the variable and flips with the light/dark toggle. There is **no `dark:` variant
  here** — the app (`src/`) uses the opposite convention (`.dark` + `dark:`). Don't unify
  them without changing the pre-paint script in both places.
- **All of the site's own CSS is wrapped in `@layer components`.** That is load-bearing:
  layer order beats specificity, so utilities always win over the stylesheet and the
  stylesheet always wins over preflight. Don't unwrap it.
- **What stays CSS, deliberately:** the prose defaults for `.doc` and `.book-body` — they
  style bare `h2`/`p`/`li`/`td` in long-form copy, which has nothing to hang a utility on
  short of classing every paragraph — plus the rendered markdown inside components,
  element-level rules, and the few things no utility can express (`.lightbox::backdrop`,
  the theme toggle's icon swap, `color-mix()`).
- `scripts/check-css-specificity.mjs` fails the build on a prose rule written as a plain
  descendant selector. Wrap prose defaults in `:where()` so a component's own class wins.

Three Tailwind behaviors have each caused a silent bug here. All three are invisible until
measured:

1. **Preflight removes browser defaults the stylesheet never declared** — bold headings,
   list markers, paragraph margins. They are declared explicitly now.
2. **Two utilities for the same property in one class list resolve by Tailwind's output
   order, not the order written.** Keep a shared class constant free of any property a
   caller might set; `display` and margins have both bitten.
3. **A `text-*` utility also sets `line-height`.** Pair it with an explicit `leading-*`
   when the element had been inheriting the body's `1.6`.

**A class name may also be a script hook** (`.lightbox-next`, `.nav-toggle`, `.shot-thumb`).
Keep the semantic name alongside the utilities — dropping one breaks behavior while every
computed style stays identical, so measurement cannot catch it.

Before changing shared CSS or a layout, snapshot computed styles and diff after; every
regression worth catching in `site/` has been invisible to the eye and obvious in the
numbers.

### Workspaces & dev servers

`site/` and `docs/` are **npm workspaces**: one `npm install` at the root covers all
three, and each still declares its own dependencies in its own `package.json`. There is
one lockfile, at the root.

Each part runs its own dev server, on a port pinned in its own config — not passed on
the command line, so `npm run dev` and the editor's launch configs agree:

| Command               | What it starts             | URL                     |
| --------------------- | -------------------------- | ----------------------- |
| `npm run dev`         | the console (Vite)         | localhost:5199/console/ |
| `npm run dev -w site` | the marketing site (Astro) | localhost:4321          |
| `npm run dev -w docs` | the handbook (Starlight)   | localhost:4322/docs/    |
| `npm run dev:all`     | all three at once          | the three URLs above    |

Most work needs only one of them. `npm run build` builds all three and assembles
`dist/` — the only check that proves the **links between** the parts resolve, since in
dev they're on different origins.

> **Don't try to serve all three from one dev origin.** Proxying `/console` and `/docs`
> through the site's dev server was tried and abandoned: each Vite dev server emits
> root-relative asset URLs (`/node_modules/…`, `/@vite/client`) with no path prefix, so
> the proxied server's assets get requested from the proxying server, which fails with a
> confusing overlay. Setting `vite.base` fixes the assets and breaks routing instead.

Two companion projects live in **their own repos**, because they have their own release
cadence and consumers: [openfray-compendium](https://github.com/SirDarcanos/openfray-compendium)
(the ingest tooling that generates `public/compendium/*.json`) and
[openfray-importer](https://github.com/SirDarcanos/openfray-importer) (the browser
extension). Split a part out only when it earns that — these three do not.

Two more are npm packages, general enough that nothing about them is OpenFray's:
[opendice](https://github.com/SirDarcanos/opendice) rolls the dice, and
[shotlist](https://github.com/SirDarcanos/shotlist) takes the screenshots.

**Every capture in the handbook and on the site is a recipe.** They live in
`screenshots/` — one YAML file per picture, with the shared setup in `macros/` and the
sample party and foes in `data/`. Run the console (`npm run dev`), then:

| Command                          | What it does                                |
| -------------------------------- | ------------------------------------------- |
| `npx shotlist`                    | list the recipes                            |
| `npx shotlist <name> --install`   | re-shoot one and copy it where it belongs   |
| `npx shotlist --all --install`    | re-shoot everything                         |
| `npx shotlist --check`            | report the captures the app has moved on from |

A capture is data, so re-shooting a stale one is a command rather than an afternoon. If a
picture needs something the recipe vocabulary cannot say, that is a missing primitive in
shotlist — add it there rather than an escape hatch here. Two rules the recipes rely on:
fill an initiative for **every** combatant, creatures included, or the console rolls
theirs and the board reorders between runs; and a shot framing live dice or the fight
clock takes `check: false`, because it can never match itself.

## Tech stack

- **TypeScript end to end.** Shared types for the core shapes (Creature, Combatant,
  Effect, Encounter) are the backbone — define once, use everywhere.
- **Frontend:** React + Vite + Tailwind. Design **tablet/desktop-first** (the combat
  console is a dense landscape layout); phone is a reduced reference companion, not
  the primary surface. Not mobile-first.
- **Backend:** Supabase (hosted Postgres + auth + RLS + realtime). Phase 1 may need
  little or no custom server code. **Prefer Supabase's built-in auth and RLS over
  hand-written auth/permission code** — let battle-tested infrastructure own the
  security-critical machinery.
- **No browser storage in artifacts/components beyond `sessionStorage`** for
  ephemeral anonymous state (never `localStorage` for that — it would reintroduce
  durability we deliberately avoid).

## Phases

- **Phase 1 (now):** single-GM, single-device tracker + differentiators
  (resource tracking, effects, mass save, dice, SRD compendium, custom-creature
  form, identity). No multiplayer.
- **Phase 2 (in progress):** the read-only **shared player view** is built —
  `combat/playerView.ts` filters the encounter into the only shape that leaves the GM's
  browser, and `state/playerChannel.ts` relays it over a Supabase realtime **broadcast**
  channel that stores nothing (which is what lets an anonymous GM share without a row
  reaching the database). What players see of a creature is a device-local setting; the
  per-combatant `visibility` flags on `MonsterCombatant` stay unrendered, reserved for a
  future per-creature override. Live multi-device sync for the GM's own phone is the
  remaining half of the same layer.
- **Deferred, never core:** D&D Beyond / Roll20 import (no public API; best-effort
  only).

## Build order (phase 1)

1. Creature + Action + Effect schema (shared types) — first, everything reads from
   it.
2. Encounter + Combatant + initiative loop (turn/round ticks).
3. Resource tracking (HP, slots, legendary, lair, limited-use/recharge).
4. Conditions + Effects as one system; reminder badges on rows.
5. Dice engine (presets + manual; CSPRNG + bias rejection; roll log).
6. Effect-aware rolling (auto adv/disadv) — upgrade of #5.
7. Mass save flow.
8. SRD compendium + custom-creature/spell form. The compendium ships as static
   JSON in `public/compendium/`; **the ingest tooling lives in the separate
   [openfray-compendium](https://github.com/SirDarcanos/openfray-compendium) repo**,
   not here (SRD 5.2.1 creatures, spells, and conditions are parsed from WotC's
   official 5.2.1 PDF; SRD 5.1 comes from dnd5eapi). The app only consumes the JSON.
   **Before touching the compendium data or the stat-block UI, read
   `local/docs/compendium-ingest.md`** (maintainer-local) for the data gotchas and
   where the tooling now lives. **Adding a library with spells means triaging
   each one**: give it an entry in `src/combat/spells/*` or list it, with a reason, in
   `tests/combat/spellCoverage.data.ts`. `spellCoverage.test.ts` fails until every
   spell has a verdict — a missing entry is otherwise invisible (the spell just
   silently offers no targets and applies nothing when cast).
9. Concentration auto-checks.
10. Identity: anonymous (ephemeral, `sessionStorage`) + sign-up (persist, RLS on).

Through #5 there is a usable tracker. Build in that order unless there's reason not
to.

---

## Code style

The aim is code that explains itself: names carry the meaning, comments carry only
what a name can't.

- **Every named function, method, component, and hook opens with a one-line header
  comment saying what it does.** In TypeScript and JavaScript that's a one-line
  JSDoc (`/** Apply a defense relation to a damage amount. */`) so editors surface
  it on hover; in an Astro frontmatter block the same. Inline callbacks and lambdas
  passed as arguments stay bare.
- **No other comments unless the code can't say it.** A non-obvious _why_, a gotcha,
  a workaround, or a 5e-rules citation earns a comment; narration of what the next
  line does, restating a well-named symbol, banner/section dividers, and
  self-congratulation do not. Keep comments factual and current — delete stale ones
  rather than let them mislead.
- **One definition per concept.** A helper needed by two files moves to a shared
  module; never paste a second copy. Canonical homes: combatant accessors in
  `src/combat/combatant.ts`, display formatting in `src/compendium/format.ts`,
  schema-level derivations in `src/schema/`, the site's formatting in
  `site/src/data/wakingGarden.ts`. (The app formats a negative as `-1`; the site's
  game content uses the true minus `−1` per `STYLE.md` — that's why the two sides
  keep separate formatters.)
- **Match the file you're in** — naming, idiom, and comment density. New source
  files start with the short AGPL header (`SPDX-License-Identifier` + copyright).
- **Prettier and ESLint decide formatting** — run `npm run format` before
  committing; never hand-align or fight the formatter. `npm run lint` and
  `npm run typecheck` stay clean.
- **All user-facing copy follows [`STYLE.md`](./STYLE.md)** — UI labels, buttons,
  errors and empty states as much as the handbook and the marketing site.

## Tests

Everything testable ships with tests, and a behavior change updates its tests in
the same commit.

- **Where they live:** the root suite is `tests/`, mirroring `src/` (never
  co-located). The site workspace's suite is `site/tests/`, mirroring `site/src/`.
  Build scripts are covered from `tests/scripts/`.
- **How they run:** `npm run test` at the root. Tests default to the fast node
  environment; a component test opts into jsdom with a file docblock
  (`// @vitest-environment jsdom`).
- **What "testable" means here:** pure logic always (combat math, formatters,
  parsers, transforms); components render-tested for the states that carry logic;
  network and Supabase access behind mocks. The dice RNG and the `owner_id`/RLS
  boundary are the two places a change can pass tests and still be wrong — test
  them anyway, then reason about them explicitly in the PR.
- **Spells are gated:** every spell in a shipped library needs a verdict — an
  implementation in `src/combat/spells/*` or a reasoned entry in
  `tests/combat/spellCoverage.data.ts` — or `spellCoverage.test.ts` fails.

## Committing

- **One concern per commit**, committed as the work lands — small and often beats
  one big drop.
- **Subject:** `Area: what changed`, imperative, sentence case after the prefix.
  The areas in use: `App`, `Site`, `Docs`, `Print`, `Style`, `Build`, `Scripts`,
  `Copy`, `Tests`. The body explains _why_, in prose.
- **Sign-off (DCO):** every commit carries `Signed-off-by` — use `git commit -s`.
  There is no CLA.
- **Authorship is human.** Commits are authored and signed by the person making
  them. Never add AI co-author trailers (`Co-Authored-By: Claude …`) or
  "Generated with …" lines to a commit message, PR, or changelog.
- **Don't push without the maintainer's go-ahead.** Pushes trigger production
  builds on Cloudflare Pages; work is committed locally as it lands and pushed
  once, deliberately.

## Working agreements

- **Keep PRs/changes focused** — one concern at a time.
- **Be especially careful and explicit around:** auth, the `owner_id`/RLS boundary,
  anything touching user data, and the dice randomness. A change here that "works"
  in testing can still be wrong (e.g. a data-isolation leak passes functional
  tests). Call out the risk and the reasoning.
- **License:** AGPL-3.0. The running app must expose a "Source" link to the repo
  (AGPL §13). New source files get the short AGPL header.
- **Legal pages:** any change to `site/src/pages/privacy.astro` or `terms.astro`
  must **also bump the `Last updated:` date** (`<p class="updated">`) to the current
  date, in the same edit. Never alter the legal copy without updating that date.
- **Renaming a label in the app is a documentation change** — update the handbook
  page and its screenshots in the same change.
- **When unsure whether something is in scope, ask / flag — don't quietly build it.**

## Licensing of content

**Each source is honored under its own license, preferring CC-BY > ORC > OGL.** WotC
SRD is **CC-BY-4.0** (5.2 CC-BY-only; 5.1 dual-licensed → we elect CC-BY; never OGL for
WotC). CC-BY's obligations: credit WotC with their exact attribution string, link the
license, state that changes were made, don't imply endorsement. Third-party content
(e.g. Kobold Press / Tome of Beasts) is honored under its **actual** license — ORC where
offered, else **OGL 1.0a** — **never assumed CC-BY**. Using a source under the OGL means
shipping **only its declared Open Game Content** (no Product Identity — art, fiction, PI
names, sidebars), reproducing the **full OGL text + verbatim Section 15 chain**, and
designating our OGC. **Never ingest SRD-excluded WotC IP** (Beholder, Mind Flayer, …).
All of this is satisfied via an in-app About/Credits screen + `CREDITS.md`, which is the
public record of compliance. Full ingest instructions: `local/docs/content-licensing.md`
(maintainer-local). This content licensing is separate from the project's AGPL (which
governs the code).
