/**
 * Khatmah (Qur'an completion) planner — phase 2.
 *
 * A plan is a target completion date plus a juz counter. Progress is stored
 * on this device (localStorage) — no account needed. The app never claims a
 * reading that didn't happen: progress only moves when the user logs it
 * ("+1 juz" or "I'm here" from their last-read position).
 *
 * Units: 30 juz (verified split, src/lib/surahs.ts JUZ table). One juz is
 * roughly 20 of the standard 604 pages — shown as an approximation only.
 */

import { JUZ } from "./surahs";

const PLAN_KEY = "noor:plan";

export const TOTAL_JUZ = 30;
/** Standard Madinah mushaf has 604 pages; per-juz page count is ~20.1. */
export const TOTAL_PAGES = 604;

export interface PlanLogEntry {
  /** Local day the progress was logged, "YYYY-MM-DD" */
  day: string;
  /** Cumulative juz count at the end of that day */
  juzDone: number;
}

export interface ReadingPlan {
  /** ms epoch (start of local day) the user wants to finish by */
  targetDate: number;
  /** ms epoch the plan was created */
  createdAt: number;
  /** Cumulative juz completed (0..30) */
  juzDone: number;
  /** Per-day cumulative history for the streak view */
  log: PlanLogEntry[];
}

export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Start of the local day for a ms timestamp. */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function sanitizePlan(raw: unknown): ReadingPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<ReadingPlan>;
  if (typeof p.targetDate !== "number" || !Number.isFinite(p.targetDate)) return null;
  const juzDone =
    typeof p.juzDone === "number" && Number.isFinite(p.juzDone)
      ? Math.min(TOTAL_JUZ, Math.max(0, Math.round(p.juzDone)))
      : 0;
  const log = Array.isArray(p.log)
    ? p.log
        .filter(
          (e): e is PlanLogEntry =>
            !!e && typeof e === "object" && typeof e.day === "string" &&
            typeof e.juzDone === "number",
        )
        .slice(-365)
    : [];
  return {
    targetDate: startOfDay(p.targetDate),
    createdAt: typeof p.createdAt === "number" ? p.createdAt : Date.now(),
    juzDone,
    log,
  };
}

export function loadPlan(): ReadingPlan | null {
  try {
    return sanitizePlan(safeParse<unknown>(localStorage.getItem(PLAN_KEY)));
  } catch {
    return null;
  }
}

export function savePlan(plan: ReadingPlan): void {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* storage unavailable */
  }
}

export function clearPlan(): void {
  try {
    localStorage.removeItem(PLAN_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Create a plan that finishes `days` days from today (target = that day's start). */
export function createPlan(days: number): ReadingPlan {
  const target = startOfDay(Date.now() + Math.max(1, Math.round(days)) * DAY_MS);
  const plan: ReadingPlan = {
    targetDate: target,
    createdAt: Date.now(),
    juzDone: 0,
    log: [],
  };
  savePlan(plan);
  return plan;
}

/** Log progress: cumulative juz count (0..30), stamped with today. */
export function logProgress(plan: ReadingPlan, juzDone: number): ReadingPlan {
  const clamped = Math.min(TOTAL_JUZ, Math.max(0, Math.round(juzDone)));
  const today = dayKey();
  const log = plan.log.filter((e) => e.day !== today);
  log.push({ day: today, juzDone: clamped });
  log.sort((a, b) => a.day.localeCompare(b.day));
  const next: ReadingPlan = { ...plan, juzDone: clamped, log };
  savePlan(next);
  return next;
}

/**
 * Juz number (1..30) containing a {surah, ayah} position, from the verified
 * JUZ start table. Position before the first start (impossible for real
 * ayahs) returns 1.
 */
export function juzAtPosition(surah: number, ayah: number): number {
  let count = 0;
  for (const j of JUZ) {
    if (j.surah < surah || (j.surah === surah && j.ayah <= ayah)) count++;
    else break;
  }
  return Math.min(TOTAL_JUZ, Math.max(1, count));
}

export interface PlanStats {
  /** Whole days left until the target (>= 0) */
  daysLeft: number;
  /** Total days the plan spans (>= 1) */
  totalDays: number;
  /** Juz still to read */
  juzLeft: number;
  /** Suggested juz per day to finish on time (0 when finished) */
  perDay: number;
  /** Approximate pages per day at that pace */
  pagesPerDay: number;
  /** Juz expected by today at the ideal pace */
  expectedJuz: number;
  /** True when the target date has passed with juz remaining */
  overdue: boolean;
  /** True when all 30 juz are done */
  complete: boolean;
  /** Days since the user logged any progress (null if no log) */
  streakBroken: boolean;
}

export function planStats(plan: ReadingPlan, now: number = Date.now()): PlanStats {
  const today = startOfDay(now);
  const totalDays = Math.max(1, Math.round((plan.targetDate - startOfDay(plan.createdAt)) / DAY_MS));
  const daysLeft = Math.max(0, Math.round((plan.targetDate - today) / DAY_MS));
  const juzLeft = Math.max(0, TOTAL_JUZ - plan.juzDone);
  const perDay = juzLeft > 0 ? juzLeft / Math.max(1, daysLeft) : 0;
  const pagesPerDay = Math.max(1, Math.round((perDay * TOTAL_PAGES) / TOTAL_JUZ));
  const elapsed = Math.min(
    totalDays,
    Math.max(0, Math.round((today - startOfDay(plan.createdAt)) / DAY_MS)),
  );
  const expectedJuz = Math.min(TOTAL_JUZ, Math.round((TOTAL_JUZ * elapsed) / totalDays));
  const last = plan.log[plan.log.length - 1];
  const lastWasYesterday = last ? last.day === dayKey(new Date(now - DAY_MS)) : false;
  const streakBroken = !!last && last.day !== dayKey() && !lastWasYesterday;
  return {
    daysLeft,
    totalDays,
    juzLeft,
    perDay,
    pagesPerDay,
    expectedJuz,
    overdue: daysLeft === 0 && juzLeft > 0,
    complete: juzLeft === 0,
    streakBroken,
  };
}
