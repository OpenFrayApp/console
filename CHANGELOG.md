# Changelog

Every released version of OpenFray, newest first. Each entry says what changed for
someone running a fight, not what changed in the code. The commit history is the
record of that.

**This file covers the console only.** The marketing site, the handbook, the published
books, and the tooling that builds them are not OpenFray releases and do not belong
here, even when they ship in the same commit.

Versions are `major.minor.patch`. A major bump means the way you use the console
changed; a minor bump adds to it; a patch fixes it. Dates are the day the version was
published.

## 1.1.0 (2026-08-17)

The console runs on a phone, answers to the keyboard, and knows when an effect ends.

### On a phone and a tablet

- The console is three screens you swipe between on a phone — the tracker, the stat
  block, and the controls — with a bottom bar to jump straight to one. Tapping a
  creature in the tracker slides over to its stat block.
- Every control has a finger-sized target on a touch screen, and a mouse keeps the
  dense layout it had. Form fields lift to a size iOS Safari won't zoom the page for.
- A tablet held portrait gets the phone's layout whole, iPad Pro included. Held
  landscape, a small tablet puts the tracker beside the stat block with the controls and
  the log below; from a laptop's width up, the three-column console is unchanged.
- The header's panels open as sheets on a phone, and a button stays where it is while
  its panel is open. The three add buttons collapse into one.

### The keyboard

- The console can be run from the keyboard: turns and the fight, the selection, the
  selected creature's damage, effects, concentration and reaction, every add and open,
  the compendium, the dice bar, and the log.
- Every shortcut is rebindable in Settings, and the full list is a keystroke away.

### Effects

- An effect can be hung on a **turn**: start of turn or end of turn, on any creature on
  the board, not just the one you are applying to. "Charmed until the start of its next
  turn" is now something the box can say, and it clears itself at the right moment.
- **or its next roll** rides on top of any duration, ending the effect early on the
  first roll it changes. It replaces "This turn / next attack", which looked like a turn
  and wasn't, and which never cleared for a player's own rolls. The duration underneath
  is what ends it there. An effect saved with the old option still works, and reads as
  "Until removed" with the box ticked.
- The 1 round chip is gone; end of turn says what it meant, and Custom still counts
  rounds.
- A roll made anywhere in the console now spends what it should. Group saves,
  concentration checks and a creature's own stat-block rolls used to leave a spent
  effect sitting on the row.
- Vicious Mockery, Latchwork, Guiding Bolt, Guidance and Resistance carry the bound the
  rules give them, re-read against both editions — the end of a named creature's turn,
  or the spell's own minute — instead of waiting on a roll that might never come.

### Casting

- A spell resolved by an attack roll applies its effect. **Guiding Bolt** left nothing on
  the target it hit, and Flame Blade, Spiritual Weapon, Arcane Hand, Arcane Sword and
  Vampiric Touch left no reminder on the caster.
- The caster's name is on the modal whether a creature or a character is casting.
- A saved character's **spell attack bonus** and **spell save DC** are filled in from the
  class, level and ability scores you transcribed. A class that casts through a subclass,
  a multiclass caster, and an anonymous character all leave the field to you, as before.

### Smaller things

- A condition chip in a resolver reads as a state: lit when the target has it, and
  tapping a lit one clears it instead of stacking a second copy.
- A picker says what it just added.
- The compendium follows the same layout switch as the fight.

## 1.0.0 (2026-08-07)

Out of beta. The [beta](https://openfray.app/news/openfray-beta-release/) named one thing as still to come,
a read-only player view. This is it, along with a rebuilt effects flow and two more
libraries to run from.

### The player view

- A second screen your table can look at, on their own devices, at a link you share.
  It shows the turn order and the game log, and nothing you haven't given it.
- You choose what reaches it. Hide a creature from the table or reveal it early, keep
  its conditions to yourself, and let a creature fight for the party.
- Actions reach the shared log without their arithmetic: what a creature did and what
  its roll came to, not the dice behind it. Saves settle before they are shared.
- The fight's clocks, the damage dealt each way, and the end-of-fight summary go to the
  table too. The log starts fresh with each fight, and creatures stay off the view until
  the fight begins.
- Sharing survives a reload and ends when you close the tab. Links can be named.

### Effects

- An effect can now carry several parts (conditions, modifiers, reminders and counters),
  applied together as one named bundle, from a rebuilt **Apply effect** box.
- Modifiers can be scoped to particular abilities, so a roll that doesn't know its
  ability never picks one up. Bless and Bane are scoped to attacks and saves.
- An effect can be marked for the Game Master alone, so a count you keep stays off the
  table's screen.
- Effects reach a saved character's derived numbers: armor class, initiative, hit point
  maximum and Speed, which a modifier can halve, double, or drop to 0.
- Casting a spell lands all of its effects as one bundle named for the spell. Every
  spell in the table was re-read against the rules text of both editions.
- Exhaustion has a level, and lands from an attack or a saving throw.
- Save an effect you use often as a preset. The brood diseases ship as presets.

### Dice

- Rolling moved to [opendice](https://github.com/SirDarcanos/opendice), which rolls each
  die through a cryptographic generator and reports every die it rolled.
- An advantage roll shows both dice, a damage roll shows the dice behind its total, and
  every roll carries to its total with an arrow. A natural 1 is named a critical miss.
- Reroll anywhere the console rolls.
- A group saving throw applies each creature's defenses by damage type, and says what it
  rolled for whom.
- Recharge and escape rolls are the Game Master's alone.

### Libraries

- **Creature Codex** joins the opt-in libraries, with its own source line and its full
  attribution chain.
- **On Strong Waters and Potent Simples** is a new library, and the first with no
  creatures in it. It adds 11 castable spells and three effect presets: Intoxication,
  Craving, Addiction.
- **Brood & Bloom** gained its spells as a castable library, and the Hands of the Host.

## 0.2.0 (2026-07-31)

Out of alpha. [The post](https://openfray.app/news/openfray-beta-release/).

- Four more libraries: the 2014 rules, the three Tome of Beasts books, and two OpenFray
  writes itself, _The Waking Garden_ and _Brood & Bloom_.
- The 2024 creatures and spells are read from the official rules document rather than a
  third-party feed, fixing a long tail of wrong sizes, missing alignments and mangled
  casting times.
- The fight is rated before it starts and summarized after it ends: experience earned and
  what it works out to per player, rounds, real and in-game time, damage each way.
- The roll log became a game log. It records turns and rounds, conditions applied and
  cleared, concentration started and broken, damage, healing, knockouts and rests, kept
  for the whole fight, grouped by round, and filterable.
- Clocks while you fight, in real time with pauses excluded and in game time at 6
  seconds a round.
- Paste a creature as JSON, or take one from a stat block with the OpenFray Importer
  browser add-on.
- Conditions explain themselves wherever they appear, and counters tally what nothing
  counts for you.

## 0.1.0 (2026-06-23)

The first public build. [The post](https://openfray.app/news/openfray-is-in-alpha/).

The console ran a fight end to end in a browser tab, with no account and nothing
installed: initiative, timed effects that count themselves down, creature resources and
recharges, concentration, group saving throws, and dice with a log that shows its
working. It shipped with the 2024 rules, a stat-block editor for creatures and a card
editor for spells, a character roster, and campaigns carrying a table's house rules.
