# OpenFray writing style guide

How we write every word OpenFray publishes: the handbook (`docs/`), the marketing site
(`site/`), and the app's own interface copy (`src/`). Read this before writing or editing
copy anywhere in the repo. This guide is about words; the code style lives in
[`AGENTS.md`](./AGENTS.md).

One guide covers all three because the reader is the same person. The rules that differ by
surface are collected at the end, under [The handbook](#the-handbook-docs),
[The website](#the-website-site), and [In-app copy](#in-app-copy-src).

---

## The golden rule

> **We write for someone who is not technical, and who has never used OpenFray.**
> They need clear, complete, step-by-step instructions.

This is technical documentation. It is not a book, an essay, or a story about the app. Every
sentence exists to get a reader from "I don't know how to do this" to "done". If a sentence
does something else — sets a mood, admires the design, makes a joke — cut it.

Two working tests:

- **Could a first-time GM follow this page, alone, with the app open, and succeed?** If not,
  it needs more detail, not more polish.
- **Does the page still work with every image removed?** If not, the writing is doing too
  little. Images support the text; they never carry it.

## Voice

- **Plain and direct.** Middle-school reading level. Short words over long ones.
- **Second person.** "You" is the reader; "OpenFray" is the app. Never "we" for the app.
- **Present tense.** "OpenFray rolls the save," not "OpenFray will roll the save."
- **Active voice.** "Click **Begin** to start the fight," not "The fight is started by
  clicking **Begin**." The one exception is not blaming the reader: "The file didn't
  import," not "You imported the wrong file."
- **Neutral.** No marketing language, no superlatives, no self-praise. Describe what the app
  does; let the reader decide if it's good.
- **No narration.** Don't set scenes, don't address the reader's feelings, don't editorialize
  about the table, the pizza, or the rules argument.

Before and after:

| Don't                                                                        | Do                                                                                           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| "It's for the break, the rules argument, the pizza."                         | "Use **Pause** when the session stops for a break."                                          |
| "That's the deal with reminders: you get the memory, you keep the judgment." | "OpenFray shows the reminder. It doesn't apply any effect for you."                          |
| "This is the column you watch."                                              | "The tracker shows everyone in the fight, in initiative order."                              |
| "OpenFray helps you _run_ a spell without playing the rulebook at you."      | "Casting a spell rolls its dice, shows its card, and offers to add its effect to the board." |

Contractions are fine ("don't", "you'll") — they read naturally. Rhetorical questions,
asides, and em-dash flourishes usually are not; prefer a second sentence.

## What we document, and what we don't

- **Document the app.** What a button does, what a screen shows, what happens next.
- **Don't teach Dungeons and Dragons.** State a rule only when the reader needs it to understand what
  OpenFray is doing (for example, that a save-ends effect is rolled at the start or end of a
  turn). Never restate rules text, and never reproduce SRD content in the docs or on the site.
- **Don't document what doesn't exist.** If a feature is planned, either leave it out or mark
  it clearly with a `:::note[Coming later]` aside.
- **Keep it current.** OpenFray is in alpha. A UI change and its doc change belong in the same
  commit. A stale screenshot or a renamed button is a bug, not a cosmetic issue.

---

## Page structure

This section is written for handbook pages. It applies to any long-form page on the marketing
site too.

### One page, one task

Each page covers one job: running a fight, applying an effect, building a creature. If a page
starts covering two unrelated jobs, split it and link between them. Readers land mid-site from
search, so every page must stand on its own.

### Anatomy of a page

1. **Frontmatter `title`** — sentence case, short enough to fit the sidebar, and identical to
   the sidebar label in `astro.config.mjs`.
2. **Frontmatter `description`** — one sentence saying what the page covers. It is the search
   and social preview; write it for someone deciding whether to click.
3. **Introduction** — two to four sentences, before the first heading: what this page covers
   and when you'd need it. Never open with a heading.
4. **`##` sections** — one topic each, in the order a reader does the work.
5. **A "Where to next" list** at the end of tutorial-style pages, linking the natural follow-ons.

### Headings

- Sentence case: "Adding an effect", not "Adding An Effect".
- Descriptive, not generic. "Effects a saving throw ends" beats "Details" or "More".
- Never put a heading immediately after another heading. Every section gets at least one
  introductory sentence before any list, table, or image.
- `##` and `###` only. If you need `####`, the page probably needs splitting.

### Introduce everything

Every document, every section, and every list gets an introduction. A list dropped in without
a lead-in line tells the reader nothing about why it's there. One sentence is enough.

### Lists

- **Numbered** when order matters (steps). **Bulleted** when it doesn't.
- One action per step. Start with the verb: "Click **Begin**." "Type the damage."
- Say what happens after an action when it isn't obvious: "Click **Start combat**. You're in
  round 1, at the top of the list."
- Keep a procedure to about seven steps. Longer means it's two procedures.
- Full sentences in a list end with a period; fragments don't. Be consistent within one list.
- If a sentence is turning into three or more comma-separated items, make it a list.

### Tables

Use a table when the reader is choosing between options, or looking up a value. Two to three
columns. Keep cells to a phrase or a short sentence. Don't use a table for a procedure.

### Walls of text

Break up any paragraph longer than about five lines. Use a list, a table, a subheading, or a
second paragraph.

---

## Referring to the interface

- **Bold the exact label**: **Add creature**, **Roll saves**, **Apply effect**. Copy the
  capitalization from the app — don't "fix" it here.
- Bold is only for UI labels. Use italics for emphasis, sparingly.
- **Say where it is** the first time: "**Apply effect**, in the controls beside the stat
  block". A reader who can't find the button can't follow the step.
- Name icon-only controls by both icon and function: "the **campfire** (short rest)".
- Describe navigation as a path when it's more than one hop: "Open **Settings** (the gear at
  the top right), then tick the libraries your table uses."
- Don't describe screen positions that change on small screens without saying so.

---

## Words we use

Capitalization and naming are part of correctness. Get these right.

| Use                                 | Not                                                          |
| ----------------------------------- | ------------------------------------------------------------ |
| Game Master, GM                     | Dungeon Master, DM, DMG                                      |
| creature                            | monster, mob, enemy (as a noun for a stat block)             |
| player, player character            | NPC, PC (in prose — **Add PC** is a button label)            |
| hit points, armor class             | HP, AC (in prose — fine in a screenshot or table header)     |
| the console                         | the app, the tool, the tracker (for the whole thing)         |
| the tracker                         | the initiative list, the left column                         |
| the compendium                      | the library, the database                                    |
| the log                             | the roll log, the feed                                       |
| effect, condition, reminder         | buff, debuff, status                                         |
| fight                               | combat (in prose — "combat" is fine in **Start combat**)     |
| encounter                           | — the app's own noun; in prose, say "fight"                  |
| sign in, signed in, sign out        | log in, login, log out, register                             |
| DnD 5e (house short form)           | dnd (lowercase), a bare "5E" as a label                      |
| Dungeons and Dragons, DnD           | D&D, Dungeons & Dragons (only in "D&D Beyond" or legal text) |
| D&D Beyond                          | DDB, DnD Beyond                                              |
| Basic Rules 2024 / Basic Rules 2014 | 5.5e / 5e (badges use these; prose spells it out)            |
| libraries (the content collections) | rule sets, rulesets, sources                                 |

More:

- **The ampersand marks are Wizards of the Coast's, not ours.** Never write "D&D" or
  "Dungeons & Dragons" as our own term — spell it "DnD" or "Dungeons and Dragons". The
  ampersand form appears in only two places: the **D&D Beyond** product name (we're naming
  their product), and a copyright or legal statement that has to quote the trademark.
  Nowhere else — not in titles, prose, metadata, or keywords.
- **Edition names — write the ones readers search.** "DnD 5e" is the house short form,
  but "Dungeons and Dragons 5e", "5th edition", and the year forms ("DnD 2024", "Core
  Rules 2024", "2014 edition") are all correct and welcome — in page titles, descriptions,
  and metadata especially, and in prose wherever they read naturally. These are the words
  people type into a search box; match them. Don't lowercase to "dnd" or drop in a bare
  "5E" as a label.
- **The product is the combat console; "combat tracker" and "initiative tracker" are search
  synonyms.** "Combat console" is what the app and the site call OpenFray, so lead with it in
  titles and prominent copy. "Combat tracker" and "initiative tracker" are the phrases readers
  type into a search box — use them as synonyms in descriptions, metadata, and page
  introductions, not as the main label. Inside the console's own workings the precise nouns
  still hold: **the tracker** is the initiative list, and **the console** is the whole thing.
- **OpenFray** — one word, capital O and F. Never "Openfray", never "the OpenFray app".
- **American spelling** ("color", "canceled"), per Merriam-Webster. This is a deliberate
  exception to how the existing pages read; new and edited copy uses American spelling.
- **"Armor class"** stays lowercase in prose; the app's own label decides the capitalization
  inside bold UI references.
- Don't invent abbreviations. If the reader has to learn a term to read the sentence, spell it
  out (for example, "end of turn", never "EoT").
- We are not affiliated with Wizards of the Coast, and we never imply we are. Don't use WotC
  trademarks as our own, and keep any licensing statement to the wording already used in the
  app and `CREDITS.md`.

---

## Grammar and mechanics

House style follows the Chicago Manual of Style and Merriam-Webster. The rules that come up most:

- **Sentence case everywhere** — titles, headings, buttons, captions, list items.
- **Never all caps** unless the word or sentence is in all caps in the app's UI.
- **Serial comma.** "attacks, saves, and checks".
- **Numbers.** Spell out zero through nine in ordinary prose ("three buttons", "nine
  comments"). Always use numerals for game and interface values: round 1, 8 hours, DC 15,
  `2d6+3`, +5, 0 hit points, step 3. Spell out any number that starts a sentence.
- **Em dash** — spaced on both sides, not closed up against the words. At most one pair per
  paragraph, and prefer a period or a colon where one works.
- **Curly quotes** (“ ”) and apostrophes (‘ ’). Straight quotes only inside code.
- **Commas and periods go inside quotation marks**; colons and semicolons outside.
- **Parentheses**: the period goes outside, unless the whole sentence is inside them.
- **Phrasal verbs**: "sign in" (verb), "the sign-in screen" (modifier). "Set up" a campaign;
  the "setup" is the result.
- **Code formatting** for anything typed literally: `2d6+3`, `+5`, `-8`, `4d6kh3`, file names,
  JSON. Not for UI labels — those are bold.
- **Ampersands** are allowed in page titles and sidebar labels ("Effects & conditions") for
  width. Use "and" in prose.

---

## Screenshots and images

A screenshot in the right place saves paragraphs. A screenshot doing the explaining is a bug.

**Rules:**

- **Write the instruction in full first.** The image confirms; it never carries information
  that isn't in the text. Screen-reader users and search engines get the text only.
- **Place the image below the step it illustrates**, never above.
- **One process per image.** More than about three steps in a single screenshot means two
  images.
- **Crop to what matters**, plus enough surroundings for the reader to recognize where they
  are. Include the top bar or the sidebar in the first screenshot of a new area, so the reader
  can navigate to it.
- **Capture in the app's default dark theme**, at 2× (Retina), with no browser chrome.
- **Annotate in bright red** (`#E5484A`): outlines, arrows, and short labels.
  Number the annotations when the surrounding text is a numbered list, and make the
  numbers match.
- **Use sample data.** No real names, emails, or anything you'd have to blur.
- **Use the current build.** Re-shoot when the UI changes.

**Files:**

- Live in `docs/src/assets/screens/`, referenced by relative path from the page.
- Kebab-case names that describe the content: `roll-initiative.png`, `death-save-row.png`.
  Never `screenshot-2026-07-24.png`.
- Only committed captures a page actually uses. Delete the ones a rewrite orphans.

**Alt text:**

- One sentence of maximum 150 characters, describing what the image shows and what
  is highlighted: "The Apply effect box, with its duration, condition, modifier and
  reminder sections outlined in red and numbered one to four."
- Don't start with "Image of" or "Screenshot showing".
- Don't restate the paragraph above it.
- Decorative images don't belong in the docs at all — if it's decorative, delete it.

---

## Links

- **Descriptive link text.** Link the thing being linked to: "see
  [Campaigns & house rules]". Never "click [here]" or a bare "[read more]".
- **Internal links are absolute and end with a slash**, because the handbook is served under
  `/docs`: `/docs/concepts/effects/`, `/docs/getting-started/`. The console is `/console/`;
  the marketing site is `/`.
- **Anchors** are lowercase, hyphenated, and short. Don't repeat words already in the page
  path.
- **Link once per section**, on the first useful mention. Don't link the same page four times
  on one screen.
- **Link to the specific section** when the reader needs one part of a long page.
- **No redirects.** Link the final destination.

---

## Callouts

Starlight asides, in the handbook — use them for information that would otherwise interrupt
the flow. Always give a title in brackets. At most one per section, and never two in a row.

| Aside           | Use it for                                                            |
| --------------- | --------------------------------------------------------------------- |
| `:::note[…]`    | A fact worth stepping out of the flow for: a requirement, a limit.    |
| `:::tip[…]`     | A faster route the reader would otherwise miss.                       |
| `:::caution[…]` | Something that behaves differently than expected, or can't be undone. |
| `:::danger[…]`  | Data loss. Rare — deletion only.                                      |

Recurring ones to keep worded identically wherever they appear:

- `:::note[Needs an account]` — the feature requires signing in.
- `:::note[Coming later]` — planned, not built.

---

## Accessibility

- Text must convey everything, with images removed.
- One `<h1>` per page (Starlight generates it from `title`); headings never skip a level.
- Don't rely on color, position, or shape alone: "the red outline" is fine as a description,
  but the text must also name the button.
- Link text makes sense read on its own, out of context.
- Tables get a header row and no merged cells.
- Aim at WCAG 2.2 AA for anything we build by hand on the marketing site.

---

## The handbook (`docs/`)

The handbook is an [Astro Starlight](https://starlight.astro.build/) site, built separately
and merged into `dist/docs` by `scripts/assemble-site.mjs`. Run it with `npm run dev -w docs`
at <http://localhost:4322/docs/>. `npm run build` at the repo root builds all three parts, and
is the only check that proves the links between them resolve.

- **Pages** are Markdown in `docs/src/content/docs/`. The path is the URL.
- **The sidebar** is hand-ordered in `docs/astro.config.mjs`. A new page needs an entry there,
  with a label matching its `title`.
- **Screenshots** go in `docs/src/assets/screens/`.
- **The handbook explains; it never sells.** No calls to action beyond "open the console", no
  feature pitches, no comparisons with other tools.

---

## The website (`site/`)

The marketing site may persuade; the handbook may not. Everything else in this guide still
applies — same terminology, same sentence case, same plain language.

- One `<h1>` per page. A clear description in the layout's meta.
- Every screenshot needs alt text that describes the scene, not the feature name.
- No stacked superlatives, no fake urgency, no claims the app doesn't deliver today. The app
  is in alpha and the copy says so.
- Buttons and links say what happens: "Open the console", not "Get started".
- **Legal pages:** any edit to `site/src/pages/privacy.astro` or `terms.astro` must bump the
  `Last updated:` date in the same edit. Never change legal copy without it.

---

## Game content (libraries and books)

The creature libraries we write — _The Waking Garden_, _Brood & Bloom_ — and their print
editions are game text, not documentation. They follow the game's own house style rather
than the plain-instruction rules above.

**Lore is exempt** from the plain-instruction rules above, not from restraint — see
[Register](#register). A creature's `description`, and the flavor passages that open a
chapter, keep their authored voice. Everything else — chapter and section prose, encounter
write-ups, tables, and stat blocks — follows the rules below.

### Register

Game text has two registers, and the line between them is strict:

- **Rules text is neutral.** State what a thing is, what it does, and the numbers, in
  declarative sentences. No drama, no wit, no build-up.
- **State intent, not instruction.** Describe how a creature or rule is meant to behave —
  "the clutch exists to place latchlings, not to deal damage" — never how the Game Master
  must run it. No "the correct play is", "should be played as", "worth conveying". The
  Game Master runs everything as they wish.
- **End on information.** Don't close a section or a paragraph on an aphorism or a
  punchline. The last sentence carries a fact, like every other sentence.
- **Lore may carry color, sparingly.** Chapter openings and creature descriptions can have
  voice and an occasional light joke. Plain beats ornate; one image per passage is enough.
- **The book may say "we".** The authorial "we" ("in this book, we refer to them as
  diseases") is fine in game content; the [words table](#words-we-use) ban on "we" is for
  the app and its documentation.

A stat block may be followed by a **Running it** note. It states the creature's intended
behavior and its rule interactions, in the neutral register, and nothing else.

### Numbers and measurements

- **Numerals for anything the game measures**: points, scores, damage, challenge ratings,
  and any trait with a numeric value. "The spell deals 10 fire damage." "A creature with a
  Speed of 25 feet can't keep up."
- **Numerals for durations of a game effect**, and for distances that set the size or extent
  of one: "lasts for 1 round", "for the next 10 minutes", "a range of 30 feet", "extends 5
  feet beyond the doorway".
- **Numerals for tactical-scale dimensions**: "the room is 20 feet square", "60 feet by 40
  feet", "6 feet tall".
- **Spell out everything else**, including large-scale distance and time that isn't a game
  effect: "forty acres of stubble", "the two cities are fifty miles apart", "they wandered
  for three days".
- **Spell out the unit in prose.** "30 feet", not "30 ft." — `ft.` belongs to stat blocks
  and data fields (`Speed 30 ft.`), never to a sentence.
- **Use the real characters**: a true minus sign (−, U+2212) rather than a hyphen, × rather
  than the letter x, and ½ ¼ ⅓ ⅔ ¾ for fractions set against a numeral.
- **Say "half"**, not "one-half". Write "10 fire damage", not "10 points of fire damage".
- **Avoid weeks and months** for durations — the length of a week varies by world. Use days.

### Formatting game terms

The published guide dates from the 2014 rules, and no updated one exists for 2024. The
list below is what the 2024 rules actually do, measured across the SRD 5.2.1 text we ship
(330 creatures, ~190,000 characters): damage types, conditions, Hit Points, Speed, and
Advantage/Disadvantage are capitalized there without a single exception.

- **Capitalize** ability scores, Armor Class, Difficulty Class, Challenge Rating, skills,
  languages, planes, and the named traits and actions of a creature.
- **Capitalize, per the 2024 rules**: damage types (Fire damage, Piercing damage),
  conditions (Prone, Frightened, Restrained), Hit Points, Temporary Hit Points, Speed and
  its variants (Fly Speed), Advantage and Disadvantage, Difficult Terrain, Half Cover, and
  the area shapes (Cone, Emanation, Line, Sphere).
- **Only when it is the game term.** "A creature's Speed can't be reduced" takes the
  capital; "they cannot move at speed" is ordinary English and does not.
- Lowercase stays for the ordinary words: ability, attack roll, damage roll, round,
  saving throw in running prose, spell, cantrip, spell slot.
- This applies to game content only. The handbook, the marketing site, and the app keep
  the lowercase house forms in the [words table](#words-we-use) — "armor class" there.
- **Capitalize spell and magic item names**, with no italics, the way the SRD 5.2.1 text
  writes them: Lesser Restoration, Flame Tongue. The capitals mark the title, so a Wall of
  Fire spell produces a wall of fire. (The 2014 italic-lowercase style is retired.)
- **Inline subheads take a period, not a colon**, and are set in bold: **Terrain.** not
  **Terrain:**. A stat-block data field is different — that's a bold label and a value.
  In chapter prose they belong only to list items and Running it notes: a freestanding
  rule gets its own heading or a Note aside, never a bold-led paragraph.
- **Introduce every vertical list with a complete sentence ending in a colon.** Capitalize
  each item; punctuate items only when they are complete sentences.

### Wording

- You _make_ a saving throw — never "roll" one, which is redundant. Prefer "the target must
  make a saving throw" over "the target makes a saving throw".
- Don't confuse making a roll with succeeding on one: "succeed on a DC 15 Strength check".
- An attack _roll_ has advantage or disadvantage, not the attack.
- "Magic" is the adjective for an object with magical qualities (a magic item, a magic
  sword); "magical" for most other uses. Never "magical item".
- A creature's **hit point maximum**, not its "maximum hit points".
- Proficiency is _in_ a skill or language, and _with_ a tool, weapon, or armor.

### Where we deliberately differ

Two rules in the game's house style don't apply to us, and both are on purpose:

- **Game Master, never Dungeon Master.** That term is Wizards of the Coast's, and we don't
  use their marks as our own. This overrides the guide everywhere.
- **Singular "they" is fine.** The guide forbids it; we don't. Use it for a person whose
  gender is unknown or irrelevant, rather than "he or she".

---

## In-app copy (`src/`)

Every label, button, tooltip, empty state, confirmation, and error message in the console is
copy, and it is the copy the handbook quotes. Get it right here and the docs follow.

- **Sentence case labels**, matching the app's existing ones: **Add creature**, **Group save**,
  **Start combat**.
- **Buttons name the action, not the concept**: **Roll saves**, not **Saves**. A button that
  opens something says so: **Apply effect**.
- **Confirmations say what will happen and whether it can be undone.** "Remove every combatant
  and clear the game log?" beats "Are you sure?"
- **Errors say what happened, and what to do next.** Never blame the reader, never show a raw
  error code without a sentence around it.
- **Empty states tell the reader the next step**, not just that something is empty.
- **Keep it short.** A label is one to three words; a tooltip is one short sentence.
- **Renaming a label is a documentation change.** Update the handbook pages and re-shoot the
  screenshots that show it, in the same commit.

---

## Before you publish

- [ ] The page or screen covers one task, and its title says which.
- [ ] `title` and `description` are filled in; the sidebar label matches the title.
- [ ] The page opens with an introduction, and every section and list has a lead-in line.
- [ ] Steps are numbered, one action each, starting with a verb.
- [ ] Every UI label is bold and matches the app exactly.
- [ ] A first-time GM could follow it with the app open.
- [ ] It reads the same with every image removed.
- [ ] Screenshots are current, cropped, annotated in red, and have alt text.
- [ ] Links are descriptive, absolute, and resolve after `npm run build`.
- [ ] Terminology matches the table above — especially **Game Master**, never DM.
- [ ] Nothing describes a feature that doesn't exist yet.
- [ ] A changed app label is reflected in the handbook and its screenshots.
- [ ] `npm run format` is clean, and prose wraps at 90 columns.
