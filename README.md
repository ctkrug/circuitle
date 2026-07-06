# Circuitle

**▶ Live demo: [apps.charliekrug.com/circuitle](https://apps.charliekrug.com/circuitle/)**

[![CI](https://github.com/ctkrug/circuitle/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/circuitle/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A daily logic-gate puzzle. Every day you get one truth table; your job is to
build a circuit of AND / OR / NOT / XOR / NAND / NOR / XNOR gates that
reproduces it using **the fewest gates you can**. Think Wordle, except the
thing you are minimizing is boolean algebra instead of guesses.

The puzzle is the same for everyone (seeded by the UTC date), so your gate
count is directly comparable to a friend's, and shareable without spoiling
the circuit.

## Who it's for

Programmers, CS and EE students, and daily-puzzle players who think in
boolean logic and have already run through every word and geography Wordle
spinoff. If you know what a NAND gate does and you like a puzzle that makes
you reason instead of recall, this is built for you.

## Try it

Open the [live demo](https://apps.charliekrug.com/circuitle/), then:

1. Read today's **Target** table on the right. Each row is an input
   assignment (`A`, `B`, `C`) and the output it must produce.
2. Drag gates from the **Gates** dock onto the board, or place them from the
   keyboard.
3. Click a signal source (an input pin or a gate output) then a target (a
   gate input or the `OUT` sink) to wire them. The truth table re-evaluates
   live after every change, marking each row pass or fail.
4. Turn every row green to win. Your score is the gate count, measured
   against the puzzle's computed par.

Sample share output (spoiler-free, Wordle-style):

```
Circuitle 2026-07-06 — 4 gates (+1)
```

That reads "4 gates, one under par." Lower is better.

## Features

- **A fresh puzzle every day**, seeded by the UTC date, identical for every
  player so scores compare directly.
- **Live circuit simulation**: every row of the truth table shows pass or
  fail within a frame of any wiring change, with no separate "run" button.
- **Scoring against a real par**: par is the provably minimal gate count for
  that day's function, found by a Dijkstra-style search over the truth
  table (see `src/par.ts`), not a hand-waved estimate.
- **Full keyboard play**: place a gate, wire two pins, and delete a gate all
  work from the keyboard, and rejected connections (a cycle, an output wired
  to an output) are shown rather than silently dropped.
- **Game feel**: gates snap to the grid, wires pulse when connected, an
  invalid drop shakes, and a solve sends current traveling through the
  circuit before the result card appears.
- **Synthesized sound**: every action tone is generated in WebAudio (no
  audio files), with a mute toggle that persists across reloads.
- **Local best-score tracking** per day, no account required.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run coverage   # unit tests with a coverage report
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build to site/
```

The code splits into a pure-logic layer (the circuit model, evaluator, par
search, and scoring, fully unit tested) and a thin Canvas/DOM layer that
renders it. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the map,
[`docs/VISION.md`](docs/VISION.md) for the design rationale, and
[`docs/DESIGN.md`](docs/DESIGN.md) for the visual direction.

## Stack

- **TypeScript** for the circuit model, evaluator, and app logic
- **Canvas 2D** for board rendering and interaction
- **Vite** for the dev server and static production builds
- **Vitest** with **fast-check** for unit and property-based tests

Ships as a static, self-contained site. No backend required.

## License

MIT, see [`LICENSE`](LICENSE).

---

More of Charlie's projects → [apps.charliekrug.com](https://apps.charliekrug.com)
