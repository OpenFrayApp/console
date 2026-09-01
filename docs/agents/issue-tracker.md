# Issue tracker: GitHub

Issues and specs for the combat console live in `OpenFrayApp/console` on GitHub. Use the `gh` CLI for all operations.

## Conventions

- Create: `gh issue create --repo OpenFrayApp/console --title "..." --body "..."`
- Read: `gh issue view <number> --repo OpenFrayApp/console --comments`
- List: `gh issue list --repo OpenFrayApp/console --state open`
- Comment: `gh issue comment <number> --repo OpenFrayApp/console --body "..."`
- Label: `gh issue edit <number> --repo OpenFrayApp/console --add-label "..."`
- Close: `gh issue close <number> --repo OpenFrayApp/console --comment "..."`

Infer the repository from the current clone when ownership is clear.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Skill operations

When a skill says “publish to the issue tracker,” create an issue in `OpenFrayApp/console`.

When a skill says “fetch the relevant ticket,” read the issue from `OpenFrayApp/console`.
