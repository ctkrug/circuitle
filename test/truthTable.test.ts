import { describe, expect, it } from "vitest";
import { buildTruthTable, dailyTruthTable, enumerateInputs } from "../src/truthTable";

describe("enumerateInputs", () => {
  it("produces 2^n rows in ascending binary order", () => {
    expect(enumerateInputs(2)).toEqual([
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ]);
  });
});

describe("buildTruthTable", () => {
  it("pairs each input row with its output bit", () => {
    const table = buildTruthTable(2, [false, true, true, false]); // XOR
    expect(table.inputNames).toEqual(["A", "B"]);
    expect(table.rows[1]).toEqual({ inputs: [false, true], output: true });
  });

  it("throws when the output count doesn't match 2^n", () => {
    expect(() => buildTruthTable(2, [true])).toThrow();
  });
});

describe("dailyTruthTable", () => {
  it("is deterministic for the same date", () => {
    const a = dailyTruthTable("2026-07-06");
    const b = dailyTruthTable("2026-07-06");
    expect(a).toEqual(b);
  });

  it("is not degenerate (not all-true or all-false)", () => {
    const table = dailyTruthTable("2026-07-06");
    const outputs = table.rows.map((r) => r.output);
    expect(outputs.some((v) => v)).toBe(true);
    expect(outputs.some((v) => !v)).toBe(true);
  });

  it("varies across different dates", () => {
    const a = dailyTruthTable("2026-07-06");
    const b = dailyTruthTable("2026-07-07");
    expect(a).not.toEqual(b);
  });
});
