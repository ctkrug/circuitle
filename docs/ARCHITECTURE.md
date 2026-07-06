# Circuitle — architecture

A map of the codebase for whoever (or whichever future session) picks this
up next. Read `docs/VISION.md` first for *why*; this is *how*.

## Layers

The code is deliberately split into a pure-logic layer (no DOM, fully unit
tested) and a thin browser-glue layer (DOM/canvas, not unit-tested here —
verified by driving the running app instead). Almost every rule of the game
lives in the pure layer; the glue layer just renders it and forwards events.

```
src/
  types.ts        Gate/Circuit/TruthTable/SignalRef shapes — the vocabulary
                  every other module speaks.
  rng.ts          Deterministic PRNG (mulberry32) + string hash (FNV-1a).
  truthTable.ts   Picks the day's target truth table from the UTC date.
                  Excludes degenerate outputs: constant, or an exact copy
                  of one input (which would make par == 0).
  evaluator.ts    Evaluates a fully-wired Circuit against an input
                  assignment; detects cycles and unknown refs.
  scorer.ts       Turns a gate count + par into a Score and a spoiler-free
                  share string.
  par.ts          Computes par: the minimum gate count for a truth table.
                  A Dijkstra-style search over row-bitmask signals — see
                  its docstring for why a simpler depth-layered BFS is
                  actually wrong (it computes circuit *depth*, not *size*).

  boardState.ts   BoardState: the player's in-progress, possibly-unwired
                  circuit (placed gates + a nullable output). connect/
                  disconnect/removeGate enforce the wiring rules (no
                  self-loops, no cycles) before they ever reach the
                  evaluator. toCircuit() converts to an evaluable Circuit,
                  or null if anything is still unwired.
  wiring.ts       Resolves two clicked pins (in either order) into a single
                  boardState.connect() call, rejecting output-output and
                  input-input pairs.
  layout.ts       Pure geometry: where a gate's pins sit on screen, hit-
                  testing a point against pins/gate bodies, and resolving
                  any PinId or SignalRef back to a screen position. Both
                  the renderer and the interaction layer read from here so
                  they can never disagree about where a pin is.
  easing.ts       easeOutCubic/lerp/snapToGrid — shared by the drag-snap
                  and win-travel animations.
  bestScore.ts    Parse/record/serialize the localStorage best-score blob,
                  with a malformed-data fallback to `{}`.
  audio.ts        Synthesized WebAudio SFX (place/connect/pass/win) behind
                  a Synth interface with an injected AudioContext
                  constructor, so it's mockable in tests and degrades to a
                  silent no-op where WebAudio is unavailable.

  board.ts        BoardRenderer: draws the grid, wires, gates, and pins
                  from a BoardState onto <canvas>, and drives three short
                  canvas-only animations (invalid-drop shake, wire-connect
                  pulse, drag-release snap) via a continuous rAF loop that
                  respects prefers-reduced-motion.
  game.ts         GameController: owns the live BoardState and every DOM
                  event handler — palette drag/keyboard placement, pin-
                  click wiring, gate drag-to-move, delete/escape, live
                  evaluation, the win overlay and its topological
                  "current travels through the circuit" celebration,
                  share-to-clipboard, and mute/best-score persistence.
  main.ts         Bootstrap only: looks up DOM elements, falls back to a
                  designed message if canvas 2D is unavailable, and hands
                  off to GameController.
```

## Data flow (one interaction, end to end)

1. Player clicks a pin → `GameController` hit-tests via `layout.hitTestPin`.
2. A second pin click → `wiring.connectPins` classifies both pins and calls
   `boardState.connect`, which validates and returns a new `BoardState` or an
   error.
3. On success, `GameController.commitState` swaps in the new `BoardState`,
   hands it to `BoardRenderer.setState`, and calls `evaluateAndUpdate`.
4. `evaluateAndUpdate` calls `boardState.toCircuit` (null if anything is
   still unwired) and, if non-null, `evaluator.evaluateCircuit` per truth
   table row. Results drive the live pass/fail table, a `pass` SFX on any
   row's fail→pass transition, and win detection.
5. A fresh win (not sticky — re-armed the instant a row goes back to fail)
   records the best score, plays the `win` SFX, runs the topological
   current-travel celebration, then shows the win overlay with
   `scorer.scoreCircuit` and `scorer.formatShareText`.

## Why par is a search, not a formula

`par.ts` treats each signal (input, or any gate's output) as a bitmask over
truth-table rows. Combining two signals costs `cost(a) + cost(b) + 1`, so a
mask is only relaxed from *already-finalized* (provably minimal) masks —
standard Dijkstra, generalized to hyperedges. This matters because a
simpler "BFS by depth layer" approach looks equivalent but actually computes
circuit *depth* (longest dependency chain), not gate *count*, and can
under-report par whenever the minimal circuit needs two gates that don't
share any sub-structure. `test/par.test.ts` has a worked example.

## Running it

```bash
npm install
npm run dev         # local dev server
npm test            # unit tests (vitest, environment: node — no DOM)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # production build to dist/ (static, base-path relative)
```

Everything under `boardState.ts`/`wiring.ts`/`layout.ts`/`par.ts`/
`bestScore.ts`/`audio.ts`/`easing.ts`/`evaluator.ts`/`scorer.ts`/
`truthTable.ts`/`rng.ts` is unit tested. `board.ts`/`game.ts`/`main.ts` are
DOM/canvas glue verified by running the app in a real browser (Playwright)
rather than by unit test, since vitest here runs in a DOM-less `node`
environment.
