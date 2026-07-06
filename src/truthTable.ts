import { hashSeed, mulberry32, randInt } from "./rng";
import type { TruthTable } from "./types";

const INPUT_NAMES = ["A", "B", "C", "D"];

/** Builds the 2^n input assignments for `count` boolean variables, in order. */
export function enumerateInputs(count: number): boolean[][] {
  const rows: boolean[][] = [];
  const total = 2 ** count;
  for (let i = 0; i < total; i++) {
    const row: boolean[] = [];
    for (let bit = count - 1; bit >= 0; bit--) {
      row.push(((i >> bit) & 1) === 1);
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Builds a truth table with `inputCount` variables from an explicit output
 * bit sequence (one boolean per row, in the order `enumerateInputs` returns).
 */
export function buildTruthTable(inputCount: number, outputs: boolean[]): TruthTable {
  const assignments = enumerateInputs(inputCount);
  if (outputs.length !== assignments.length) {
    throw new Error(
      `expected ${assignments.length} outputs for ${inputCount} inputs, got ${outputs.length}`,
    );
  }
  return {
    inputNames: INPUT_NAMES.slice(0, inputCount),
    rows: assignments.map((inputs, i) => ({ inputs, output: outputs[i]! })),
  };
}

/**
 * Deterministically picks a truth table for a given calendar date. Rejects
 * the two degenerate cases (always-true, always-false) so every day has a
 * function actually worth building a circuit for.
 */
export function dailyTruthTable(isoDate: string, inputCount = 3): TruthTable {
  const rng = mulberry32(hashSeed(`circuitle:${isoDate}:${inputCount}`));
  const rowCount = 2 ** inputCount;

  let outputs: boolean[];
  do {
    outputs = Array.from({ length: rowCount }, () => randInt(rng, 2) === 1);
  } while (outputs.every((v) => v) || outputs.every((v) => !v));

  return buildTruthTable(inputCount, outputs);
}

/** Today's date as an ISO `YYYY-MM-DD` string, in UTC. */
export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
