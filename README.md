# Circuitle

A daily puzzle for people who like logic: you're given a truth table, and your
job is to build a circuit of logic gates that reproduces it — in as **few
gates as possible**. Think Wordle, but the thing you're minimizing is boolean
algebra instead of guesses.

Every circuit you can build is scored by its gate count. The daily puzzle is
the same for everyone (deterministic by date), so your score is directly
comparable to a friend's — and shareable, Wordle-style, without spoiling the
answer.

## Why

Circuit minimization is one of the genuine "aha" ideas in computer science:
the same truth table can be implemented by wildly different circuits, and
finding the smallest one takes real reasoning about De Morgan's laws,
sharing sub-expressions, and trading gate types against each other. Most
"logic puzzle" games skin over this; Circuitle makes the minimization itself
the game.

## How it works

1. Each day has a deterministic seed (based on the UTC date) that picks a
   target truth table — 3 or 4 input variables, a boolean function to match.
2. You place gates (`AND`, `OR`, `NOT`, `XOR`, `NAND`, `NOR`, `XNOR`) on a
   canvas and wire them from the inputs to a single output.
3. Circuitle simulates your circuit against every row of the truth table.
   Match every row and you've solved it — your score is the gate count.
4. Share your result: gate count vs. par, without revealing your circuit.

## Features

- Daily puzzle with deterministic (date-seeded) truth tables
- Every board action — place a gate, wire two pins, delete a gate — works
  by drag-and-drop/click or entirely from the keyboard, with rejected
  connections shown, not silently ignored
- Live circuit simulation with per-row pass/fail feedback
- Gate-count scoring against a computed, provably-minimal par
- A win celebration (current travels through the circuit), synthesized
  WebAudio SFX with a persistent mute toggle, and a shareable result
  summary copied to the clipboard (gate count vs. par, no spoilers)
- Local best-score tracking per day (no account required)

## Planned

- Puzzle archive for past days

## Stack

- **TypeScript** for the circuit model, evaluator, and app logic
- **Canvas 2D** for the circuit board rendering and interaction
- **Vite** for dev server and static production builds
- **Vitest** for unit tests

Ships as a static, self-contained site — no backend required.

## Status

The core solve loop is playable end-to-end: place gates, wire them, watch
the truth table update live, and win. See [`docs/VISION.md`](docs/VISION.md)
for the full design, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how
the code is organized, and [`docs/BACKLOG.md`](docs/BACKLOG.md) for what's
left.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run coverage   # unit tests with a line-coverage report
npm run build      # production build to dist/
```

## License

MIT — see [`LICENSE`](LICENSE).
