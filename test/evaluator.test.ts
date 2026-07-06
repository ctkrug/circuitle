import { describe, expect, it } from "vitest";
import { countGates, evaluateCircuit, matchesTruthTable } from "../src/evaluator";
import { buildTruthTable } from "../src/truthTable";
import type { Circuit, Gate } from "../src/types";

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

/** A single two-input gate of `type` wired directly to A and B. */
function directGate(type: Gate["type"]): Circuit {
  return {
    inputs: ["A", "B"],
    gates: [
      {
        id: "g1",
        type,
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

  it.each([
    ["AND", [false, false, false, true]],
    ["NOR", [true, false, false, false]],
    ["XOR", [false, true, true, false]],
    ["XNOR", [true, false, false, true]],
  ] as const)("evaluates a single %s gate against its full truth table", (type, expected) => {
    const circuit = directGate(type);
    const rows: [boolean, boolean][] = [
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ];
    rows.forEach(([a, b], i) => {
      expect(evaluateCircuit(circuit, [a, b])).toBe(expected[i]);
    });
  });

  it("evaluates a NOT gate", () => {
    const circuit: Circuit = {
      inputs: ["A"],
      gates: [{ id: "g1", type: "NOT", inputs: [{ kind: "input", name: "A" }] }],
      output: { kind: "gate", id: "g1" },
    };
    expect(evaluateCircuit(circuit, [true])).toBe(false);
    expect(evaluateCircuit(circuit, [false])).toBe(true);
  });

  it("throws when a signal references an input name not in the circuit", () => {
    const circuit: Circuit = {
      inputs: ["A"],
      gates: [],
      output: { kind: "input", name: "Z" },
    };
    expect(() => evaluateCircuit(circuit, [true])).toThrow(/unknown input/);
  });

  it("throws when a signal references a gate id not in the circuit", () => {
    const circuit: Circuit = {
      inputs: ["A"],
      gates: [],
      output: { kind: "gate", id: "missing-gate" },
    };
    expect(() => evaluateCircuit(circuit, [true])).toThrow(/unknown gate/);
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
