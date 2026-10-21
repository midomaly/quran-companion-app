/**
 * Adhan alarm system (src/lib/prayerSettings.ts + src/lib/adhan.ts):
 * - the pure scheduler (duePrayerAlarms): correct prayer fires at the correct
 *   instant, disabled alarms never fire, the grace window and lead times are
 *   respected, quiet hours silence everything;
 * - settings persistence: new fields persist, legacy sound ids migrate, bad
 *   values fall back to sane defaults;
 * - the sound catalog: verified archive.org recordings only, Fajr mapping.
 * Run with: bun test
 */
import { beforeEach, describe, expect, test } from "bun:test";
import {
  DEFAULT_PRAYER_SETTINGS,
  duePrayerAlarms,
  loadPrayerSettings,
  playAlarmSound,
  stopAlarmSound,
  prayerInstant,
  shiftDateParts,
  timesForDate,
  type PrayerAppSettings,
  type ResolvedPrayerLocation,
} from "../src/lib/prayerSettings";
import {
  ADHAN_RECORDINGS,
  DEFAULT_ADHAN_TRACK,
  FAJR_ADHAN_TRACK,
  STANDARD_ADHAN_TRACKS,
  isAdhanTrackId,
  getAdhanRecording,
} from "../src/lib/adhan";

// Bun ships without localStorage; loadPrayerSettings swallows storage errors,
// so give it a minimal one (same pattern as the hijri suite).
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
};

const KEY = "noor:prayerSettings";

beforeEach(() => store.clear());

/* ------------------------------------------------------------------ *
 * Scheduler (pure)
 * ------------------------------------------------------------------ */

const MAKKAH: ResolvedPrayerLocation = {
  lat: 21.4225,
  lng: 39.8262,
  timeZone: "Asia/Riyadh",
  label: "Makkah",
};

// Fixed reference instant so the suite is deterministic in any time zone.
const REF = Date.UTC(2026, 5, 15, 9, 0, 0);

function settingsWith(patch: Partial<typeof DEFAULT_PRAYER_SETTINGS.reminders>): PrayerAppSettings {
  return {
    ...DEFAULT_PRAYER_SETTINGS,
    reminders: { ...DEFAULT_PRAYER_SETTINGS.reminders, ...patch },
  };
}

function dhuhrInstant(now: number, settings: PrayerAppSettings): number {
  const date = shiftDateParts(now, 0);
  const times = timesForDate(MAKKAH, date, settings);
  return prayerInstant(MAKKAH, date, times.dhuhr) as number;
}

/** "HH:MM" from minutes-of-day, wrapping past midnight. */
function hhmm(minutesOfDay: number): string {
  const m = ((Math.round(minutesOfDay) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

describe("duePrayerAlarms", () => {
  test("the correct prayer fires at the correct instant", () => {
    const settings = settingsWith({ enabled: { dhuhr: true } });
    const at = dhuhrInstant(REF, settings);
    const due = duePrayerAlarms(at + 30_000, MAKKAH, settings);
    expect(due.map((a) => a.name)).toEqual(["dhuhr"]);
    expect(due[0].prayerAt).toBe(at);
    expect(due[0].fireAt).toBe(at);
  });

  test("disabled alarms never fire", () => {
    const settings = settingsWith({ enabled: {} }); // nothing armed
    const at = dhuhrInstant(REF, settings);
    expect(duePrayerAlarms(at + 30_000, MAKKAH, settings)).toEqual([]);
  });

  test("a single instant triggers only its own prayer", () => {
    const settings = settingsWith({
      enabled: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    });
    const at = dhuhrInstant(REF, settings);
    const due = duePrayerAlarms(at + 30_000, MAKKAH, settings);
    expect(due.map((a) => a.name)).toEqual(["dhuhr"]);
  });

  test("the 3-minute grace window catches a sleeping tab but not a stale alarm", () => {
    const settings = settingsWith({ enabled: { dhuhr: true } });
    const at = dhuhrInstant(REF, settings);
    expect(duePrayerAlarms(at - 60_000, MAKKAH, settings)).toEqual([]); // before time
    expect(duePrayerAlarms(at + 2 * 60_000, MAKKAH, settings)).toHaveLength(1); // late but inside grace
    expect(duePrayerAlarms(at + 4 * 60_000, MAKKAH, settings)).toEqual([]); // stale
  });

  test("a 15-minute lead fires 15 minutes before, not at the prayer time", () => {
    const settings = settingsWith({ enabled: { dhuhr: true }, leadMinutes: 15 });
    const at = dhuhrInstant(REF, settings);
    expect(duePrayerAlarms(at - 15 * 60_000 + 20_000, MAKKAH, settings).map((a) => a.name)).toEqual([
      "dhuhr",
    ]);
    expect(duePrayerAlarms(at - 15 * 60_000 - 20_000, MAKKAH, settings)).toEqual([]); // too early
    expect(duePrayerAlarms(at, MAKKAH, settings)).toEqual([]); // 15 min late = stale
  });

  test("quiet hours silence every alarm", () => {
    const settings = settingsWith({ enabled: { dhuhr: true } });
    const at = dhuhrInstant(REF, settings);
    // Bracket the local wall-clock minute the alarm would ring in.
    const probe = new Date(at + 30_000);
    const minutes = probe.getHours() * 60 + probe.getMinutes();
    const silenced = settingsWith({
      enabled: { dhuhr: true },
      quiet: { enabled: true, from: hhmm(minutes - 1), to: hhmm(minutes + 1) },
    });
    expect(duePrayerAlarms(at + 30_000, MAKKAH, silenced)).toEqual([]);
    // The same alarm fires once quiet hours end.
    const unsilenced = settingsWith({
      enabled: { dhuhr: true },
      quiet: { enabled: false, from: "23:00", to: "05:30" },
    });
    expect(duePrayerAlarms(at + 30_000, MAKKAH, unsilenced)).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ *
 * Settings persistence + migration
 * ------------------------------------------------------------------ */

describe("alarm settings persistence", () => {
  test("defaults are the full adhan at a sensible volume", () => {
    const d = loadPrayerSettings().reminders;
    expect(d.sound).toBe("adhan");
    expect(d.volume).toBe(80);
    expect(d.notify).toBe(true);
    expect(d.quiet.enabled).toBe(false);
  });

  test("legacy sound ids migrate without losing the user's intent", () => {
    const put = (sound: unknown) => {
      store.set(KEY, JSON.stringify({ reminders: { sound } }));
    };
    put("chime"); // v1 id
    expect(loadPrayerSettings().reminders.sound).toBe("bells");
    put("melody"); // two-tone era
    expect(loadPrayerSettings().reminders.sound).toBe("melody");
    put("adhan");
    expect(loadPrayerSettings().reminders.sound).toBe("adhan");
    put("nonsense");
    expect(loadPrayerSettings().reminders.sound).toBe("adhan"); // default
  });

  test("volume, lead 15, notify, adhan recording and quiet hours round-trip", () => {
    store.set(
      KEY,
      JSON.stringify({
        reminders: {
          sound: "fajr-adhan",
          adhanTrack: "doha-adhan-b",
          volume: 55,
          leadMinutes: 15,
          notify: false,
          vibrate: false,
          quiet: { enabled: true, from: "22:15", to: "05:45" },
        },
      }),
    );
    const r = loadPrayerSettings().reminders;
    expect(r.sound).toBe("fajr-adhan");
    expect(r.adhanTrack).toBe("doha-adhan-b");
    expect(r.volume).toBe(55);
    expect(r.leadMinutes).toBe(15);
    expect(r.notify).toBe(false);
    expect(r.vibrate).toBe(false);
    expect(r.quiet).toEqual({ enabled: true, from: "22:15", to: "05:45" });
  });

  test("bad stored values fall back to sane defaults", () => {
    store.set(
      KEY,
      JSON.stringify({
        reminders: {
          sound: 42,
          adhanTrack: "not-a-track",
          volume: 900,
          leadMinutes: 7,
          quiet: { enabled: true, from: "25:00", to: null },
        },
      }),
    );
    const r = loadPrayerSettings().reminders;
    expect(r.sound).toBe("adhan");
    expect(r.adhanTrack).toBe(DEFAULT_ADHAN_TRACK);
    expect(r.volume).toBe(100); // clamped
    expect(r.leadMinutes).toBe(0); // unknown lead → at prayer time
    expect(r.quiet.from).toBe("23:00");
    expect(r.quiet.to).toBe("05:30");
  });
});

/* ------------------------------------------------------------------ *
 * Sound catalog
 * ------------------------------------------------------------------ */

describe("adhan catalog", () => {
  test("only verified archive.org recordings ship", () => {
    expect(ADHAN_RECORDINGS).toHaveLength(3);
    for (const rec of ADHAN_RECORDINGS) {
      expect(rec.url.startsWith("https://archive.org/download/")).toBe(true);
      expect(rec.license).toContain("Public Domain");
      expect(isAdhanTrackId(rec.id)).toBe(true);
    }
  });

  test("the default recording is a full adhan; Fajr maps to the Fajr recording", () => {
    expect(getAdhanRecording(DEFAULT_ADHAN_TRACK).kind).toBe("standard");
    expect(getAdhanRecording(FAJR_ADHAN_TRACK).kind).toBe("fajr");
    expect(STANDARD_ADHAN_TRACKS).toHaveLength(2);
    expect(isAdhanTrackId("doha-fajr")).toBe(true);
    expect(isAdhanTrackId("fake")).toBe(false);
  });
});

describe("alarm sound playback", () => {
  test("every sound id is safe to start and stop without Web Audio or <audio>", () => {
    for (const sound of ["adhan", "fajr-adhan", "bells", "melody", "silent"] as const) {
      expect(() => playAlarmSound(sound, { volume: 80, isFajr: sound === "adhan" })).not.toThrow();
      expect(() => stopAlarmSound()).not.toThrow();
    }
  });
});
