/**
 * Hijri helpers (src/lib/hijri.ts): the ±2-day manual adjustment's clamping,
 * the Umm al-Qura Intl round-trip behind the calendar converter, and the
 * converter's input validation. Conversion itself is Intl's job (no
 * hand-rolled arithmetic to drift) — these tests pin the wiring around it.
 * Run with: bun test
 */
import { beforeEach, describe, expect, test } from "bun:test";
import {
  HIJRI_OFFSET_MAX,
  HIJRI_OFFSET_MIN,
  applyHijriOffset,
  eventsOn,
  getHijriOffset,
  hijriParts,
  hijriToGregorian,
  setHijriOffset,
} from "../src/lib/hijri";

// Bun ships without localStorage; the offset helpers swallow storage errors,
// so give them a minimal one. Inert for every other suite in this process
// (they only ever read defaults).
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
};

beforeEach(() => store.clear());

describe("manual hijri adjustment", () => {
  test("clamps every stored value into −2..+2", () => {
    setHijriOffset(7);
    expect(getHijriOffset()).toBe(HIJRI_OFFSET_MAX);
    setHijriOffset(-9);
    expect(getHijriOffset()).toBe(HIJRI_OFFSET_MIN);
    setHijriOffset(1.6);
    expect(getHijriOffset()).toBe(2);
    setHijriOffset(0);
    expect(getHijriOffset()).toBe(0);
  });

  test("applyHijriOffset shifts by the stored days only", () => {
    const d = new Date(2026, 2, 19, 12); // local midday
    expect(applyHijriOffset(d)).toBe(d); // zero offset keeps the same reference
    setHijriOffset(2);
    const plus = applyHijriOffset(d);
    expect(plus.getMonth()).toBe(2);
    expect(plus.getDate()).toBe(21);
    setHijriOffset(-2);
    expect(applyHijriOffset(d).getDate()).toBe(17);
  });
});

describe("Umm al-Qura round-trip (Intl, no hand-rolled arithmetic)", () => {
  test("formatter and converter agree on a known date", () => {
    const parts = hijriParts(new Date(2026, 2, 19, 12), 0);
    expect(parts).not.toBeNull();
    if (!parts) return;
    // 19 March 2026 is 30 Ramaḍān 1447 on the Umm al-Qura calendar.
    expect(parts).toEqual({ day: 30, month: 9, year: 1447 });

    const back = hijriToGregorian(parts.day, parts.month, parts.year);
    expect(back).not.toBeNull();
    if (!back) return;
    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(2);
    expect(back.getDate()).toBe(19);
  });

  test("converts across the month boundary (1 Shawwal = Eid day)", () => {
    // 1 Shawwal 1447 is 20 March 2026 — the day after the 30 Ramaḍān above.
    const g = hijriToGregorian(1, 10, 1447);
    expect(g).not.toBeNull();
    if (!g) return;
    expect(g.getFullYear()).toBe(2026);
    expect(g.getMonth()).toBe(2);
    expect(g.getDate()).toBe(20);
    const parts = hijriParts(new Date(g.getFullYear(), g.getMonth(), g.getDate(), 12), 0);
    expect(parts).toEqual({ day: 1, month: 10, year: 1447 });
  });

  test("rejects impossible hijri input without touching Intl", () => {
    expect(hijriToGregorian(0, 9, 1447)).toBeNull();
    expect(hijriToGregorian(31, 9, 1447)).toBeNull();
    expect(hijriToGregorian(1, 13, 1447)).toBeNull();
    expect(hijriToGregorian(1.5, 9, 1447)).toBeNull();
    expect(hijriToGregorian(1, 9, 999)).toBeNull();
  });
});

describe("islamic events", () => {
  test("matches events on the exact hijri day only", () => {
    const eid = eventsOn(10, 1);
    expect(eid.some((e) => e.title.includes("Eid al-Fiṭr"))).toBe(true);
    expect(eventsOn(10, 2)).toHaveLength(0);
    expect(eventsOn(9, 1)[0]?.title).toContain("Ramaḍān");
  });
});
