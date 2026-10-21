/**
 * Alarm tone selection (src/lib/prayerSettings.ts): exactly two selectable
 * tones, both synthesized (so neither can fail to ring), and a safe migration
 * from the v1 sound ids ("chime" | "adhan" | "silent") older builds stored.
 * Run with: bun test
 */
import { beforeEach, describe, expect, test } from "bun:test";
import {
  DEFAULT_PRAYER_SETTINGS,
  REMINDER_SOUNDS,
  loadPrayerSettings,
  playReminderSound,
} from "../src/lib/prayerSettings";

// Bun ships without localStorage; loadPrayerSettings swallows storage errors,
// so give it a minimal one (same pattern as the hijri suite).
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
};

const SETTINGS_KEY = "noor:prayerSettings";

beforeEach(() => store.clear());

describe("alarm tone picker", () => {
  test("offers exactly two selections with stable ids", () => {
    expect(REMINDER_SOUNDS.map((s) => s.id)).toEqual(["bells", "melody"]);
    expect(REMINDER_SOUNDS.map((s) => s.label)).toEqual(["Serene bells", "Soft melody"]);
  });

  test("the default tone is one of the two selections", () => {
    const ids = REMINDER_SOUNDS.map((s) => s.id);
    expect(ids).toContain(DEFAULT_PRAYER_SETTINGS.reminders.sound);
  });
});

describe("sound migration from v1", () => {
  for (const legacy of ["chime", "adhan", "silent"] as const) {
    test(`legacy “${legacy}” falls back to the default tone`, () => {
      store.set(SETTINGS_KEY, JSON.stringify({ reminders: { sound: legacy } }));
      expect(loadPrayerSettings().reminders.sound).toBe(DEFAULT_PRAYER_SETTINGS.reminders.sound);
    });
  }

  test("a current selection round-trips through storage", () => {
    store.set(SETTINGS_KEY, JSON.stringify({ reminders: { sound: "melody" } }));
    expect(loadPrayerSettings().reminders.sound).toBe("melody");
  });

  test("nothing stored selects the default tone", () => {
    expect(loadPrayerSettings().reminders.sound).toBe(DEFAULT_PRAYER_SETTINGS.reminders.sound);
  });
});

describe("playReminderSound", () => {
  test("both tones are safe to call (no Web Audio → silent no-op)", () => {
    for (const { id } of REMINDER_SOUNDS) {
      expect(() => playReminderSound(id)).not.toThrow();
    }
  });
});
