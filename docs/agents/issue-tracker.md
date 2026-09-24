# Issue tracker: GitHub

Issues and specs for the combat console live in `OpenFrayApp/console` on GitHub. Use the `gh` CLI for all operations.

## Conventions

- Create: `gh issue create --repo OpenFrayApp/console --title "..." --body "..." --label "..."`
- Read: `gh issue view <number> --repo OpenFrayApp/console --comments`
- List: `gh issue list --repo OpenFrayApp/console --state open`
- Comment: `gh issue comment <number> --repo OpenFrayApp/console --body "..."`
- Label: `gh issue edit <number> --repo OpenFrayApp/console --add-label "..."`
- Close: `gh issue close <number> --repo OpenFrayApp/console --comment "..."`

Infer the repository from the current clone when ownership is clear.

## Label every new issue

Before creating an issue, read the shared
[triage labels](https://github.com/OpenFrayApp/openfray/blob/main/docs/agents/triage-labels.md)
(local workspace: `/Users/nico/GitHub/openfray/openfray-app/docs/agents/triage-labels.md`).
Then select labels:

1. Check available labels with `gh label list --repo OpenFrayApp/console`.
2. Choose a workflow label. Default to `needs-triage` unless the maintainer has established another status.
3. Add the applicable issue type, such as `enhancement` for a feature request or `bug` for a defect.
4. Add at most one release-impact label when the impact is clear. Leave uncertain impact for triage.
5. Follow the shared guide for product-area labels; console-owned issues usually need no `console` label.

Pass the selected labels to `gh issue create` using repeated `--label` flags.
For example, a backward-compatible feature awaiting triage gets `enhancement`, `minor`, and `needs-triage`.

Before reporting completion, verify the labels with
`gh issue view <number> --repo OpenFrayApp/console --json labels,url`.
Issue creation is complete when the issue exists and its labels match the selected classification.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Skill operations

When a skill says “publish to the issue tracker,” create an issue in `OpenFrayApp/console`.

When a skill says “fetch the relevant ticket,” read the issue from `OpenFrayApp/console`.
