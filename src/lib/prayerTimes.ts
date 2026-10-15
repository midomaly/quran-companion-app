/**
 * Astronomical prayer time calculation — the standard PrayTimes.org-style
 * algorithm (solar position from mean anomaly / apparent longitude, hour
 * angles per prayer), implemented from first principles so it works fully
 * offline with no API dependency.
 *
 * Validated in tests/prayer.test.ts against Aladhan API reference times for
 * London (MWL, winter + summer/DST), Makkah (Umm al-Qura) and New York
 * (ISNA) — every prayer must land within 2 minutes of the reference.
 *
 * Conventions:
 * - lat/lng in degrees, **longitude positive east**, latitude positive north.
 * - utcOffsetHours: hours east of UTC for the target date (DST included) —
 *   use utcOffsetHoursFor(timeZone, date) which derives it via Intl.
 * - Returned times are decimal hours on the local clock (may be < 0 or > 24
 *   at extreme latitudes; formatHours wraps for display).
 * - null means the sun never reaches the required angle that day (polar
 *   regions); the UI must fall back gracefully.
 */

export type PrayerName = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

/** Ordered dawn → night; sunrise is not a prayer but drives "next event". */
export const PRAYER_ORDER: PrayerName[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export interface CalculationMethod {
  id: string;
  label: string;
  /** Dawn depression angle in degrees below the horizon. */
  fajrAngle: number;
  /** Isha depression angle (degrees) — absent when a fixed interval is used. */
  ishaAngle?: number;
  /** Isha as minutes after Maghrib (Umm al-Qura) — absent when angle-based. */
  ishaMinutes?: number;
  /** Maghrib depression angle; 0 (default) means sunset. */
  maghribAngle?: number;
  note: string;
}

export const CALCULATION_METHODS: CalculationMethod[] = [
  { id: "mwl", label: "Muslim World League", fajrAngle: 18, ishaAngle: 17, note: "Used across Europe, the Far East and much of the world." },
  { id: "isna", label: "ISNA — North America", fajrAngle: 15, ishaAngle: 15, note: "Islamic Society of North America." },
  { id: "egypt", label: "Egyptian General Authority", fajrAngle: 19.5, ishaAngle: 17.5, note: "Egypt, Syria, Iraq, Lebanon, Malaysia, parts of Africa." },
  { id: "makkah", label: "Umm al-Qura, Makkah", fajrAngle: 18.5, ishaMinutes: 90, note: "Isha is 90 minutes after Maghrib (Saudi Arabia)." },
  { id: "karachi", label: "University of Karachi", fajrAngle: 18, ishaAngle: 18, note: "Pakistan, Bangladesh, India, Afghanistan." },
];

export const DEFAULT_METHOD_ID = "mwl";

/** 1 = standard (Shafi'i, Maliki, Hanbali), 2 = Hanafi. */
export type AsrFactor = 1 | 2;

export interface PrayerLocation {
  lat: number;
  lng: number;
  /** Hours east of UTC for the computed date, DST included. */
  utcOffsetHours: number;
}

export interface YearMonthDay {
  year: number;
  month: number; // 1-12
  day: number;
}

export type PrayerTimes = Record<PrayerName, number | null>;

const DEG = Math.PI / 180;

const dsin = (d: number) => Math.sin(d * DEG);
const dcos = (d: number) => Math.cos(d * DEG);
const dtan = (d: number) => Math.tan(d * DEG);
const darcsin = (x: number) => Math.asin(x) / DEG;
const darccos = (x: number) => Math.acos(x) / DEG;
const darccot = (x: number) => Math.atan(1 / x) / DEG;

const fixAngle = (a: number) => ((a % 360) + 360) % 360;
const fixHour = (h: number) => ((h % 24) + 24) % 24;

/** Julian day number for a calendar date at 0h UT. */
export function julianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5
  );
}

/** Sun declination (deg) and equation of time (hours) for a Julian day. */
export function sunPosition(jd: number): { decl: number; eqt: number } {
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d); // mean anomaly
  const q = fixAngle(280.459 + 0.98564736 * d); // mean longitude
  const l = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g)); // apparent longitude
  const e = 23.439 - 0.00000036 * d; // obliquity
  const ra = fixAngle(Math.atan2(dcos(e) * dsin(l), dcos(l)) / DEG) / 15; // hours
  // Equation of time, wrapped into [-12, 12) so downstream math is stable.
  const eqt = fixHour(q / 15 - ra + 12) - 12;
  const decl = darcsin(dsin(e) * dsin(l));
  return { decl, eqt };
}

export function getMethod(id: string): CalculationMethod {
  return CALCULATION_METHODS.find((m) => m.id === id) ?? CALCULATION_METHODS[0];
}

export interface ComputeOptions {
  /** Method id from CALCULATION_METHODS (default: mwl). */
  method?: string;
  /** 1 = standard Asr, 2 = Hanafi (default: 1). */
  asrFactor?: AsrFactor;
  /**
   * What to do when the sun never reaches the required angle (high
   * latitudes, e.g. Fajr in a northern summer). "angleBased" (default,
   * matching Aladhan/PrayTimes) takes a fraction of the night equal to
   * angle/60 of it; "none" leaves the prayer null.
   */
  highLatitudeRule?: "none" | "angleBased";
}

/** Shift a y/m/d by whole days (UTC calendar math, no DST involved). */
export function shiftDate(date: YearMonthDay, days: number): YearMonthDay {
  const dt = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

/**
 * Compute the day's prayer times for a location and date.
 * Returns decimal local-clock hours; null where the sun never reaches the
 * required altitude (high latitudes) — then applies the high-latitude rule.
 */
export function computePrayerTimes(
  date: YearMonthDay,
  loc: PrayerLocation,
  options: ComputeOptions = {},
): PrayerTimes {
  const times = computeBase(date, loc, options);
  const rule = options.highLatitudeRule ?? "angleBased";
  if (rule !== "angleBased") return times;

  const method = getMethod(options.method ?? DEFAULT_METHOD_ID);

  // Fajr belongs to the night before today's sunrise: sunrise(D) − sunset(D−1).
  if (times.fajr === null && times.sunrise !== null) {
    const prev = computeBase(shiftDate(date, -1), loc, options);
    if (prev.maghrib !== null) {
      // Nights cross midnight — wrap the difference into [0, 24).
      const night = fixHour(times.sunrise - prev.maghrib);
      times.fajr = times.sunrise - (method.fajrAngle / 60) * night;
    }
  }

  // Isha extends the night after today's maghrib: sunrise(D+1) − maghrib(D).
  if (times.isha === null && times.maghrib !== null && method.ishaAngle !== undefined) {
    const next = computeBase(shiftDate(date, 1), loc, options);
    if (next.sunrise !== null) {
      const night = fixHour(next.sunrise - times.maghrib);
      times.isha = times.maghrib + (method.ishaAngle / 60) * night;
    }
  }

  return times;
}

/** Raw astronomical times (no high-latitude adjustment). */
function computeBase(
  date: YearMonthDay,
  loc: PrayerLocation,
  options: ComputeOptions,
): PrayerTimes {
  const method = getMethod(options.method ?? DEFAULT_METHOD_ID);
  const asrFactor: AsrFactor = options.asrFactor ?? 1;
  const { lat, lng, utcOffsetHours: tz } = loc;
  const jd0 = julianDay(date.year, date.month, date.day);

  /** Sun position at a given local-clock time on the target date. */
  const sunAt = (localHours: number) =>
    sunPosition(jd0 + (localHours - tz) / 24);

  /** Solar noon (Dhuhr) with one refinement pass. */
  const midDay = (guess: number): number => {
    let t = guess;
    for (let i = 0; i < 2; i++) {
      const { eqt } = sunAt(t);
      t = 12 - eqt - lng / 15 + tz;
    }
    return t;
  };

  /** Hour angle (hours) for a given solar altitude; null if unreachable. */
  const hourAngleForAltitude = (altDeg: number, decl: number): number | null => {
    const x = (dsin(altDeg) - dsin(lat) * dsin(decl)) / (dcos(lat) * dcos(decl));
    if (x < -1 || x > 1) return null;
    return darccos(x) / 15;
  };

  /** Morning/evening event for an altitude, refined over a few passes. */
  const eventAtAltitude = (
    altDeg: number,
    guess: number,
    direction: "morning" | "evening",
  ): number | null => {
    let t = guess;
    for (let i = 0; i < 3; i++) {
      const noon = midDay(t);
      const { decl } = sunAt(t);
      const h = hourAngleForAltitude(altDeg, decl);
      if (h === null) return null;
      t = direction === "morning" ? noon - h : noon + h;
    }
    return t;
  };

  const dhuhr = midDay(12);

  // Standard refraction + solar-diameter altitude for rise/set (0.833°).
  const horizon = 0.833;
  const fajr = eventAtAltitude(-method.fajrAngle, dhuhr - 6, "morning");
  const sunrise = eventAtAltitude(-horizon, dhuhr - 6, "morning");
  const sunset = eventAtAltitude(-horizon, dhuhr + 6, "evening");

  // Asr: altitude where a shadow equals factor + the noon-ish shadow length.
  const asrDecl = sunAt(dhuhr + 3.5).decl;
  const asrAlt = darccot(asrFactor + dtan(Math.abs(lat - asrDecl)));
  const asr = eventAtAltitude(asrAlt, dhuhr + 3.5, "evening");

  const maghrib =
    sunset === null
      ? null
      : sunset + (method.maghribAngle ?? 0) / 15;
  const isha =
    method.ishaMinutes !== undefined
      ? maghrib === null
        ? null
        : maghrib + method.ishaMinutes / 60
      : eventAtAltitude(-(method.ishaAngle ?? 17), dhuhr + 6.5, "evening");

  return { fajr, sunrise, dhuhr, asr, maghrib, isha };
}

/**
 * UTC offset in hours for an IANA time zone on a given date, DST included
 * (derived from Intl so it stays correct for any zone/year).
 */
export function utcOffsetHoursFor(timeZone: string, date: YearMonthDay): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const instant = Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0);
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(instant))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return Math.round((asUtc - instant) / 60000) / 60;
}

/** Format decimal hours as "HH:MM" on a 24h clock (wraps past 24 / below 0). */
export function formatHours(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours)) return "—";
  const total = ((Math.round(hours * 60) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Round decimal hours to whole minutes (for comparisons / countdowns). */
export function toMinutes(hours: number | null): number | null {
  if (hours === null || !Number.isFinite(hours)) return null;
  return Math.round(hours * 60);
}
