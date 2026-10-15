/**
 * Prayer time engine validation: computed times must match Aladhan API
 * reference times (fetched 2025-10-14 during development, values baked in so
 * tests run offline) within 2 minutes for every prayer.
 *
 * References (Aladhan API, standard Asr):
 * - London 14 Oct 2025 (BST, +1), MWL:      Fajr 05:32 Sunrise 07:23 Dhuhr 12:46 Asr 15:36 Maghrib 18:09 Isha 19:53
 * - London 01 Jul 2025 (BST, +1), MWL:      Fajr 02:34 Sunrise 04:48 Dhuhr 13:04 Asr 17:27 Maghrib 21:21 Isha 23:27
 * - Makkah 14 Oct 2025 (+3), Umm al-Qura:   Fajr 05:00 Sunrise 06:16 Dhuhr 12:07 Asr 15:28 Maghrib 17:57 Isha 19:27
 * - New York 14 Oct 2025 (EDT, -4), ISNA:   Fajr 05:51 Sunrise 07:06 Dhuhr 12:42 Asr 15:49 Maghrib 18:17 Isha 19:32
 * Run with: bun test
 */
import { describe, expect, test } from "bun:test";
import {
  computePrayerTimes,
  formatHours,
  getMethod,
  julianDay,
  sunPosition,
  toMinutes,
  utcOffsetHoursFor,
  type PrayerName,
  type PrayerTimes,
} from "../src/lib/prayerTimes";

const TOLERANCE_MIN = 2;

function expectClose(actual: number | null, expected: string, label: string) {
  expect(actual, `${label} should exist`).not.toBeNull();
  const [eh, em] = expected.split(":").map(Number);
  const expectedMin = eh * 60 + em;
  const actualMin = toMinutes(actual);
  const diff = Math.abs((actualMin ?? 0) - expectedMin);
  expect(diff, `${label}: got ${formatHours(actual)}, expected ${expected}`).toBeLessThanOrEqual(
    TOLERANCE_MIN,
  );
}

function checkAll(times: PrayerTimes, ref: Record<PrayerName, string>) {
  for (const name of Object.keys(ref) as PrayerName[]) {
    expectClose(times[name], ref[name], name);
  }
}

describe("computePrayerTimes vs Aladhan reference", () => {
  test("London 14 Oct 2025, Muslim World League", () => {
    const times = computePrayerTimes(
      { year: 2025, month: 10, day: 14 },
      { lat: 51.5074, lng: -0.1278, utcOffsetHours: 1 },
      { method: "mwl" },
    );
    checkAll(times, {
      fajr: "05:32",
      sunrise: "07:23",
      dhuhr: "12:46",
      asr: "15:36",
      maghrib: "18:09",
      isha: "19:53",
    });
  });

  test("London 01 Jul 2025 (DST summer), Muslim World League", () => {
    const times = computePrayerTimes(
      { year: 2025, month: 7, day: 1 },
      { lat: 51.5074, lng: -0.1278, utcOffsetHours: 1 },
      { method: "mwl" },
    );
    checkAll(times, {
      fajr: "02:34",
      sunrise: "04:48",
      dhuhr: "13:04",
      asr: "17:27",
      maghrib: "21:21",
      isha: "23:27",
    });
  });

  test("Makkah 14 Oct 2025, Umm al-Qura (Isha = Maghrib + 90 min)", () => {
    const times = computePrayerTimes(
      { year: 2025, month: 10, day: 14 },
      { lat: 21.4225, lng: 39.8262, utcOffsetHours: 3 },
      { method: "makkah" },
    );
    checkAll(times, {
      fajr: "05:00",
      sunrise: "06:16",
      dhuhr: "12:07",
      asr: "15:28",
      maghrib: "17:57",
      isha: "19:27",
    });
    // Exact fixed-interval rule: Isha is 90 minutes after Maghrib.
    expect((times.isha ?? 0) - (times.maghrib ?? 0)).toBeCloseTo(1.5, 5);
  });

  test("New York 14 Oct 2025 (EDT), ISNA", () => {
    const times = computePrayerTimes(
      { year: 2025, month: 10, day: 14 },
      { lat: 40.7128, lng: -74.006, utcOffsetHours: -4 },
      { method: "isna" },
    );
    checkAll(times, {
      fajr: "05:51",
      sunrise: "07:06",
      dhuhr: "12:42",
      asr: "15:49",
      maghrib: "18:17",
      isha: "19:32",
    });
  });
});

describe("engine internals", () => {
  test("julianDay matches known epoch anchors", () => {
    // J2000.0: 2000-01-01 12:00 TT → JD at 0h = 2451544.5
    expect(julianDay(2000, 1, 1)).toBe(2451544.5);
    // MJD anchor: 1858-11-17 → JD 2400000.5
    expect(julianDay(1858, 11, 17)).toBe(2400000.5);
  });

  test("sunPosition equation of time stays within ±17 minutes", () => {
    for (let jd = 2460000; jd < 2460365; jd += 7) {
      const { eqt, decl } = sunPosition(jd);
      expect(Math.abs(eqt)).toBeLessThan(17 / 60);
      expect(Math.abs(decl)).toBeLessThan(24); // never beyond the tropics
    }
  });

  test("times are ordered fajr < sunrise < dhuhr < asr < maghrib < isha", () => {
    const t = computePrayerTimes(
      { year: 2026, month: 6, day: 15 },
      { lat: 30.0444, lng: 31.2357, utcOffsetHours: 3 },
      { method: "egypt" },
    );
    const seq = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha];
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]!).toBeGreaterThan(seq[i - 1]!);
    }
  });

  test("polar / impossible angles return null instead of NaN", () => {
    // Midsummer at 78°N: sun never dips 18° below the horizon → no Fajr.
    const t = computePrayerTimes(
      { year: 2026, month: 6, day: 21 },
      { lat: 78, lng: 15, utcOffsetHours: 1 },
      { method: "mwl" },
    );
    expect(t.fajr).toBeNull();
    expect(Number.isNaN(t.sunrise as number)).toBe(false);
  });

  test("Hanafi Asr is later than standard Asr", () => {
    const date = { year: 2026, month: 3, day: 10 };
    const loc = { lat: 24.8607, lng: 67.0011, utcOffsetHours: 5 };
    const std = computePrayerTimes(date, loc, { method: "karachi", asrFactor: 1 });
    const hanafi = computePrayerTimes(date, loc, { method: "karachi", asrFactor: 2 });
    expect(hanafi.asr!).toBeGreaterThan(std.asr!);
  });
});

describe("helpers", () => {
  test("utcOffsetHoursFor resolves IANA zones incl. DST", () => {
    expect(utcOffsetHoursFor("Asia/Riyadh", { year: 2026, month: 1, day: 15 })).toBe(3);
    expect(utcOffsetHoursFor("America/New_York", { year: 2026, month: 1, day: 15 })).toBe(-5);
    expect(utcOffsetHoursFor("America/New_York", { year: 2026, month: 7, day: 15 })).toBe(-4);
    expect(utcOffsetHoursFor("Europe/London", { year: 2026, month: 1, day: 15 })).toBe(0);
    expect(utcOffsetHoursFor("Europe/London", { year: 2026, month: 7, day: 15 })).toBe(1);
    expect(utcOffsetHoursFor("Asia/Jakarta", { year: 2026, month: 7, day: 15 })).toBe(7);
  });

  test("formatHours wraps and pads correctly", () => {
    expect(formatHours(5.5)).toBe("05:30");
    expect(formatHours(23.999)).toBe("00:00"); // rounds to 24:00 → wraps
    expect(formatHours(-0.5)).toBe("23:30");
    expect(formatHours(24 + 1.25)).toBe("01:15");
    expect(formatHours(null)).toBe("—");
  });

  test("getMethod falls back to MWL for unknown ids", () => {
    expect(getMethod("nope").id).toBe("mwl");
    expect(getMethod("makkah").ishaMinutes).toBe(90);
  });

  test("toMinutes rounds to whole minutes", () => {
    expect(toMinutes(5.504)).toBe(330);
    expect(toMinutes(null)).toBeNull();
  });
});
