import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildTruthTable, dailyTruthTable, enumerateInputs } from "../src/truthTable";
import { computePar } from "../src/par";

function tableFromFn(inputCount: number, fn: (bits: boolean[]) => boolean) {
  const assignments = enumerateInputs(inputCount);
  return buildTruthTable(inputCount, assignments.map(fn));
}

describe("computePar", () => {
  it("is 0 when the output is exactly one input (no gate needed)", () => {
    const table = tableFromFn(3, (b) => b[0]!);
    expect(computePar(table)).toBe(0);
  });

  it("is 1 for a single NOT of an input", () => {
    const table = tableFromFn(3, (b) => !b[0]!);
    expect(computePar(table)).toBe(1);
  });

  it("is 1 for a two-input AND that ignores the third variable", () => {
    const table = tableFromFn(3, (b) => b[0]! && b[1]!);
    expect(computePar(table)).toBe(1);
  });

  it("is 1 for a two-input XOR that ignores the third variable", () => {
    const table = tableFromFn(3, (b) => b[0]! !== b[1]!);
    expect(computePar(table)).toBe(1);
  });

  it("finds a De Morgan shortcut cheaper than the obvious tree", () => {
    // (A AND B) OR (NOT C) looks like it needs an AND, a NOT, and an OR (3
    // gates), but NAND(NAND(A, B), C) reaches the same function in 2:
    // NAND(x, C) = NOT(x AND C) = NOT(x) OR NOT(C), and NOT(NAND(A, B)) is
    // (A AND B) — the search should find this, not just the obvious tree.
    const table = tableFromFn(3, (b) => (b[0]! && b[1]!) || !b[2]!);
    expect(computePar(table)).toBe(2);
  });

  it("accounts for non-shared sub-gates additively, not by depth", () => {
    // (A AND B) OR (C XOR D) touches two disjoint variable pairs, so unlike
    // the De Morgan case above there is no shortcut: some gate must depend
    // only on {A, B} and another only on {C, D} before a final gate
    // combines them — 3 gates minimum. A depth-only search would wrongly
    // report 2 by treating "A AND B" and "C XOR D" as free because each is
    // individually cheap, ignoring that both still have to be built.
    const table = tableFromFn(4, (b) => (b[0]! && b[1]!) || (b[2]! !== b[3]!));
    expect(computePar(table)).toBe(3);
  });

  it("is never 0 for a constant function (no TRUE/FALSE gate exists)", () => {
    const table = tableFromFn(3, () => true);
    expect(computePar(table)).toBeGreaterThan(0);
  });

  it("falls back to maxGates when the target isn't reachable within budget", () => {
    // XOR needs at least 1 gate, so a budget of 0 can never finalize it —
    // the search should give up and report the budget itself, not throw or
    // return an inaccurate result silently.
    const table = tableFromFn(3, (b) => b[0]! !== b[1]!);
    expect(computePar(table, 0)).toBe(0);
  });

  it("stays within the daily puzzle's par ceiling of 8 for a 3-input table", () => {
    for (let day = 1; day <= 20; day++) {
      const date = `2026-03-${String(day).padStart(2, "0")}`;
      const par = computePar(dailyTruthTable(date));
      expect(par).toBeGreaterThan(0);
      expect(par).toBeLessThanOrEqual(8);
    }
  });

  it("is 0 if and only if some input column exactly matches the output, for any random 3-input table", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }), (outputs) => {
        const table = buildTruthTable(3, outputs);
        const isExactCopyOfSomeInput = table.inputNames.some((_, varIndex) =>
          table.rows.every((row) => row.output === row.inputs[varIndex]),
        );
        return (computePar(table) === 0) === isExactCopyOfSomeInput;
      }),
    );
  });

  it("is always within [0, maxGates] and deterministic, for any random 3-input table", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }), (outputs) => {
        const table = buildTruthTable(3, outputs);
        const first = computePar(table);
        const second = computePar(table);
        return first === second && first >= 0 && first <= 10;
      }),
    );
  });
});
