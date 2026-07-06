# Circuitle — design direction

## 1. Aesthetic direction

**Circuitle is a blueprint/technical drafting board:** a deep-navy schematic
sheet with fine graph-paper gridlines, crisp white-on-blue linework, and
glowing cyan traces that light up as current flows through a correct
circuit — the feeling of working at a drafting table on a real engineering
drawing, not a toy.

This is a deliberate departure from "dark gray cards + one accent" — the
grid, the linework, and the trace-glow motion are load-bearing parts of the
identity, not decoration on top of a generic dark theme.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b1d33` | page background (blueprint navy) |
| `--surface-1` | `#122744` | panels, gate palette, cards |
| `--surface-2` | `#1a3660` | raised surfaces, hovered rows, modals |
| `--text` | `#eaf2ff` | primary text (linework white) |
| `--text-muted` | `#8fa8c9` | secondary/annotation text |
| `--accent` | `#ffb454` | primary accent — CTAs, active gate, score (warm copper, reads as "powered") |
| `--accent-support` | `#7dd3fc` | secondary accent — traces, links, focus rings (cyan, reads as "signal") |
| `--success` | `#4ade80` | truth-table row pass, valid connection |
| `--danger` | `#f87171` | truth-table row fail, invalid connection |
| `--grid-line` | `rgba(125, 211, 252, 0.08)` | background graph-paper grid |

**Type pairing:** display font **Space Grotesk** (geometric, technical) for
the wordmark and headings; UI font **IBM Plex Mono** for body text, labels,
and the truth-table readout — a monospace grid suits tabular boolean data
and reinforces the schematic feel. Both from Google Fonts, with
`system-ui`/`ui-monospace` fallbacks.

**Spacing:** 8px base unit — 8 / 16 / 24 / 32 / 48 / 64.

**Corner radius:** 6px on panels/cards, 4px on buttons and chips — crisp,
drafting-table edges, never pill-shaped.

**Shadow/glow:** no drop shadows on flat panels; depth comes from a layered
`box-shadow` glow in `--accent-support` around active/powered elements
(`0 0 0 1px rgba(125,211,252,.25), 0 0 24px rgba(125,211,252,.15)`), plus the
persistent low-opacity grid pattern as background texture everywhere.

**Motion:** UI transitions 150ms ease-out; game feedback (gate snap, wire
connect) 90ms ease-out; the win sequence's current-travel animation runs
slower and deliberate (~600ms per gate) so it reads as a celebration.

## 3. Layout intent

The **circuit board canvas is the hero**. Desktop (1440×900): board takes
the left ~65% of the viewport at full height; a right rail (~35%) stacks the
target truth table (top) and the gate palette/dock (bottom). Phone
(390×844): board is full-width and takes the top ~60% of the viewport, gate
palette becomes a horizontal scroll-snap dock pinned below it, and the
truth table collapses into an expandable drawer — the board never shrinks
to make room for chrome.

## 4. Signature detail

The wordmark's "i" dot in "Circuitle" is a small LED that pulses on a slow
2s breathing cycle (steady cyan glow, brightening/dimming) — a persistent
"this circuit is alive" heartbeat. The page background carries the
graph-paper grid at all times, faintly, so every screen (including empty
and error states) still reads as "on the drafting table."

## 5. The juice plan

- **Movement tween:** dragging a gate follows the pointer directly; on
  release it snap-settles to the nearest grid point over 90ms ease-out.
- **Impact feedback:** connecting a wire sends a single traveling pulse of
  light down it (90ms); dropping a gate somewhere invalid gives the gate a
  small red shake (2 cycles, 120ms) instead of accepting the drop.
- **Goal feedback:** each truth-table row that currently evaluates correctly
  gets a green check that pops in with a slight overshoot; a row flipping
  from fail to pass gets a brief highlight flash.
- **Win celebration:** once every row passes, current visibly flows from
  each input through every gate to the output in sequence (~600ms/gate),
  the whole board settles into a steady powered glow, a spark-particle
  burst plays at the output, and a result overlay shows the run's gate
  count vs. par with a "Share" CTA and a countdown to the next daily puzzle.
- **Synth SFX (WebAudio, generated in code — no audio files):**
  - gate placed: short square-wave blip (~80ms, 440–660Hz)
  - wire connected: quick filtered-noise tick
  - truth-table row passes: two-note ascending chime (major third)
  - invalid connection: low sawtooth buzz (~120ms)
  - full win: rising 4-note arpeggio followed by a soft sustained pad swell
  - all SFX at low default volume, rate-throttled (no overlapping spam),
    behind a header mute toggle whose state persists in `localStorage`;
    the `AudioContext` is created lazily on first user gesture and every
    call site guards for its absence (tests, unsupported environments).
- Respect `prefers-reduced-motion`: keep state changes (checks, glow) but
  drop the shake, particle burst, and current-travel animation in favor of
  an instant transition.
