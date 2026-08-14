# OpenFray console

The combat console served at [openfray.app/console](https://openfray.app/console/):
a fast, browser-based tracker for Game Masters running D&D 5e. It tracks initiative,
monster resources, conditions, concentration, group saves, and dice, and it works
without an account.

This repo is one part of OpenFray. The website and the handbook live in their own
repos, and [openfray.app](https://github.com/OpenFrayApp/openfray.app) ties the three
together into the single deploy that serves the domain. This repo works on its
own: clone it, install, and run.

## Running it

```bash
npm install
npm run dev
```

`npm test` runs the Vitest suite. `npm run build` type-checks and builds the app
into `dist/console` with `/console/` as its base path; the parent repo's assembly
step copies that into the deployed site.

## Before contributing

Read [AGENTS.md](./AGENTS.md). The one-line version: OpenFray is a fast scratchpad,
not a system of record, and every change is measured against that.

## License

[AGPL-3.0-or-later](./LICENSE). Game content attribution lives in
[CREDITS.md](./CREDITS.md).
