import { GATE_ARITY } from "./types";
import type { Circuit, Gate, GateType, SignalRef } from "./types";

/** A gate's position on the board grid, in grid cells (not pixels). */
export interface GridPosition {
  x: number;
  y: number;
}

/** A gate placed on the board. Unlike `Gate`, its inputs may be unwired yet. */
export interface BoardGate {
  id: string;
  type: GateType;
  position: GridPosition;
  inputs: (SignalRef | null)[];
}

/** The full editable state of a player's in-progress circuit. */
export interface BoardState {
  inputNames: string[];
  gates: BoardGate[];
  output: SignalRef | null;
}

/** Where a wire can terminate: a gate's input slot, or the circuit's output sink. */
export type TargetPin = { kind: "gateInput"; gateId: string; inputIndex: number } | { kind: "output" };

export interface ConnectResult {
  state: BoardState;
  error: string | null;
}

export function createBoardState(inputNames: string[]): BoardState {
  return { inputNames, gates: [], output: null };
}

export function placeGate(state: BoardState, id: string, type: GateType, position: GridPosition): BoardState {
  const gate: BoardGate = { id, type, position, inputs: new Array(GATE_ARITY[type]).fill(null) };
  return { ...state, gates: [...state.gates, gate] };
}

export function moveGate(state: BoardState, gateId: string, position: GridPosition): BoardState {
  return { ...state, gates: state.gates.map((g) => (g.id === gateId ? { ...g, position } : g)) };
}

/** Removes a gate and clears any wire (input slot or the circuit output) that referenced it. */
export function removeGate(state: BoardState, gateId: string): BoardState {
  const gates = state.gates
    .filter((g) => g.id !== gateId)
    .map((g) => ({
      ...g,
      inputs: g.inputs.map((ref) => (ref && ref.kind === "gate" && ref.id === gateId ? null : ref)),
    }));
  const output = state.output && state.output.kind === "gate" && state.output.id === gateId ? null : state.output;
  return { ...state, gates, output };
}

function sourceExists(state: BoardState, source: SignalRef): boolean {
  return source.kind === "input"
    ? state.inputNames.includes(source.name)
    : state.gates.some((g) => g.id === source.id);
}

/** Would wiring `source` into `intoGateId` create a feedback cycle? */
function wouldCreateCycle(state: BoardState, intoGateId: string, source: SignalRef): boolean {
  if (source.kind === "input") return false;
  if (source.id === intoGateId) return true;

  const gatesById = new Map(state.gates.map((g) => [g.id, g]));
  const visited = new Set<string>();
  const stack = [source.id];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === intoGateId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const gate = gatesById.get(current);
    if (!gate) continue;
    for (const ref of gate.inputs) {
      if (ref && ref.kind === "gate") stack.push(ref.id);
    }
  }
  return false;
}

/** Wires `source` into a gate's input slot or the circuit output, rejecting invalid connections. */
export function connect(state: BoardState, source: SignalRef, target: TargetPin): ConnectResult {
  if (!sourceExists(state, source)) {
    return { state, error: "unknown signal source" };
  }

  if (target.kind === "output") {
    return { state: { ...state, output: source }, error: null };
  }

  const gate = state.gates.find((g) => g.id === target.gateId);
  if (!gate) {
    return { state, error: `unknown gate "${target.gateId}"` };
  }
  if (target.inputIndex < 0 || target.inputIndex >= gate.inputs.length) {
    return { state, error: "invalid input index" };
  }
  if (source.kind === "gate" && source.id === target.gateId) {
    return { state, error: "a gate cannot feed its own input" };
  }
  if (wouldCreateCycle(state, target.gateId, source)) {
    return { state, error: "connection would create a cycle" };
  }

  const gates = state.gates.map((g) =>
    g.id === target.gateId
      ? { ...g, inputs: g.inputs.map((ref, i) => (i === target.inputIndex ? source : ref)) }
      : g,
  );
  return { state: { ...state, gates }, error: null };
}

export function disconnect(state: BoardState, target: TargetPin): BoardState {
  if (target.kind === "output") return { ...state, output: null };
  const gates = state.gates.map((g) =>
    g.id === target.gateId
      ? { ...g, inputs: g.inputs.map((ref, i) => (i === target.inputIndex ? null : ref)) }
      : g,
  );
  return { ...state, gates };
}

/** Converts the board to an evaluable `Circuit`, or `null` if any wire is missing. */
export function toCircuit(state: BoardState): Circuit | null {
  if (!state.output) return null;
  const gates: Gate[] = [];
  for (const g of state.gates) {
    if (g.inputs.some((ref) => ref === null)) return null;
    gates.push({ id: g.id, type: g.type, inputs: g.inputs as SignalRef[] });
  }
  return { inputs: state.inputNames, gates, output: state.output };
}

export function gateCount(state: BoardState): number {
  return state.gates.length;
}
