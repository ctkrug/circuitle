# Building Circuitle: a daily logic-gate puzzle, and the surprisingly hard part was "par"

I wanted a daily puzzle for people who think in boolean logic. Every Wordle
spinoff I could find was words, trivia, or geography, and none of them
scratched the itch of actually reasoning about a circuit. So I built
[Circuitle](https://apps.charliekrug.com/circuitle/): each day you get one
truth table, and you build a logic-gate circuit that reproduces it using the
fewest gates you can. It is a small TypeScript and Canvas app with no
backend. Here are the two decisions that took the most thought.

## Computing "par" is not depth-first BFS

Any working circuit solves the puzzle. The interesting score is how close you
get to the minimum number of gates the function actually needs. I wanted to
show that number ("par") so a solve means something, which meant I had to
compute it.

My first instinct was a breadth-first search: start from the input signals,
apply every gate to every pair, and count layers until you reach the target.
That is wrong, and it took a bug to see why. Layered BFS measures circuit
*depth*, not gate *count*. Two signals that each cost three gates to build
combine into something that costs seven gates (3 + 3 + 1), not four
(max(3, 3) + 1). Depth and size are different metrics, and par is size.

The fix was to treat each signal as the set of truth-table rows where it is
true, which is just a bitmask, and run a Dijkstra-style search over those
masks. A signal's cost is the total gates a real circuit needs to produce it.
Combining two signals costs `cost(a) + cost(b) + 1`. Dijkstra's invariant
does the heavy lifting: a mask is only ever combined with masks whose cost is
already finalized (provably minimal), and every unordered pair is combined
exactly once, when the later of the two settles. That gives a real lower
bound instead of an estimate, which is the whole point of showing par.

The two-input gates fold into six combiners over the masks. NAND, NOR, and
XNOR invert, so they get masked back down to the valid row range to avoid
picking up stray high bits from JavaScript's 32-bit bitwise operators. That
one detail caused a real off-by-a-lot bug before I caught it.

## Splitting pure logic from canvas glue

The other decision was structural. Everything that is a *rule* of the game
(the circuit model, the evaluator, the par search, scoring, the daily-table
generator, wiring validation, hit-testing geometry) lives in a pure layer
with no DOM references. A thin Canvas and DOM layer renders that state and
forwards events into it.

The payoff is testing. The pure layer is at 100% line coverage, and the parts
worth attacking (par, the board state machine, the daily table) get
property-based tests with fast-check rather than a handful of hand-picked
cases. For example: par is 0 if and only if some input column already matches
the output, for any random three-input table. Or: a random sequence of place,
move, connect, and remove operations never leaves a dangling reference to a
deleted gate. Those properties caught edge cases I would not have thought to
write by hand.

The canvas layer stays deliberately dumb, so it is verified by driving the
running app rather than by unit tests. It is the one place a bug is cheap:
worst case a wire draws in the wrong spot, not a wrong answer.

## What I would do differently

I would design the puzzle-archive feature in from the start instead of
bolting the daily seed on first. The date seeding is clean, but a "play past
days" view now has to reconstruct state I did not plan for.

Code and a live puzzle:
[github.com/ctkrug/circuitle](https://github.com/ctkrug/circuitle) and
[apps.charliekrug.com/circuitle](https://apps.charliekrug.com/circuitle/).
Feedback welcome, especially on the par search if you have done circuit
minimization properly.
