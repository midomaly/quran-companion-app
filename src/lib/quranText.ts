/**
 * Pure text helpers for rendering the Qur'an.
 *
 * The only transformation ever applied to scripture is splitting the basmala
 * off ayah 1 for ornamental display — the underlying characters are never
 * changed, reordered, or rewritten.
 */

import { getSurah } from "./surahs";

/** The basmala as it appears in the source text (Uthmani script). */
export const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

/** Invariant ending of the basmala, used to locate it even when the source
 *  writes the opening word with variant marks (see splitBasmala). */
const BASMALA_TAIL = "ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

export interface BasmalaSplit {
  /** Basmala to show as an ornamental line, or null when it isn't present as a prefix. */
  basmala: string | null;
  /** The ayah text without the basmala prefix (equals the original text otherwise). */
  body: string;
}

/**
 * In the source data the basmala is part of ayah 1 of every surah except
 * Al-Faatiha (where it IS ayah 1) and At-Tawbah (which has none). For display
 * we show it as an ornamental line above ayah 1 — split-only, text unchanged.
 */
export function splitBasmala(surah: number, ayahNumber: number, text: string): BasmalaSplit {
  if (ayahNumber !== 1 || surah === 1 || surah === 9) {
    return { basmala: null, body: text };
  }
  const trimmed = text.trimStart();

  // Exact match: slice the source's own bytes for display.
  if (trimmed.startsWith(BASMALA)) {
    const end = BASMALA.length;
    const body = trimmed.slice(end).trimStart();
    if (body) return { basmala: trimmed.slice(0, end), body };
    return { basmala: null, body: text };
  }

  // Variant opening: some source builds merge the basmala with a stray mark
  // (observed on surahs 95 and 97: "بِّسْمِ…"). Locate the invariant tail and
  // split there — both parts are still pure substrings of the source text.
  const tailIdx = trimmed.indexOf(BASMALA_TAIL);
  if (tailIdx > 0 && tailIdx < 20) {
    const end = tailIdx + BASMALA_TAIL.length;
    const head = trimmed.slice(0, end);
    if (head.startsWith("بِ") && head.includes("سْمِ")) {
      const body = trimmed.slice(end).trimStart();
      if (body) return { basmala: head, body };
    }
  }

  return { basmala: null, body: text };
}

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Convert a number to Arabic-Indic digits for ornamental ayah markers. */
export function toArabicDigits(value: number): string {
  return String(value)
    .split("")
    .map((ch) => {
      const d = Number(ch);
      return Number.isInteger(d) && d >= 0 && d <= 9 ? ARABIC_DIGITS[d] : ch;
    })
    .join("");
}

/** Short surahs used for the daily ayah rotation (all verified in the metadata table). */
export const DAILY_SURAHS = [1, 78, 87, 93, 94, 95, 97, 103, 105, 106, 108, 112, 113, 114];

/** Stable numeric key for a calendar day (local time). */
export function dayKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * Deterministic ayah-of-the-day: same pick for everyone on the same calendar
 * day, changing once per day. Picks a real reference from the metadata table.
 */
export function dailyAyahPick(date: Date): { surah: number; ayah: number } {
  const seed = dayKey(date);
  const surahNumber = DAILY_SURAHS[seed % DAILY_SURAHS.length];
  const surah = getSurah(surahNumber);
  const ayahCount = surah?.ayahs ?? 1;
  const ayah = (Math.floor(seed / DAILY_SURAHS.length) % ayahCount) + 1;
  return { surah: surahNumber, ayah };
}
