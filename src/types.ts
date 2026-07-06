/** The gate kinds a player can place on the board. */
export type GateType = "AND" | "OR" | "NOT" | "XOR" | "NAND" | "NOR" | "XNOR";

/** How many inputs each gate kind takes. */
export const GATE_ARITY: Record<GateType, 1 | 2> = {
  AND: 2,
  OR: 2,
  XOR: 2,
  NAND: 2,
  NOR: 2,
  XNOR: 2,
  NOT: 1,
};

/**
 * A reference to a signal: either a named circuit input (e.g. "A") or the
 * output of another gate by id.
 */
export type SignalRef = { kind: "input"; name: string } | { kind: "gate"; id: string };

export interface Gate {
  id: string;
  type: GateType;
  inputs: SignalRef[];
}

export interface Circuit {
  /** Ordered input variable names, e.g. ["A", "B", "C"]. */
  inputs: string[];
  gates: Gate[];
  /** Which signal drives the circuit's single output. */
  output: SignalRef;
}

/** One row of a truth table: an input assignment and the expected output. */
export interface TruthTableRow {
  inputs: boolean[];
  output: boolean;
}

export interface TruthTable {
  inputNames: string[];
  rows: TruthTableRow[];
}
