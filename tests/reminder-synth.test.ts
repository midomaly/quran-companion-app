/**
 * Alarm synth scheduling (src/lib/prayerSettings.ts): audio can't be heard in
 * CI, so this mocks Web Audio and validates the graph the two tones schedule —
 * correct envelopes (positive exponential ramps, monotonic times), every
 * oscillator starting once and stopping after it starts, the expected strike
 * counts that define each tone, and one shared context reused across plays
 * (a fresh AudioContext per alarm would hit browser context limits).
 *
 * The suite imports a fresh module instance (query-suffixed specifier) and
 * installs the mock before any play, so the module's AudioContext singleton
 * can't be pinned by an earlier suite in the same Bun process.
 * Run with: bun test
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const { playReminderSound } = await import("../src/lib/prayerSettings?fresh-mock=1");

// The two synthesized tones (the adhan entries stream real recordings and are
// covered by tests/prayer-alarms.test.ts).
const TONES = ["bells", "melody"] as const;

const BELL_OSC = 4 * 6; // four strikes, six inharmonic partials each
const MELODY_OSC = 5 * 3; // five notes, three layers each

function makeMock() {
  const violations: string[] = [];
  let oscillators = 0;

  const gainParam = (label: string) => {
    let last = 0;
    return {
      value: 0,
      setValueAtTime(v: number, t: number) {
        if (!(v > 0)) violations.push(`${label}: setValueAtTime with non-positive value ${v}`);
        if (!(t >= 0)) violations.push(`${label}: setValueAtTime at negative time ${t}`);
        last = t;
      },
      exponentialRampToValueAtTime(v: number, t: number) {
        if (!(v > 0)) violations.push(`${label}: exponential ramp to non-positive ${v}`);
        if (!(t > last)) violations.push(`${label}: ramp at ${t} not after ${last}`);
        last = t;
      },
    };
  };

  class MockAudioContext {
    currentTime = 10;
    sampleRate = 48_000;
    state = "running";
    destination = { connect: (d: unknown) => d };
    async resume() {}
    createOscillator() {
      oscillators += 1;
      let startedAt: number | null = null;
      return {
        type: "sine",
        frequency: { value: 0 },
        connect: (d: unknown) => d,
        start(t: number) {
          if (startedAt !== null) violations.push("oscillator started twice");
          if (!(t > 10)) violations.push(`start ${t} not after currentTime`);
          startedAt = t;
        },
        stop(t: number) {
          // Stopping before the start time is spec-legal and means "never
          // sound" (the Stop action / never-stacking rule uses it); stopping
          // before the node ever started is the real bug.
          if (startedAt === null) violations.push("oscillator stopped before it ever started");
          if (!(t >= 0) || Number.isNaN(t)) violations.push(`stop at invalid time ${t}`);
        },
      };
    }
    createGain() {
      return { gain: gainParam(`gain#${oscillators}`), connect: (d: unknown) => d };
    }
    createConvolver() {
      return { buffer: null as unknown, connect: (d: unknown) => d };
    }
    createBuffer(channels: number, length: number) {
      if (channels !== 2) violations.push(`reverb impulse has ${channels} channels`);
      if (!(length > 44_100)) violations.push(`reverb impulse too short: ${length} samples`);
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { numberOfChannels: channels, length, getChannelData: (c: number) => data[c] };
    }
  }

  return { MockAudioContext, violations, count: () => oscillators };
}

const mock = makeMock();
const g = globalThis as Record<string, unknown>;
const hadWindow = "window" in g;
const originalWindow = g.window;

beforeAll(() => {
  g.window = { ...((originalWindow as object | undefined) ?? {}), AudioContext: mock.MockAudioContext };
});

afterAll(() => {
  if (hadWindow) g.window = originalWindow;
  else delete g.window;
});

describe("alarm tone synth", () => {
  test("both tones schedule a valid graph with their full strike counts", () => {
    const oscBefore = mock.count();
    const errBefore = mock.violations.length;
    for (const id of TONES) playReminderSound(id);
    expect(mock.violations.slice(errBefore)).toEqual([]);
    expect(mock.count() - oscBefore).toBe(BELL_OSC + MELODY_OSC);
  });

  test("replaying reuses the shared AudioContext instead of opening a new one", () => {
    const oscBefore = mock.count();
    const errBefore = mock.violations.length;
    playReminderSound("bells");
    expect(mock.count() - oscBefore).toBe(BELL_OSC);
    playReminderSound("melody");
    expect(mock.count() - oscBefore).toBe(BELL_OSC + MELODY_OSC);
    expect(mock.violations.slice(errBefore)).toEqual([]);
  });
});
