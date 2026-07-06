/** The distinct in-game moments that get their own synthesized tone. */
export type ToneName = "place" | "connect" | "pass" | "win";

const TONE_FREQUENCIES: Record<ToneName, number> = {
  place: 440,
  connect: 660,
  pass: 880,
  win: 1046.5,
};

const TONE_DURATION_SECONDS = 0.18;
const PEAK_GAIN = 0.08;

/** The minimal surface of WebAudio this module needs — kept small and DOM-free so it's mockable in tests. */
export interface MinimalGainNode {
  gain: {
    value: number;
    setValueAtTime(value: number, time: number): void;
    exponentialRampToValueAtTime(value: number, time: number): void;
  };
  connect(destination: unknown): void;
}

export interface MinimalOscillatorNode {
  type: string;
  frequency: { value: number };
  connect(destination: unknown): void;
  start(time?: number): void;
  stop(time?: number): void;
}

export interface MinimalAudioContext {
  currentTime: number;
  destination: unknown;
  createGain(): MinimalGainNode;
  createOscillator(): MinimalOscillatorNode;
}

export type AudioContextCtor = new () => MinimalAudioContext;

export interface Synth {
  play(tone: ToneName): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

/**
 * Creates a synthesizer that plays short generated tones (no audio files).
 * `getCtor` is injected so tests can supply a fake constructor instead of a
 * real (unavailable in Node/test environments) AudioContext, and so
 * environments without WebAudio support degrade to silent no-ops rather
 * than throwing.
 */
export function createSynth(getCtor: () => AudioContextCtor | undefined, initiallyMuted = false): Synth {
  let muted = initiallyMuted;
  let ctx: MinimalAudioContext | null = null;

  function ensureContext(): MinimalAudioContext | null {
    if (ctx) return ctx;
    const Ctor = getCtor();
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  }

  return {
    play(tone: ToneName) {
      if (muted) return;
      const audioCtx = ensureContext();
      if (!audioCtx) return;

      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = tone === "win" ? "triangle" : "sine";
      oscillator.frequency.value = TONE_FREQUENCIES[tone];
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      gain.gain.setValueAtTime(PEAK_GAIN, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + TONE_DURATION_SECONDS);
      oscillator.start(now);
      oscillator.stop(now + TONE_DURATION_SECONDS);
    },
    setMuted(next: boolean) {
      muted = next;
    },
    isMuted() {
      return muted;
    },
  };
}
