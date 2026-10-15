/**
 * Gregorian and Hijri date formatting.
 *
 * The Hijri date uses the device's ICU implementation with the Umm al-Qura
 * calendar (Intl), which is the official calendar of Saudi Arabia. Actual
 * Islamic dates depend on local moon sighting — the UI always shows a note to
 * that effect. The user's manual day adjustment (src/lib/hijri.ts) is
 * applied here so every surface agrees. When the environment lacks the
 * calendar, we return null instead of guessing.
 */

import { applyHijriOffset } from "./hijri";

export function formatGregorianLong(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

export function formatGregorianShort(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

/** Hijri date in Latin script, e.g. "18 Jumada al-Awwal 1448 AH". Null if unsupported. */
export function formatHijri(date: Date): string | null {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(applyHijriOffset(date));
  } catch {
    return null;
  }
}

/** Hijri date in Arabic script for display next to the Latin version. */
export function formatHijriArabic(date: Date): string | null {
  try {
    return new Intl.DateTimeFormat("ar-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(applyHijriOffset(date));
  } catch {
    return null;
  }
}

/** Time like "7:42 PM". */
export function formatTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}
