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

/** Hijri day/month/year for a date via Intl. Null when the calendar is unsupported. */
export function hijriParts(date: Date): HijriParts | null {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).formatToParts(date);
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
    }).format(date);
  } catch {
    return null;
  }
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
