import type { BoardGate, BoardState } from "./boardState";
import { easeOutCubic } from "./easing";
import {
  DEFAULT_GATE_LAYOUT,
  gateBounds,
  gateInputPinPosition,
  gateOutputPinPosition,
  inputPinPosition,
  outputSinkPosition,
  resolvePinPosition,
  signalSourcePosition,
} from "./layout";
import type { GateLayout, Point } from "./layout";
import type { PinId } from "./wiring";

const GRID_SPACING = DEFAULT_GATE_LAYOUT.gridSpacing;
const GRID_COLOR = "rgba(125, 211, 252, 0.12)";
const SURFACE_COLOR = "#122744";
const GATE_BORDER = "#7dd3fc";
const WIRE_COLOR = "rgba(125, 211, 252, 0.55)";
const TEXT_COLOR = "#eaf2ff";
const MUTED_COLOR = "#5a7396";
const ACCENT = "#ffb454";
const ACCENT_SUPPORT = "#7dd3fc";
const DANGER = "#f87171";

const SHAKE_DURATION_MS = 240;
const SHAKE_AMPLITUDE_PX = 6;
const PULSE_DURATION_MS = 320;

interface ShakeAnim {
  gateId: string;
  start: number;
}

interface PulseAnim {
  from: Point;
  to: Point;
  start: number;
}

/**
 * Renders the circuit board — grid, placed gates, wires, and pins — and
 * drives two short canvas-only animations (invalid-drop shake, wire-connect
 * pulse) via a continuous rAF loop. Call `resize()` whenever the canvas's
 * container size changes.
 */
export class BoardRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly layout: GateLayout = DEFAULT_GATE_LAYOUT;
  private width = 0;
  private height = 0;
  private state: BoardState;
  private hoveredPin: PinId | null = null;
  private selectedPin: PinId | null = null;
  private selectedGateId: string | null = null;
  private shake: ShakeAnim | null = null;
  private pulse: PulseAnim | null = null;
  private reducedMotion: boolean;
  private rafHandle = 0;

  constructor(canvas: HTMLCanvasElement, initialState: BoardState) {
    this.canvas = canvas;
    this.state = initialState;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d canvas context unavailable");
    this.ctx = ctx;
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.rafHandle = requestAnimationFrame(this.loop);
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setState(state: BoardState): void {
    this.state = state;
  }

  setSelection(pin: PinId | null, gateId: string | null = null): void {
    this.selectedPin = pin;
    this.selectedGateId = gateId;
  }

  setHover(pin: PinId | null): void {
    this.hoveredPin = pin;
  }

  /** Two-cycle red shake on an invalid drop or connection attempt. */
  triggerShake(gateId: string): void {
    if (this.reducedMotion) return;
    this.shake = { gateId, start: performance.now() };
  }

  /** A single traveling pulse of light along a newly connected wire. */
  triggerPulse(from: Point, to: Point): void {
    if (this.reducedMotion) return;
    this.pulse = { from, to, start: performance.now() };
  }

  destroy(): void {
    cancelAnimationFrame(this.rafHandle);
  }

  private readonly loop = (): void => {
    this.draw();
    this.rafHandle = requestAnimationFrame(this.loop);
  };

  private draw(): void {
    const { ctx, width, height } = this;
    if (width === 0 || height === 0) return;

    ctx.clearRect(0, 0, width, height);
    this.drawGrid();

    const now = performance.now();
    if (this.shake && now - this.shake.start > SHAKE_DURATION_MS) this.shake = null;
    if (this.pulse && now - this.pulse.start > PULSE_DURATION_MS) this.pulse = null;

    this.drawWires();
    for (const gate of this.state.gates) this.drawGate(gate, now);
    this.drawEndpoints();
    if (this.pulse) this.drawPulse(this.pulse, now);
    this.drawSelectionHighlight();
  }

  private drawGrid(): void {
    const { ctx, width, height } = this;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += GRID_SPACING) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
    }
    for (let y = 0; y <= height; y += GRID_SPACING) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.stroke();
  }

  private drawWires(): void {
    for (const gate of this.state.gates) {
      gate.inputs.forEach((ref, i) => {
        if (!ref) return;
        const from = signalSourcePosition(this.state, ref, this.height, this.layout);
        if (!from) return;
        const to = gateInputPinPosition(gate, i, this.layout);
        this.drawWireSegment(from, to);
      });
    }
    if (this.state.output) {
      const from = signalSourcePosition(this.state, this.state.output, this.height, this.layout);
      if (from) this.drawWireSegment(from, outputSinkPosition(this.width, this.height));
    }
  }

  private drawWireSegment(from: Point, to: Point): void {
    const { ctx } = this;
    const midX = (from.x + to.x) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(midX, from.y, midX, to.y, to.x, to.y);
    ctx.strokeStyle = WIRE_COLOR;
    ctx.lineWidth = 2;
    ctx.shadowColor = ACCENT_SUPPORT;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
  }

  private drawGate(gate: BoardGate, now: number): void {
    const { ctx } = this;
    const bounds = gateBounds(gate, this.layout);
    const isShaking = this.shake?.gateId === gate.id;
    const isSelected = this.selectedGateId === gate.id;

    let xOffset = 0;
    if (isShaking && this.shake) {
      const t = (now - this.shake.start) / SHAKE_DURATION_MS;
      xOffset = Math.sin(t * Math.PI * 4) * SHAKE_AMPLITUDE_PX * (1 - t);
    }

    ctx.save();
    ctx.beginPath();
    this.roundedRectPath(bounds.x + xOffset, bounds.y, bounds.width, bounds.height, 6);
    ctx.fillStyle = SURFACE_COLOR;
    ctx.fill();
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeStyle = isShaking ? DANGER : isSelected ? ACCENT : GATE_BORDER;
    ctx.stroke();

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = "600 13px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(gate.type, bounds.x + xOffset + bounds.width / 2, bounds.y + bounds.height / 2);
    ctx.restore();

    gate.inputs.forEach((ref, i) => {
      const pos = gateInputPinPosition(gate, i, this.layout);
      this.drawPin({ x: pos.x + xOffset, y: pos.y }, ref ? ACCENT_SUPPORT : MUTED_COLOR);
    });
    const outPos = gateOutputPinPosition(gate, this.layout);
    this.drawPin({ x: outPos.x + xOffset, y: outPos.y }, ACCENT);
  }

  private drawEndpoints(): void {
    const { ctx } = this;
    this.state.inputNames.forEach((name, i) => {
      const pos = inputPinPosition(i, this.state.inputNames.length, this.height);
      this.drawPin(pos, ACCENT_SUPPORT, 6);
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = "600 13px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(name, pos.x + 14, pos.y);
    });

    const sinkPos = outputSinkPosition(this.width, this.height);
    this.drawPin(sinkPos, this.state.output ? ACCENT : MUTED_COLOR, 6);
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("OUT", sinkPos.x - 14, sinkPos.y);
  }

  private drawPin(pos: Point, color: string, radius = 5): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  private drawPulse(pulse: PulseAnim, now: number): void {
    const t = easeOutCubic(Math.min(1, (now - pulse.start) / PULSE_DURATION_MS));
    const x = pulse.from.x + (pulse.to.x - pulse.from.x) * t;
    const y = pulse.from.y + (pulse.to.y - pulse.from.y) * t;
    this.drawPin({ x, y }, ACCENT, 7);
  }

  private drawSelectionHighlight(): void {
    if (!this.selectedPin) return;
    const pos = resolvePinPosition(this.state, this.selectedPin, this.width, this.height, this.layout);
    if (!pos) return;
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2;
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }

  private roundedRectPath(x: number, y: number, width: number, height: number, radius: number): void {
    const { ctx } = this;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
  }
}
