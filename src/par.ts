import type { TruthTable } from "./types";

/**
 * Combines two row-bitmask signals the way each two-input gate would. `NAND`
 * / `NOR` / `XNOR` invert within `fullMask` so results stay a valid row set
 * rather than picking up stray high bits from JS's 32-bit bitwise ops.
 */
function makeCombiners(fullMask: number): Array<(a: number, b: number) => number> {
  return [
    (a, b) => a & b,
    (a, b) => a | b,
    (a, b) => (a ^ b) & fullMask,
    (a, b) => ~(a & b) & fullMask,
    (a, b) => ~(a | b) & fullMask,
    (a, b) => ~(a ^ b) & fullMask,
  ];
}

/**
 * Computes "par": the minimum number of gates needed to reproduce `table`,
 * treating each signal as the set of rows where it's true (a bitmask) and
 * searching for the cheapest way to build the target bitmask from the input
 * bitmasks.
 *
 * This is a Dijkstra-style search, not a depth-layered BFS: a signal's cost
 * is the total number of gates a real circuit needs to produce it, and
 * combining two signals costs `cost(a) + cost(b) + 1` (both sides may need
 * their own, non-shared gates) rather than `max(cost(a), cost(b)) + 1`. The
 * latter would compute circuit *depth*, not gate *count*, and can silently
 * under-report an unreachable par. Correctness relies on the standard
 * Dijkstra invariant: a mask is only combined with masks that are already
 * finalized (so their cost is provably minimal), and every unordered pair is
 * combined exactly once, when the later of the two finalizes.
 */
export function computePar(table: TruthTable, maxGates = 10): number {
  const rowCount = table.rows.length;
  const fullMask = (1 << rowCount) - 1;
  const targetMask = table.rows.reduce((acc, row, i) => (row.output ? acc | (1 << i) : acc), 0);

  const inputMasks = table.inputNames.map((_, idx) =>
    table.rows.reduce((acc, row, i) => (row.inputs[idx] ? acc | (1 << i) : acc), 0),
  );

  const finalized = new Map<number, number>();
  const tentative = new Map<number, number>();
  for (const mask of inputMasks) {
    tentative.set(mask, Math.min(tentative.get(mask) ?? Infinity, 0));
  }

  const combiners = makeCombiners(fullMask);

  function relax(mask: number, cost: number): void {
    if (finalized.has(mask)) return;
    if (cost < (tentative.get(mask) ?? Infinity)) tentative.set(mask, cost);
  }

  while (tentative.size > 0) {
    let bestMask = -1;
    let bestCost = Infinity;
    for (const [mask, cost] of tentative) {
      if (cost < bestCost) {
        bestCost = cost;
        bestMask = mask;
      }
    }
    tentative.delete(bestMask);

    if (bestCost > maxGates) break;
    finalized.set(bestMask, bestCost);
    if (bestMask === targetMask) return bestCost;

    relax(~bestMask & fullMask, bestCost + 1);
    for (const [otherMask, otherCost] of finalized) {
      for (const combine of combiners) {
        relax(combine(bestMask, otherMask), bestCost + otherCost + 1);
      }
    }
  }

  return finalized.get(targetMask) ?? maxGates;
}
