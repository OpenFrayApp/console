# The labeling voice

How the console's own copy is written: every label, button, tooltip, empty state,
confirmation, and error message. Read the
[shared style core](https://github.com/OpenFrayApp/openfray/blob/main/STYLE.md)
first: the words table and the grammar live there.

In-app copy is the copy the handbook quotes. Get it right here and the docs follow;
change it here and the handbook page and its screenshots change in the same breath.

## The rules

- **Sentence case labels**, matching the app's existing ones: **Add creature**, **Group save**,
  **Start combat**.
- **Buttons name the action, not the concept**: **Roll saves**, not **Saves**. A button that
  opens something says so: **Apply effect**.
- **Confirmations say what will happen and whether it can be undone.** "Remove every combatant
  and clear the game log?" beats "Are you sure?"
- **Errors say what happened, and what to do next.** Never blame the reader: "The file
  didn't import," not "You imported the wrong file." Never show a raw error code without
  a sentence around it.
- **Empty states tell the reader the next step**, not just that something is empty.
- **Keep it short.** A label is one to three words; a tooltip is one short sentence.
- **No marketing in the app.** The console never pitches itself; the only voice inside
  it is the one that helps run the fight.
- **Renaming a label is a documentation change.** Update the handbook pages and re-shoot the
  screenshots that show it (both live in the docs repo), in the same change.

## Before you ship a string

- [ ] The label matches the words table (fight, creature, sign in, Game Master).
- [ ] A button says what pressing it does.
- [ ] A destructive action's confirmation names what is lost.
- [ ] The handbook still quotes the app word for word.
