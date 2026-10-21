/**
 * Alarm sound selection (src/lib/prayerSettings.ts): the five-entry library
 * (full adhan, Fajr adhan, two synthesized tones, silent), a valid default,
 * and a safe migration from every legacy sound id (v1 "chime" and the
 * two-tone era's "bells" | "melody").
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

describe("alarm sound picker", () => {
  test("offers the full library with stable ids", () => {
    expect(REMINDER_SOUNDS.map((s) => s.id)).toEqual([
      "adhan",
      "fajr-adhan",
      "bells",
      "melody",
      "silent",
    ]);
    // Remote entries are exactly the adhan recordings; tones are offline.
    expect(REMINDER_SOUNDS.filter((s) => s.remote).map((s) => s.id)).toEqual([
      "adhan",
      "fajr-adhan",
    ]);
  });

  test("every entry is labelled and described — no blank picker rows", () => {
    for (const s of REMINDER_SOUNDS) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
    }
  });

  test("the default selection is part of the library", () => {
    const ids = REMINDER_SOUNDS.map((s) => s.id);
    expect(ids).toContain(DEFAULT_PRAYER_SETTINGS.reminders.sound);
  });
});

describe("sound migration across versions", () => {
  for (const legacy of ["chime", "silent"] as const) {
    test(`legacy “${legacy}” maps to a current selection`, () => {
      store.set(SETTINGS_KEY, JSON.stringify({ reminders: { sound: legacy } }));
      const sound = loadPrayerSettings().reminders.sound;
      expect(REMINDER_SOUNDS.map((s) => s.id)).toContain(sound);
      expect(sound).toBe(legacy === "chime" ? "bells" : "silent");
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
