# OpenFray

**A free, open-source DnD 5e combat tracker for Dungeon Masters.**

5.5e/2024-first, with 5.0 support. Built for the table — fast, glanceable, and
focused on the one job other trackers do badly: keeping hold of what's actually
happening in a fight.

🌐 [openfray.app](https://openfray.app) · AGPL-3.0

---

## What it is

OpenFray is a combat console for running DnD 5e encounters: initiative order,
monster resources (spell slots, legendary & lair actions, recharge abilities),
concentration, conditions, the relational state between combatants (who has
advantage on whom, who's debuffed), mass saves, and dice — with a built-in SRD
compendium and an easy custom-creature form.

It exists because the tools that came before it track *each creature* well but
forget the *relationships*: that the barbarian's Reckless Attack grants advantage
against him, that the bard's Vicious Mockery debuffs the goblin's next swing, that
six creatures all need to roll the same save against one Fireball. OpenFray treats
those as first-class.

## The one principle that shapes everything

**OpenFray is a fast scratchpad, not a system of record.**

It tracks *consequences on the board*, never *abilities on a sheet*. The player's
character sheet owns what a character *can do*; OpenFray owns what
*just happened* and what must be *remembered* this round. This line is deliberate,
and it's the reason the app stays fast and simple instead of becoming a worse copy
of a VTT.

The test for any feature, contribution, or idea:

> **Does it require knowing a player character's build? If yes, it's out of scope.**

This isn't a limitation to work around — it's the design. A few of its
consequences, so the spirit is clear:

- **Players are lightweight, and it's the DM's call what to jot.** A PC carries the
  board facts the DM wants — AC, HP, conditions, and optionally an initiative
  modifier, passive perception, languages, speed, and damage
  resistances/immunities/vulnerabilities (the app applies those when you deal
  damage). A **Quick add** is even lighter — name, HP, AC — for a throwaway NPC or a
  creature dropped in mid-fight. Still no class, level, or spell list: OpenFray
  transcribes the consequences a DM declares, it never derives a character's build.
- **Effects model the *result*, not the cause.** There are only ~6 shapes of
  consequence in all of 5e (a condition, advantage, disadvantage, a flat modifier,
  a reminder, a save-ends effect). We model those six. We never model the hundreds
  of class features that produce them — the DM transcribes the outcome, the app
  reminds.
- **Combat is local-first.** State lives in the browser and feels instant;
  persistence happens quietly in the background. The app never makes you wait on
  the network to roll a die or tick a condition.
- **Creatures in combat are snapshots, not references.** Editing a monster in your
  library never mutates a fight in progress.

If you're contributing and a change starts to feel like it needs a character's
build, sheet, or class logic — that's the signal to stop and rethink, not to add
the field.

## Status

🚧 Early development. The **single-DM combat console works**: roll a creature's
attacks and saves straight from its stat block (pick targets, auto-apply
resistances, immunities, Magic Resistance and Evasion, edit and apply damage),
**cast spells from the stat block** (per-spell daily uses tracked, concentration
auto-set with a round timer), and track the full spread of monster resources —
recharge abilities, legendary actions, Legendary Resistance (in-lair counts), and
a per-round reaction. Run the initiative loop, manage HP/conditions/effects (with
source-relative durations) and concentration, roll group saves, and roll honest
dice with an effect-aware, clearable log. Players and quick NPCs are lightweight;
the SRD compendium and rollable spells are built in. **Accounts are live:** the app
runs fully anonymous in the browser, and signing up (free, email + password) saves
your in-progress fights and your **custom creatures** to the cloud and syncs them
across devices — build a custom Beholder once, add it to any encounter. Still to
come: a shared read-only player view and a saved party roster; content imports
remain a best-effort, later layer. The UI is functional but still evolving.

## Content & licensing

- **Code:** [AGPL-3.0](./LICENSE). A hosted/modified version must share its source.
- **Game content:** SRD 5.2 / 5.1 via [Open5e](https://open5e.com), under
  **CC-BY-4.0** — attribution to Wizards of the Coast is provided in-app and in
  [`CREDITS.md`](./CREDITS.md). All game content uses CC-BY-4.0; the OGL is not used.
  Some iconic monsters (Beholder, Mind Flayer, etc.) are excluded from the SRD by WotC
  and cannot be included; the custom-creature form and third-party content fill that
  gap, each honored under its own license.
- *Compatible with fifth edition. Not affiliated with or endorsed by Wizards of
  the Coast.*

## Contributing

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and our
[Code of Conduct](./CODE_OF_CONDUCT.md). The most important contribution guideline
is the principle above: keep OpenFray a scratchpad, not a character sheet.

## Supporting

OpenFray is free and ad-free. If it saves you time at the table and you'd like to
help cover hosting, donations are welcome (link TBD) — but the app stays fully
free regardless.
