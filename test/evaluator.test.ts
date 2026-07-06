import { describe, expect, it } from "vitest";
import { countGates, evaluateCircuit, matchesTruthTable } from "../src/evaluator";
import { buildTruthTable } from "../src/truthTable";
import type { Circuit } from "../src/types";

/** A minimal circuit computing A XOR B via NAND gates only. */
function xorViaNand(): Circuit {
  const a = { kind: "input", name: "A" } as const;
  const b = { kind: "input", name: "B" } as const;
  return {
    inputs: ["A", "B"],
    gates: [
      { id: "g1", type: "NAND", inputs: [a, b] },
      { id: "g2", type: "NAND", inputs: [a, { kind: "gate", id: "g1" }] },
      { id: "g3", type: "NAND", inputs: [b, { kind: "gate", id: "g1" }] },
      {
        id: "g4",
        type: "NAND",
        inputs: [
          { kind: "gate", id: "g2" },
          { kind: "gate", id: "g3" },
        ],
      },
    ],
    output: { kind: "gate", id: "g4" },
  };
}

function directOr(): Circuit {
  return {
    inputs: ["A", "B"],
    gates: [
      {
        id: "g1",
        type: "OR",
        inputs: [
          { kind: "input", name: "A" },
          { kind: "input", name: "B" },
        ],
      },
    ],
    output: { kind: "gate", id: "g1" },
  };
}

describe("evaluateCircuit", () => {
  it("evaluates a single OR gate", () => {
    const circuit = directOr();
    expect(evaluateCircuit(circuit, [false, false])).toBe(false);
    expect(evaluateCircuit(circuit, [true, false])).toBe(true);
  });

  it("resolves a multi-gate NAND-only XOR circuit", () => {
    const circuit = xorViaNand();
    expect(evaluateCircuit(circuit, [false, false])).toBe(false);
    expect(evaluateCircuit(circuit, [false, true])).toBe(true);
    expect(evaluateCircuit(circuit, [true, false])).toBe(true);
    expect(evaluateCircuit(circuit, [true, true])).toBe(false);
  });

  it("throws on a wiring cycle", () => {
    const circuit: Circuit = {
      inputs: ["A"],
      gates: [
        { id: "g1", type: "NOT", inputs: [{ kind: "gate", id: "g2" }] },
        { id: "g2", type: "NOT", inputs: [{ kind: "gate", id: "g1" }] },
      ],
      output: { kind: "gate", id: "g1" },
    };
    expect(() => evaluateCircuit(circuit, [true])).toThrow(/cycle/);
  });

  it("throws when the input count doesn't match", () => {
    expect(() => evaluateCircuit(directOr(), [true])).toThrow();
  });
});

describe("matchesTruthTable", () => {
  it("confirms a NAND-only circuit reproduces the XOR truth table", () => {
    const table = buildTruthTable(2, [false, true, true, false]);
    expect(matchesTruthTable(xorViaNand(), table)).toBe(true);
  });

  it("rejects a circuit that doesn't match", () => {
    const table = buildTruthTable(2, [false, true, true, false]); // XOR
    expect(matchesTruthTable(directOr(), table)).toBe(false);
  });
});

describe("countGates", () => {
  it("counts placed gates", () => {
    expect(countGates(directOr())).toBe(1);
    expect(countGates(xorViaNand())).toBe(4);
  });
});
