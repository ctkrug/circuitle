import { describe, expect, it, vi } from "vitest";
import { createSynth } from "../src/audio";
import type { AudioContextCtor, MinimalAudioContext, MinimalGainNode, MinimalOscillatorNode } from "../src/audio";

function makeFakeCtor(): { Ctor: AudioContextCtor; instances: MinimalAudioContext[] } {
  const instances: MinimalAudioContext[] = [];

  class FakeAudioContext implements MinimalAudioContext {
    currentTime = 0;
    destination = {};
    createGain(): MinimalGainNode {
      return {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
    createOscillator(): MinimalOscillatorNode {
      return {
        type: "sine",
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
  }

  return {
    Ctor: FakeAudioContext as unknown as AudioContextCtor,
    instances,
  };
}

describe("createSynth", () => {
  it("does not construct an AudioContext until the first play()", () => {
    const { Ctor } = makeFakeCtor();
    const getCtor = vi.fn(() => Ctor);
    createSynth(getCtor);
    expect(getCtor).not.toHaveBeenCalled();
  });

  it("plays a tone by starting and stopping an oscillator", () => {
    const ctx = makeFakeCtor().Ctor;
    const instance = new ctx();
    const oscSpy = vi.spyOn(instance, "createOscillator");
    const getCtor = () =>
      class {
        constructor() {
          return instance;
        }
      } as unknown as AudioContextCtor;

    const synth = createSynth(getCtor);
    synth.play("place");
    expect(oscSpy).toHaveBeenCalledTimes(1);
  });

  it("reuses a single AudioContext across multiple play() calls", () => {
    const { Ctor } = makeFakeCtor();
    const getCtor = vi.fn(() => Ctor);
    const synth = createSynth(getCtor);
    synth.play("place");
    synth.play("connect");
    synth.play("win");
    expect(getCtor).toHaveBeenCalledTimes(1);
  });

  it("does not play or construct a context when muted", () => {
    const { Ctor } = makeFakeCtor();
    const getCtor = vi.fn(() => Ctor);
    const synth = createSynth(getCtor, true);
    synth.play("place");
    expect(getCtor).not.toHaveBeenCalled();
  });

  it("setMuted toggles isMuted and gates subsequent play() calls", () => {
    const { Ctor } = makeFakeCtor();
    const getCtor = vi.fn(() => Ctor);
    const synth = createSynth(getCtor);
    expect(synth.isMuted()).toBe(false);

    synth.setMuted(true);
    expect(synth.isMuted()).toBe(true);
    synth.play("win");
    expect(getCtor).not.toHaveBeenCalled();

    synth.setMuted(false);
    synth.play("win");
    expect(getCtor).toHaveBeenCalledTimes(1);
  });

  it("degrades to a silent no-op when WebAudio is unsupported", () => {
    const synth = createSynth(() => undefined);
    expect(() => synth.play("win")).not.toThrow();
  });
});
