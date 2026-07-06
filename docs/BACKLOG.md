# Circuitle — backlog

Epics and stories for the v1 build. Every story lists concrete, checkable
acceptance criteria — build runs implement to them, QA runs attack them.

## Epic 1 — Core solve loop (the wow moment)

- [x] **Place gates and wire them into a live-evaluated circuit** *(wow moment — first thing built)*
  - Dragging a gate from the palette onto the board places it; clicking two
    pins draws a wire between them.
  - Each truth-table row shows a live pass/fail indicator that updates
    within one frame of any wiring change (no manual "evaluate" button).
  - An invalid connection attempt (e.g. wiring a gate's output to itself,
    or two outputs together) is rejected with visible feedback, not a
    silent no-op or a thrown error.

- [x] **Detect a win and score it by gate count**
  - When every truth-table row passes, a win overlay appears showing the
    circuit's gate count and the puzzle's par.
  - Editing the circuit further (adding/removing a gate) after a win closes
    the win state until every row passes again — a win isn't "sticky."

- [x] **Wire the daily puzzle end-to-end into the UI**
  - The truth-table panel displays exactly the table
    `dailyTruthTable(todayIsoDate())` returns for the current UTC date.
  - Reloading the page on the same UTC date shows an identical table
    (verifies determinism survives a full page reload, not just in-memory).

## Epic 2 — Game feel & juice

- [x] **Gate placement and wire-connect feedback**
  - Releasing a dragged gate snap-settles it to the nearest grid point
    within 90ms.
  - An invalid drop triggers a two-cycle shake on the gate instead of
    accepting the drop.

- [x] **Synthesized SFX with a persistent mute toggle**
  - Placing a gate, connecting a wire, a row flipping to pass, and winning
    each play a distinct WebAudio-synthesized tone (no audio files).
  - Toggling mute silences all SFX immediately and the muted state
    survives a page reload (`localStorage`).

- [x] **Win celebration sequence**
  - On win, current visibly travels from inputs through every gate to the
    output before the result overlay appears.
  - The result overlay's text matches `formatShareText`'s output exactly.
  - With `prefers-reduced-motion` set, the travel/particle animation is
    replaced by an instant transition to the result overlay (no motion
    skipped state left broken).

- [x] **Design polish pass against docs/DESIGN.md**
  - The board, rail, and gate dock compose with no horizontal scroll or
    element overlap at 390px, 768px, and 1440px widths.
  - Every interactive control (buttons, gate palette items, mute toggle)
    has themed hover, focus-visible, active, and disabled states.

## Epic 3 — Par & scoring

- [x] **Compute par for every daily puzzle**
  - Each daily truth table has a precomputed or solved par gate count
    ≤ 8 for a 3-input table.
  - Par is never 0 for a puzzle (the degenerate all-true/all-false tables
    are already excluded by `dailyTruthTable`, so every par reflects a real
    minimal circuit).

- [x] **Shareable result summary**
  - Clicking "Share" on the win overlay copies `formatShareText`'s output
    to the clipboard.
  - A toast or inline confirmation appears after a successful copy.

- [x] **Local best-score tracking per day**
  - Solving a puzzle records the lowest gate count achieved for that date
    in `localStorage`.
  - Reloading the page on a date already solved shows the previously
    recorded best score instead of an empty board state.

## Epic 4 — Archive & robustness

- [ ] **Puzzle archive**
  - An archive view lists at least the last 30 UTC dates, each playable.
  - Selecting a past date loads that date's `dailyTruthTable` result onto
    the board.

- [x] **Designed empty/loading/error states**
  - A corrupt or missing `localStorage` value (e.g. malformed JSON) falls
    back to sane defaults instead of crashing the app on load.
  - An environment without canvas 2D support shows a designed fallback
    message rather than a blank page.

- [x] **Accessibility pass**
  - Every board action (place a gate, wire two pins, delete a gate) has a
    keyboard-operable equivalent, not just drag-and-drop.
  - All touch targets in the gate dock and header toolbar measure ≥44px.
