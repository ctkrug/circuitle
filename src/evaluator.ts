import type { Circuit, Gate, GateType, SignalRef, TruthTable } from "./types";

function applyGate(type: GateType, a: boolean, b?: boolean): boolean {
  switch (type) {
    case "AND":
      return a && (b as boolean);
    case "OR":
      return a || (b as boolean);
    case "NAND":
      return !(a && (b as boolean));
    case "NOR":
      return !(a || (b as boolean));
    case "XOR":
      return a !== (b as boolean);
    case "XNOR":
      return a === (b as boolean);
    case "NOT":
      return !a;
  }
}

class CircuitError extends Error {}

/** Evaluates a single circuit for one input assignment. */
export function evaluateCircuit(circuit: Circuit, inputs: boolean[]): boolean {
  if (inputs.length !== circuit.inputs.length) {
    throw new CircuitError(
      `expected ${circuit.inputs.length} inputs, got ${inputs.length}`,
    );
  }

  const inputValues = new Map<string, boolean>();
  circuit.inputs.forEach((name, i) => inputValues.set(name, inputs[i]!));

  const gatesById = new Map<string, Gate>(circuit.gates.map((g) => [g.id, g]));
  const resolved = new Map<string, boolean>();

  function resolveSignal(ref: SignalRef, stack: Set<string>): boolean {
    if (ref.kind === "input") {
      const value = inputValues.get(ref.name);
      if (value === undefined) {
        throw new CircuitError(`unknown input "${ref.name}"`);
      }
      return value;
    }

    if (resolved.has(ref.id)) return resolved.get(ref.id)!;
    if (stack.has(ref.id)) {
      throw new CircuitError(`cycle detected at gate "${ref.id}"`);
    }

    const gate = gatesById.get(ref.id);
    if (!gate) throw new CircuitError(`unknown gate "${ref.id}"`);

    const nextStack = new Set(stack).add(ref.id);
    const values = gate.inputs.map((input) => resolveSignal(input, nextStack));
    const value = applyGate(gate.type, values[0]!, values[1]);
    resolved.set(ref.id, value);
    return value;
  }

  return resolveSignal(circuit.output, new Set());
}

/** Checks whether a circuit reproduces every row of a truth table. */
export function matchesTruthTable(circuit: Circuit, table: TruthTable): boolean {
  return table.rows.every((row) => evaluateCircuit(circuit, row.inputs) === row.output);
}

/** Total number of gates placed in a circuit — the score to minimize. */
export function countGates(circuit: Circuit): number {
  return circuit.gates.length;
}
