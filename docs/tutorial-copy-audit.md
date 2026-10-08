# Tutorial copy audit

Scope: [#107](https://github.com/OpenFrayApp/console/issues/107), following the numbered combat story in PR #104.

The in-app instructions remain in `src/tutorial/TutorialSetup.tsx`. This audit records wording decisions for contributors, not a handbook walkthrough.

## Writing contract

Use the console’s labeling voice. Name the acting combatant, the next control, and the consequence needed for that action.
Keep existing control labels and numbered headings. Preserve real outcomes, progression, initiative presets, hint placement, and confetti.

## Proposed wording

The table lists wording decisions in story order:

| Surface                 | Decision and proposed wording                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step 1, anonymous       | Keep the heading. Use “Choose Add PC” and identify Max HP, AC, and Add.                                                                                         |
| Step 1, signed-in entry | Keep the heading. Name “Create a character…” exactly; say existing roster characters stay untouched.                                                            |
| Step 1, roster creation | Keep the heading. Name Create character and the final Create PC action; retain the roster-retention promise.                                                    |
| Step 1, roster addition | Keep the heading and Add to encounter instruction; explain the board copy.                                                                                      |
| Step 2, ally            | Keep the heading. Name Quick add, Max HP, AC, Side → Friend, and Add.                                                                                           |
| Steps 3–4, opponents    | Keep the headings. Retain the Mage and its Ogre companion and the same selected Basic Rules library.                                                            |
| Step 5, Begin           | Keep the heading. Explain that Begin opens initiative; preserve player → Ogre → Mage → ally.                                                                    |
| Step 5, initiative      | Keep the heading. State player 20, Ogre 18, Mage 16, and ally 14 as practice values; retain normal rolls.                                                       |
| Step 6, player damage   | Keep the heading. Retain 3 damage rolled at the table and the Ogre’s hit-points input, -3, and Enter.                                                           |
| Step 7, Ogre turn       | Keep the heading. Use “Your player character’s hit is recorded” and Next turn.                                                                                  |
| Step 8, Javelin         | Keep the heading. Name target, Roll attack, Apply to the player character on a hit, and Close on a miss.                                                        |
| Step 9, Prone           | Keep the heading and rubble story. Preserve actual hit, critical-hit, miss, damage, and downed-character messages.                                              |
| Step 10, Mage turn      | Keep the heading. State that the Ogre is Prone, then name Next turn and the Mage.                                                                               |
| Step 11, Fireball       | Keep the heading and friendly fire. Name Cast, the ally and Ogre, Roll saves, Save or Fail, and Apply damage.                                                   |
| Step 12, advance        | Keep the heading. Use “Choose Next turn to advance the turn marker.” Keep the Mage’s resolved Fireball as context; remove unconditional death-save explanation. |
| Step 12, death save     | Keep the heading. Explain the unconscious ally only on this route; retain Save, Fail, Roll death save, and real consequences.                                   |
| Step 13, end fight      | Keep both headings. Use Stop to end the fight and open Combat recap; explain Pause without implying cleanup.                                                    |
| Recap                   | Keep the heading. Replace “return to the lesson” with “return to the tutorial”; retain board and log.                                                           |
| All foes down           | Keep the heading. Retain Keep fighting and End combat choices and committed results.                                                                            |
| Step 14, cleanup        | Keep the heading and exact trash-control label. Explain confirmation, Cancel, retry, Exit, and roster retention.                                                |
| Complete                | Keep the heading and cleared-board statement. Name Start tutorial for replay and make Sign in optional.                                                         |

## Entry and lifecycle promises

Keep the five-minute estimate, invitation preference labels, Exit choices, and prerequisite headings.
The welcome should name setup, damage, and turns, and state that exiting keeps the board and log.
Exit should retain its invitation question and explain board retention, stopping a running fight, and clearing before replay.
Completion should distinguish a retained signed-in roster character from the cleared board copy.
Keep the unavailable-sign-in explanation and provider-page cleared-board message. Neither promises anonymous practice data will survive OAuth.
Keep prerequisite instructions for identity/recovery, a nonempty board, and missing Basic Rules libraries.

## Design boundaries

No mechanics changes are proposed. Concentration is absent from this story and needs no instruction.
The existing death-save route remains state-driven; this revision does not broaden its prerequisites or hide actual outcomes.
The general turn step also appears after an ally’s death save. Explain advancing the marker without claiming the Mage is still active or predicting survival.
No unresolved wording choice requires a mechanics change. Existing labels remain unchanged, so no handbook label or screenshot update is needed.
