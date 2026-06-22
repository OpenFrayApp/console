# Contributing to OpenFray

Thanks for wanting to help. OpenFray is a community project, and contributions —
code, bug reports, ideas, docs — are genuinely welcome.

Before anything else, please read the one rule that matters most.

## The scope rule (read this first)

**OpenFray is a fast scratchpad for combat, not a system of record.**
It tracks what happens at the table — plus the reference a DM jots (a PC's stats,
defenses, and character notes) — never the *rules engine* behind a character.

Every contribution is measured against one question:

> **Does it require knowing a player character's build? If yes, it's out of scope.**

This keeps the app fast, simple, and maintainable by a small community. It is not
a temporary limitation — it's the core design. Things that are **out of scope**
because they cross this line:

- Knowing a PC's class, level, subclass, or feature list
- Tracking PC spell slots, resources, or abilities (that's their sheet / D&D Beyond)
- Auto-applying what a class feature *does* (we model the *result* it leaves on the
  board, not the feature)
- Anything that turns OpenFray into a character manager or a VTT

If a feature you want seems to need any of the above, open an issue to discuss
*before* building — there's almost always a scratchpad-shaped version of the idea
that fits (model the consequence, not the cause). We'd rather talk it through than
have you build something we can't merge.

### The other load-bearing principles

These come from the same spirit; please keep them intact:

- **Effects model results, not causes.** Conditions, advantage, disadvantage, flat
  modifiers, reminders, save-ends — those ~6 shapes cover all of 5e. Don't add
  per-class-feature logic; add to the general Effect system if needed.
- **Local-first.** The UI mutates in-memory state and feels instant; persistence is
  a background effect, never a gatekeeper the UI reads through. Don't put a network
  round-trip in front of a dice roll or a condition toggle.
- **Snapshot, don't reference.** Creatures entering combat are copied; editing a
  library template must never mutate a fight in progress.
- **Dice are honestly random.** CSPRNG + modulo-bias rejection. Never add
  "anti-streak" or "feels-fair" tampering — uniform and transparent, always.
- **Don't become a character sheet.** (Yes, it's worth saying twice.)

## How to contribute

1. **Open an issue first** for anything beyond a small fix — especially features, so
   we can sanity-check scope together before you spend time.
2. **Fork, branch, build.** Branch names like `feat/mass-save` or `fix/turn-order`.
3. **Keep PRs focused.** One concern per PR; easier to review, faster to merge.
4. **Match the stack.** TypeScript, the existing patterns, and the principles above.
5. **Sign your commits (DCO).** Use `git commit -s`, which adds a `Signed-off-by:`
   line certifying you have the right to submit the code under the project's
   license.

## Reporting bugs

Open an issue with: what you did, what you expected, what happened, and your
device/browser. A screenshot of the combat state helps a lot for tracker bugs.

## Suggesting features

Open an issue describing the *table problem* you're trying to solve, not just the
solution. "I keep forgetting X mid-combat" tells us more than "add a button for X,"
and it helps us find the scratchpad-shaped version that fits.

## Licensing of contributions

OpenFray is licensed under **AGPL-3.0**. By contributing, you agree your
contributions are licensed under the same terms. The DCO sign-off (`-s`) on your
commits is how you certify this.

## Questions

Open an issue or a discussion. Be kind, assume good faith — see the
[Code of Conduct](./CODE_OF_CONDUCT.md).
