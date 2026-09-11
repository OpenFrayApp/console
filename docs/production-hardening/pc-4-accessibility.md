# PC-4 accessibility automation

The ordinary browser suite includes a focused Chromium accessibility journey. Run it with:

```bash
npm run test:accessibility
```

`npm test` also runs this journey through `test:browser`.

## Automated coverage

The journey checks these conditions through rendered controls and complete browser layout:

- keyboard operation for adding a combatant, starting the fight, and advancing the turn, including focus placement;
- a visible focus outline that remains inside the viewport;
- reflow at a 320 CSS pixel viewport;
- text resized to 200 percent;
- WCAG text-spacing overrides;
- a reduced visual height while a form field has focus;
- forced-colors operation and focus visibility;
- reduced-motion transition suppression;
- 44 CSS pixel targets for primary and repeated controls with a coarse pointer; and
- serious and critical findings from the axe-core rendered-page checker.

The component suite also checks keyboard arrow-key reordering as the alternative to dragging an initiative row.

## Compatibility floor

Core tasks use Baseline Widely available platform features. The shell keeps a percentage-height fallback before `dvh`, and runtime use of `ResizeObserver` already checks for support before observing. Shell media queries use the older `min-width` and `max-width` syntax supported by the console’s browser floor.

## Evidence limits

A passing run is partial automated evidence. It is not an accessibility conformance result or a browser-support claim. Chromium emulation cannot measure assistive-technology output, mobile browser chrome, a physical on-screen keyboard, touch accuracy, or Safari and Firefox interoperability. Those combinations remain manual checks for any separately scoped evaluation.
