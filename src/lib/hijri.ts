/**
 * Hijri calendar helpers for the calendar page.
 *
 * All conversion goes through Intl with the Umm al-Qura calendar (the
 * official Saudi calendar, same source the Home page uses), so there is no
 * hand-rolled arithmetic to drift. Actual observance depends on local moon
 * sighting — the UI always carries that note.
 */

export interface HijriParts {
  day: number;
  month: number; // 1-12
  year: number;
}

/* ------------------------------------------------------------------ */
/* Manual adjustment (phase 2)                                          */
/* ------------------------------------------------------------------ */

const OFFSET_KEY = "noor:hijriOffset";
const OFFSET_MIN = -2;
const OFFSET_MAX = 2;

/**
 * User-set day adjustment (−2..+2) applied to every displayed Hijri date —
 * for communities whose local moon sighting differs from the Umm al-Qura
 * calendar. Stored on this device.
 */
export function getHijriOffset(): number {
  try {
    const n = Number(localStorage.getItem(OFFSET_KEY));
    if (Number.isFinite(n)) return Math.min(OFFSET_MAX, Math.max(OFFSET_MIN, Math.round(n)));
  } catch {
    /* storage unavailable */
  }
  return 0;
}

export function setHijriOffset(days: number): void {
  try {
    localStorage.setItem(
      OFFSET_KEY,
      String(Math.min(OFFSET_MAX, Math.max(OFFSET_MIN, Math.round(days)))),
    );
  } catch {
    /* storage unavailable */
  }
}

export const HIJRI_OFFSET_MIN = OFFSET_MIN;
export const HIJRI_OFFSET_MAX = OFFSET_MAX;

/** Shift a date by the stored adjustment. */
export function applyHijriOffset(date: Date): Date {
  const offset = getHijriOffset();
  if (offset === 0) return date;
  const d = new Date(date);
  d.setDate(d.getDate() + offset);
  return d;
}

/** Hijri day/month/year for a date via Intl. Null when the calendar is unsupported.
 *  Pass `offset` explicitly (including 0) to bypass the stored adjustment —
 *  used by the date converter so its result matches the raw calendar. */
export function hijriParts(date: Date, offset?: number): HijriParts | null {
  const shifted =
    offset === undefined
      ? applyHijriOffset(date)
      : offset === 0
        ? date
        : (() => {
            const d = new Date(date);
            d.setDate(d.getDate() + offset);
            return d;
          })();
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).formatToParts(shifted);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    const day = Number(get("day"));
    const month = Number(get("month"));
    const year = Number((get("year") ?? "").replace(/\D/g, ""));
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
      return null;
    }
    return { day, month, year };
  } catch {
    return null;
  }
}

/** Long Hijri month name for a date (e.g. "Ramaḍān"), null if unsupported. */
export function hijriMonthLabel(date: Date): string | null {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      month: "long",
      year: "numeric",
    }).format(applyHijriOffset(date));
  } catch {
    return null;
  }
}

/** Hijri month names, English (1-12 → index 0-11). */
export const HIJRI_MONTHS_EN = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qi'dah",
  "Dhu al-Hijjah",
] as const;

/** Hijri month names, Arabic script. */
export const HIJRI_MONTHS_AR = [
  "مُحَرَّم",
  "صَفَر",
  "رَبِيع ٱلْأَوَّل",
  "رَبِيع ٱلثَّانِي",
  "جُمَادَىٰ ٱلْأُولَىٰ",
  "جُمَادَىٰ ٱلثَّانِيَة",
  "رَجَب",
  "شَعْبَان",
  "رَمَضَان",
  "شَوَّال",
  "ذُو ٱلْقَعْدَة",
  "ذُو ٱلْحِجَّة",
] as const;

/**
 * Hijri → Gregorian conversion: finds the calendar date whose Umm al-Qura
 * parts match the given Hijri day/month/year. A civil-calendar estimate seeds
 * the search, then nearby days are checked against Intl — no invented
 * arithmetic. Returns null when no match exists (e.g. day 30 of a 29-day
 * month in this calendar).
 */
export function hijriToGregorian(day: number, month: number, year: number): Date | null {
  if (
    !Number.isInteger(day) || day < 1 || day > 30 ||
    !Number.isInteger(month) || month < 1 || month > 12 ||
    !Number.isInteger(year) || year < 1200 || year > 1600
  ) {
    return null;
  }
  // Civil (tabular) Islamic calendar estimate — only a search seed. The
  // constant is calibrated so the seed lands within days of the real Umm
  // al-Qura date in the modern era; the window below covers a full lunar
  // month anyway, because correctness comes from the Intl verification, never
  // from this arithmetic.
  const jd =
    Math.floor((11 * year + 3) / 30) + 354 * year + 30 * month - Math.floor((month - 1) / 2) + day + 1948055;
  const seed = (jd - 2440588) * 86400000;
  for (let i = -32; i <= 32; i++) {
    const d = new Date(seed + i * 86400000);
    d.setHours(12, 0, 0, 0); // midday: safe across time zones
    const h = hijriParts(d, 0);
    if (h && h.day === day && h.month === month && h.year === year) {
      const out = new Date(d);
      out.setHours(0, 0, 0, 0);
      return out;
    }
  }
  return null;
}

export interface IslamicEvent {
  /** Hijri month, 1-12. */
  month: number;
  /** Hijri day of month. */
  day: number;
  title: string;
  note: string;
}

/** Fixed-date Islamic events (Umm al-Qura; observance can vary ±1 day). */
export const ISLAMIC_EVENTS: IslamicEvent[] = [
  { month: 1, day: 1, title: "Islamic New Year", note: "First of Muḥarram." },
  { month: 1, day: 10, title: "ʿĀshūrāʾ", note: "The day of Ṣaḥīḥ Muslim — fasting is recommended." },
  { month: 3, day: 12, title: "Mawlid an-Nabī", note: "Birthday of the Prophet ﷺ (most scholarly view)." },
  { month: 7, day: 27, title: "Isrāʾ & Miʿrāj", note: "The Night Journey and ascension." },
  { month: 8, day: 15, title: "Laylat al-Barāʾah", note: "The night of mid-Shaʿbān." },
  { month: 9, day: 1, title: "First of Ramaḍān", note: "The month of fasting begins." },
  { month: 9, day: 27, title: "Laylat al-Qadr (likely)", note: "The Night of Decree — seek it in the odd nights of the last ten." },
  { month: 10, day: 1, title: "Eid al-Fiṭr", note: "The festival breaking the fast." },
  { month: 12, day: 9, title: "Yawm al-ʿArafah", note: "The day of ʿArafah — fasting and duʿāʾ." },
  { month: 12, day: 10, title: "Eid al-Aḍḥā", note: "The festival of sacrifice." },
];

/** Events falling on a given Hijri day. */
export function eventsOn(month: number, day: number): IslamicEvent[] {
  return ISLAMIC_EVENTS.filter((e) => e.month === month && e.day === day);
}
