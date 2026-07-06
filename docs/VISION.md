# Circuitle — vision

## The problem

Daily puzzle games (Wordle and its many descendants) are everywhere, but
almost none of them ask you to actually *reason* about a CS fundamental.
Most are word games, number games, or geography games wearing a shared-daily
-result costume. There's very little in the genre for someone who'd enjoy
being handed a real, small optimization problem and a deadline of "one
attempt worth bragging about per day."

Circuit minimization — reproducing a boolean function with the fewest logic
gates — is exactly that problem. It has genuine depth (De Morgan's laws,
gate-sharing, trading a NOT for an XNOR), a single objective number to
optimize (gate count), and a natural daily cadence (a new target function
each day). It's under-served as a casual game despite being a staple of
intro digital-logic coursework.

## Who it's for

People who liked (or teach, or are learning) digital logic / discrete math —
CS students, hobbyist EE folks, competitive-programming types, and anyone
who enjoys Wordle-adjacent daily rituals but wants one that rewards actual
reasoning instead of vocabulary. No prior circuits background is required
to *start* (the rules are just "wire gates to match this table"), but
mastery rewards real boolean-algebra intuition.

## The core idea

Every day, Circuitle deterministically picks a boolean truth table (3–4
input variables) from the UTC date, so every player is solving the exact
same puzzle. The player places logic gates (AND, OR, NOT, XOR, NAND, NOR,
XNOR) on a canvas board and wires them from the circuit's named inputs to a
single output. Circuitle simulates the resulting circuit against every row
of the target truth table live. Matching all rows means the puzzle is
*solved*; the score is simply how many gates it took — fewer is better,
golf-style. A precomputed "par" (gate count of a known-good minimal
solution) gives every result context, and a spoiler-free share string
(`Circuitle 2026-07-06 — 3 gates (+2)`) lets players compare without
revealing their circuit.

## Key design decisions

- **Deterministic daily puzzle, no backend.** The target truth table is
  derived from a hash of the UTC date (see `src/truthTable.ts`), so the
  whole game ships as a static site — no server, no accounts, no database.
- **Simulation is the source of truth, not a solver.** Circuitle never tells
  a player "the" optimal circuit; it only reports whether the player's
  circuit matches the table and how many gates it used. The reasoning is
  entirely the player's.
- **A small, fixed gate vocabulary.** Seven gate types (five two-input, one
  unary) is enough to reach genuinely different minimal solutions per
  puzzle while staying learnable in one sitting.
- **Golf scoring, not correctness scoring.** Once a circuit is correct,
  the *only* remaining axis is gate count — this keeps the loop simple
  (solve, then re-solve smaller) instead of splitting attention across
  multiple scoring dimensions.
- **Blueprint/technical visual identity.** The board reads as a real
  schematic — graph-paper grid, glowing signal traces — reinforcing that
  this is an engineering puzzle, not a cartoon game skin (see
  `docs/DESIGN.md`).

## What "v1 done" looks like

- A player can open the site, see today's target truth table, place and
  wire gates on the board, and get live pass/fail feedback per row.
- Solving (matching every row) triggers a win celebration showing gate
  count vs. par and a shareable, spoiler-free result string.
- The board, gate palette, and truth-table panel are fully usable on both
  desktop and phone with real interaction states and the game-feel/SFX
  described in `docs/DESIGN.md`.
- A small archive of past daily puzzles is reachable so a missed day isn't
  lost forever.
- Best score per day is remembered locally (no account system for v1).
- CI is green (lint, typecheck, unit tests, production build) and the site
  builds to a single static `dist/` directory deployable under any subpath.
