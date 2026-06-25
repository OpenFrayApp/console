# OpenFray

**A free, open-source DnD 5e combat tracker for Game Masters.**

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

It tracks what's *happening in the fight* and the reference a GM keeps on hand —
never the *rules engine* behind a character. The player's sheet / D&D Beyond owns
what a character *can do* and works out the numbers; OpenFray owns what
*just happened*, what must be *remembered* this round, and the notes a GM jots to
run the table. This line is deliberate, and it's the reason the app stays fast and
simple instead of becoming a worse copy of a VTT.

The test for any feature, contribution, or idea:

> **Does it require knowing a player character's build? If yes, it's out of scope.**

"Knowing the build" means the app having to *model, derive from, or run* class,
level, features, or spells — not the descriptive facts a GM chooses to type in.
This isn't a limitation to work around — it's the design. A few of its
consequences, so the spirit is clear:

- **A PC holds what the GM wants to remember, not a rules engine.** Beyond AC, HP,
  and conditions, a PC can carry the reference a GM finds handy at the table —
  ability scores, senses, speed, defenses, an initiative modifier — plus character
  context like race, alignment, faith, personality traits, ideals, bonds, flaws, a
  backstory, and private GM notes. It's all the GM's call what to jot. A **Quick add**
  is the bare minimum — name, HP, AC — for a throwaway NPC or a creature dropped in
  mid-fight. What OpenFray won't do is *run* the character: no class, level, spell
  slots, or feature logic, and it never derives or auto-applies what a PC can do.
  The GM transcribes; the sheet still owns the mechanics.
- **Effects model the *result*, not the cause.** There are only ~6 shapes of
  consequence in all of 5e (a condition, advantage, disadvantage, a flat modifier,
  a reminder, a save-ends effect). We model those six. We never model the hundreds
  of class features that produce them — the GM transcribes the outcome, the app
  reminds.
- **Combat is local-first.** State lives in the browser and feels instant;
  persistence happens quietly in the background. The app never makes you wait on
  the network to roll a die or tick a condition.
- **Creatures in combat are snapshots, not references.** Editing a monster in your
  library never mutates a fight in progress.

If you're contributing and a change starts to feel like the app needs to *model or
run* a character's build — class features, spell mechanics, leveling — that's the
signal to stop and rethink, not to add the field. Storing a fact the GM types is
fine; computing what a character can do is not.

## Status

🧪 **Alpha — publicly testing at [openfray.app/console](https://openfray.app/console).**

The single-GM combat console is up and running: initiative, monster resources,
conditions/effects, concentration, group saves, and honest dice with a clear roll log,
plus an **end-of-combat recap** (XP, timing, and standout hits), the built-in SRD
compendium (**Core Rules 2024 and opt-in 2014 + Tome of Beasts libraries**), custom
creatures and spells, JSON creature import, a durable **Characters** roster, and
**campaigns** with house rules. It runs fully anonymous in the browser, or sign in (free,
with **Discord or Google**) to save your fights and custom content to the cloud across
devices. Still to come: a shared read-only player view. Expect rough edges — it's alpha.

## Content & licensing

- **Code:** [AGPL-3.0](./LICENSE). A hosted/modified version must share its source.
- **Game content:** SRD 5.2.1 (Core Rules 2024) from WotC's official CC-BY PDF and SRD
  5.1 (Core Rules 2014) via [dnd5eapi.co](https://www.dnd5eapi.co), both under
  **CC-BY-4.0** — attribution to Wizards of the Coast is provided in-app and in
  [`CREDITS.md`](./CREDITS.md). Each source is honored under its own license, preferring
  CC-BY > ORC > OGL; third-party content — **Tome of Beasts 1–3 (Kobold Press)**, opt-in
  libraries — is used under its actual license (OGL 1.0a), never assumed CC-BY. Anyone
  picks which libraries appear (the **Settings** panel; 5.2 by default). Some iconic
  monsters (Beholder, Mind Flayer, etc.) are excluded from the SRD by WotC and cannot be
  included; the custom-creature form, JSON import, and third-party content fill that gap.
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
