import fc from "fast-check";
import { describe, it } from "vitest";
import {
  connect,
  createBoardState,
  disconnect,
  placeGate,
  removeGate,
  toCircuit,
} from "../src/boardState";
import { evaluateCircuit } from "../src/evaluator";
import { enumerateInputs } from "../src/truthTable";
import type { GateType, SignalRef } from "../src/types";

const GATE_TYPES: GateType[] = ["AND", "OR", "NOT", "XOR", "NAND", "NOR", "XNOR"];
const INPUT_NAMES = ["A", "B"];

/**
 * Replays a sequence of small integer "choices" as a random walk over
 * place/connect/disconnect/remove, checking after every step that the board
 * never ends up with a dangling gate reference or a circuit that throws —
 * the two ways a delete/rewire bug could corrupt state that no single
 * example test happens to exercise.
 */
function replay(choices: number[]): void {
  let state = createBoardState(INPUT_NAMES);
  let counter = 0;

  for (const choice of choices) {
    const gateIds = state.gates.map((g) => g.id);

    switch (choice % 4) {
      case 0: {
        counter += 1;
        const type = GATE_TYPES[choice % GATE_TYPES.length]!;
        state = placeGate(state, `g${counter}`, type, { x: choice % 6, y: choice % 6 });
        break;
      }
      case 1: {
        if (gateIds.length === 0) break;
        const sources: SignalRef[] = [
          ...state.inputNames.map((name): SignalRef => ({ kind: "input", name })),
          ...gateIds.map((id): SignalRef => ({ kind: "gate", id })),
        ];
        const source = sources[choice % sources.length]!;
        const targetGateId = gateIds[choice % gateIds.length]!;
        const gate = state.gates.find((g) => g.id === targetGateId)!;
        const inputIndex = choice % gate.inputs.length;
        state = connect(state, source, { kind: "gateInput", gateId: targetGateId, inputIndex }).state;
        break;
      }
      case 2: {
        if (gateIds.length === 0) break;
        const targetGateId = gateIds[choice % gateIds.length]!;
        const gate = state.gates.find((g) => g.id === targetGateId)!;
        const inputIndex = choice % gate.inputs.length;
        state = disconnect(state, { kind: "gateInput", gateId: targetGateId, inputIndex });
        break;
      }
      case 3: {
        if (gateIds.length === 0) break;
        state = removeGate(state, gateIds[choice % gateIds.length]!);
        break;
      }
    }

    const liveIds = new Set(state.gates.map((g) => g.id));
    for (const gate of state.gates) {
      for (const ref of gate.inputs) {
        if (ref && ref.kind === "gate" && !liveIds.has(ref.id)) {
          throw new Error(`dangling gate input reference to removed gate "${ref.id}"`);
        }
      }
    }
    if (state.output && state.output.kind === "gate" && !liveIds.has(state.output.id)) {
      throw new Error(`dangling output reference to removed gate "${state.output.id}"`);
    }

    const circuit = toCircuit(state);
    if (circuit) {
      for (const inputs of enumerateInputs(state.inputNames.length)) {
        evaluateCircuit(circuit, inputs);
      }
    }
  }
}

describe("boardState random op sequences", () => {
  it("never leaves a dangling gate reference or an unevaluable circuit", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 60 }), (choices) => {
        replay(choices);
      }),
    );
  });
});
