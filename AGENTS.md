Guidance for AI agents (and humans) working in the OpenFray codebase. Read this
before writing code. It is the source of truth for _how_ to build here. The full
reasoning lives in the maintainer's working notes — `local/docs/PROJECT-PLAN.md`
and `local/docs/specs/` — which are **not committed**; everything a contributor
needs to follow the rules is in this file.

Its counterpart for words is [`STYLE.md`](./STYLE.md) — the writing style guide for
every word we publish: the handbook, the marketing site, and the app's own labels
and messages. **Read it before writing or changing any user-facing copy.**

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
| `site/`              | Astro marketing site (home, privacy, terms)         | `/`        |
| `docs/`              | Starlight handbook for players and GMs              | `/docs`    |
| `public/compendium/` | generated SRD / Tome of Beasts JSON the app fetches | —          |
| `local/`             | maintainer working notes — **not committed**        | —          |

`STYLE.md` at the root governs the copy in all three of them.

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
- **Phase 2 (later, designed-for now):** read-only shared player view + live
  multi-device sync — same realtime layer. Visibility flags already live on each
  Combatant; don't render them yet, but don't remove them.
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

## Working agreements for agents

- **Keep PRs/changes focused** — one concern at a time.
- **Minimal comments.** Let the code speak; comment only when it can't — a
  non-obvious _why_, a gotcha, a workaround, or a 5e-rules citation. No narration
  that restates a well-named symbol or obvious code, and no banner/section
  dividers. A concise one-line header on a function/type is fine when its purpose
  isn't clear from the name. Keep comments factual (no marketing/self-praise) and
  current — delete stale ones rather than let them mislead.
- **Be especially careful and explicit around:** auth, the `owner_id`/RLS boundary,
  anything touching user data, and the dice randomness. A change here that "works"
  in testing can still be wrong (e.g. a data-isolation leak passes functional
  tests). Call out the risk and the reasoning.
- **Match existing style**; run the linter/formatter before committing.
- **All user-facing copy follows [`STYLE.md`](./STYLE.md)** — UI labels, buttons,
  errors and empty states as much as the handbook and the marketing site. Renaming a
  label in the app means updating the handbook page and its screenshots in the same
  change.
- **Sign off commits** with `git commit -s` (DCO; no CLA).
- **License:** AGPL-3.0. The running app must expose a "Source" link to the repo
  (AGPL §13). New source files get the short AGPL header.
- **Legal pages:** any change to `site/src/pages/privacy.astro` or `terms.astro`
  must **also bump the `Last updated:` date** (`<p class="updated">`) to the current
  date, in the same edit. Never alter the legal copy without updating that date.
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
