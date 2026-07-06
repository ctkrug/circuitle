import type { BoardGate, BoardState } from "./boardState";
import type { SignalRef } from "./types";
import type { PinId } from "./wiring";

export interface Point {
  x: number;
  y: number;
}

export interface GateLayout {
  gridSpacing: number;
  widthCells: number;
  heightCells: number;
  pinHitRadius: number;
}

export const DEFAULT_GATE_LAYOUT: GateLayout = {
  gridSpacing: 24,
  widthCells: 4,
  heightCells: 3,
  pinHitRadius: 10,
};

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function gateBounds(gate: BoardGate, layout: GateLayout = DEFAULT_GATE_LAYOUT): Bounds {
  return {
    x: gate.position.x * layout.gridSpacing,
    y: gate.position.y * layout.gridSpacing,
    width: layout.widthCells * layout.gridSpacing,
    height: layout.heightCells * layout.gridSpacing,
  };
}

/** A gate's input slots sit on its left edge; two-input gates spread them top/bottom. */
export function gateInputPinPosition(
  gate: BoardGate,
  inputIndex: number,
  layout: GateLayout = DEFAULT_GATE_LAYOUT,
): Point {
  const bounds = gateBounds(gate, layout);
  const fraction = gate.inputs.length === 1 ? 0.5 : inputIndex === 0 ? 0.25 : 0.75;
  return { x: bounds.x, y: bounds.y + bounds.height * fraction };
}

export function gateOutputPinPosition(gate: BoardGate, layout: GateLayout = DEFAULT_GATE_LAYOUT): Point {
  const bounds = gateBounds(gate, layout);
  return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
}

/** The circuit's named inputs are pinned along the canvas's left edge, evenly spaced. */
export function inputPinPosition(index: number, totalInputs: number, canvasHeight: number): Point {
  const spacing = canvasHeight / (totalInputs + 1);
  return { x: 0, y: spacing * (index + 1) };
}

/** The circuit's single output sink sits at the vertical center of the right edge. */
export function outputSinkPosition(canvasWidth: number, canvasHeight: number): Point {
  return { x: canvasWidth, y: canvasHeight / 2 };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Finds the pin (if any) within hit range of `point`, checking inputs, the output sink, then gates. */
export function hitTestPin(
  state: BoardState,
  point: Point,
  canvasWidth: number,
  canvasHeight: number,
  layout: GateLayout = DEFAULT_GATE_LAYOUT,
): PinId | null {
  for (let i = 0; i < state.inputNames.length; i++) {
    const pos = inputPinPosition(i, state.inputNames.length, canvasHeight);
    if (distance(pos, point) <= layout.pinHitRadius) {
      return { kind: "input", name: state.inputNames[i]! };
    }
  }

  const sinkPos = outputSinkPosition(canvasWidth, canvasHeight);
  if (distance(sinkPos, point) <= layout.pinHitRadius) {
    return { kind: "output" };
  }

  for (const gate of state.gates) {
    const outputPos = gateOutputPinPosition(gate, layout);
    if (distance(outputPos, point) <= layout.pinHitRadius) {
      return { kind: "gateOutput", gateId: gate.id };
    }
    for (let i = 0; i < gate.inputs.length; i++) {
      const inputPos = gateInputPinPosition(gate, i, layout);
      if (distance(inputPos, point) <= layout.pinHitRadius) {
        return { kind: "gateInput", gateId: gate.id, inputIndex: i };
      }
    }
  }

  return null;
}

/** Resolves where a wire source (an input or a gate's output) currently sits, or `null` if it no longer exists. */
export function signalSourcePosition(
  state: BoardState,
  ref: SignalRef,
  canvasHeight: number,
  layout: GateLayout = DEFAULT_GATE_LAYOUT,
): Point | null {
  if (ref.kind === "input") {
    const index = state.inputNames.indexOf(ref.name);
    return index === -1 ? null : inputPinPosition(index, state.inputNames.length, canvasHeight);
  }
  const gate = state.gates.find((g) => g.id === ref.id);
  return gate ? gateOutputPinPosition(gate, layout) : null;
}

/** Resolves any pin (source or target) to its current screen position, or `null` if it no longer exists. */
export function resolvePinPosition(
  state: BoardState,
  pin: PinId,
  canvasWidth: number,
  canvasHeight: number,
  layout: GateLayout = DEFAULT_GATE_LAYOUT,
): Point | null {
  switch (pin.kind) {
    case "input":
      return signalSourcePosition(state, { kind: "input", name: pin.name }, canvasHeight, layout);
    case "output":
      return outputSinkPosition(canvasWidth, canvasHeight);
    case "gateOutput":
      return signalSourcePosition(state, { kind: "gate", id: pin.gateId }, canvasHeight, layout);
    case "gateInput": {
      const gate = state.gates.find((g) => g.id === pin.gateId);
      return gate ? gateInputPinPosition(gate, pin.inputIndex, layout) : null;
    }
  }
}

/** Finds the topmost (last-placed) gate whose body contains `point`, for drag/select/delete. */
export function hitTestGateBody(state: BoardState, point: Point, layout: GateLayout = DEFAULT_GATE_LAYOUT): string | null {
  for (let i = state.gates.length - 1; i >= 0; i--) {
    const gate = state.gates[i]!;
    const bounds = gateBounds(gate, layout);
    if (point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height) {
      return gate.id;
    }
  }
  return null;
}
