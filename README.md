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

## Planned features

- Daily puzzle with deterministic (date-seeded) truth tables
- Drag-and-drop gate placement and wiring on an HTML canvas
- Live circuit simulation with per-row pass/fail feedback
- Gate-count scoring against a computed par (a known-good minimal solution)
- Shareable result summary (gate count + attempts, no spoilers)
- Puzzle archive for past days
- Local best-score tracking (no account required)

## Stack

- **TypeScript** for the circuit model, evaluator, and app logic
- **Canvas 2D** for the circuit board rendering and interaction
- **Vite** for dev server and static production builds
- **Vitest** for unit tests

Ships as a static, self-contained site — no backend required.

## Status

Early scaffold. See [`docs/VISION.md`](docs/VISION.md) for the full design
and [`docs/BACKLOG.md`](docs/BACKLOG.md) for the build plan.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run build      # production build to dist/
```

## License

MIT — see [`LICENSE`](LICENSE).
