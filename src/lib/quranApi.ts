/**
 * Qur'an data client.
 *
 * Text comes from the AlQuran Cloud API (https://api.alquran.cloud), which
 * serves Tanzil.net's Uthmani Qur'an text and the Saheeh International English
 * translation. The API is free, key-less and CORS-enabled (verified). Every
 * surah that is read once is cached in localStorage so it stays available
 * offline.
 *
 * Attribution (shown in the app's About screen):
 *  - Qur'an text: Tanzil.net, Uthmani script (CC BY 3.0) — https://tanzil.net
 *  - Translation: Saheeh International
 *  - Verse audio: cdn.islamic.network
 *
 * This module NEVER generates or alters scripture: it only fetches, caches and
 * hands back what the sources returned (plus stripping a stray BOM character).
 */

import { isValidSurah } from "./surahs";
import {
  DEFAULT_TRANSLATION_ID,
  isKnownTranslation,
  translationEditionName,
} from "./translation-editions";

export {
  TRANSLATIONS,
  isKnownTranslation,
  translationEditionName,
  DEFAULT_TRANSLATION_ID,
  type TranslationEdition,
} from "./translation-editions";

const API_BASE = "https://api.alquran.cloud/v1";
const AUDIO_BASE = "https://cdn.islamic.network/quran/audio";
const REQUEST_TIMEOUT_MS = 15000;

const CACHE_AR_PREFIX = "noor:ar:";
const CACHE_EN_PREFIX = "noor:en:"; // legacy prefix for en.sahih
const CACHE_TR_PREFIX = "noor:tr:"; // noor:tr:{edition}:{surah}

export const ARABIC_EDITION_NAME = "Uthmani script (Tanzil.net)";
export const TRANSLATION_EDITION_NAME = "Saheeh International";

/** One ayah as returned by the source. */
export interface AyahText {
  /** Ayah number within its surah */
  n: number;
  /** Quran-wide ayah number (1..6236), used for verse audio */
  g: number;
  text: string;
}

export type QuranApiErrorKind = "offline" | "not-found" | "network" | "invalid";

export class QuranApiError extends Error {
  kind: QuranApiErrorKind;
  constructor(kind: QuranApiErrorKind, message: string) {
    super(message);
    this.name = "QuranApiError";
    this.kind = kind;
  }
}

/** Human-readable message for any thrown error. */
export function errorMessage(err: unknown): string {
  if (err instanceof QuranApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong while loading the Qur'an.";
}

export interface Reciter {
  id: string;
  name: string;
  /** Bitrate this reciter's files exist at on the CDN (verified — NOT uniform). */
  bitrate: number;
}

/**
 * Verified verse-by-verse reciters. Each reciter's bitrate and name were
 * verified against the source's own per-ayah response
 * (https://api.alquran.cloud/v1/ayah/{g}/{id} → audio URL) and by HEAD
 * requests across early/middle/final ayahs. Do not assume 128 kbps works
 * for every reciter — it does not.
 */
export const RECITERS: Reciter[] = [
  { id: "ar.alafasy", name: "Alafasy", bitrate: 128 },
  { id: "ar.husary", name: "Husary", bitrate: 128 },
  { id: "ar.husarymujawwad", name: "Husary (Mujawwad)", bitrate: 128 },
  { id: "ar.abdurrahmaansudais", name: "Abdurrahmaan As-Sudais", bitrate: 192 },
  { id: "ar.mahermuaiqly", name: "Maher Al Muaiqly", bitrate: 128 },
  { id: "ar.saoodshuraym", name: "Saood bin Ibraaheem Ash-Shuraym", bitrate: 64 },
  { id: "ar.abdullahbasfar", name: "Abdullah Basfar", bitrate: 192 },
];

export function reciterName(id: string): string {
  return RECITERS.find((r) => r.id === id)?.name ?? id;
}

export function isKnownReciter(id: string): boolean {
  return RECITERS.some((r) => r.id === id);
}

/** Direct streaming URL for one ayah (global ayah number numbering, 1..6236). */
export function ayahAudioUrl(globalAyah: number, reciterId: string): string {
  const reciter = RECITERS.find((r) => r.id === reciterId);
  const bitrate = reciter?.bitrate ?? 128;
  return `${AUDIO_BASE}/${bitrate}/${reciterId}/${globalAyah}.mp3`;
}

/* ------------------------------------------------------------------ */
/* Storage helpers                                                     */
/* ------------------------------------------------------------------ */

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : null;
    return parsed === null || parsed === undefined ? null : parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage full or unavailable — reading still works via the network. */
  }
}

/* ------------------------------------------------------------------ */
/* Fetching                                                            */
/* ------------------------------------------------------------------ */

interface ApiAyah {
  number: number;
  numberInSurah: number;
  text: string;
}

interface ApiSurahPayload {
  ayahs: ApiAyah[];
}

async function fetchJson(url: string): Promise<unknown> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new QuranApiError(
      "offline",
      "You're offline. This surah hasn't been saved on this device yet.",
    );
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 404) {
      throw new QuranApiError("not-found", "The requested Qur'an content was not found.");
    }
    if (!res.ok) {
      throw new QuranApiError("network", `The Qur'an service returned an error (${res.status}).`);
    }
    const json = (await res.json()) as { code?: number; status?: string; data?: unknown };
    if (json.code !== 200) {
      throw new QuranApiError("network", json.status || "The Qur'an service returned an error.");
    }
    if (json.data === null || json.data === undefined) {
      throw new QuranApiError("not-found", "The requested Qur'an content was not found.");
    }
    return json.data;
  } catch (err) {
    if (err instanceof QuranApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new QuranApiError("network", "The request timed out. Please try again.");
    }
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    throw new QuranApiError(
      offline ? "offline" : "network",
      offline
        ? "You're offline. This surah hasn't been saved on this device yet."
        : "Could not reach the Qur'an service. Please check your connection.",
    );
  } finally {
    clearTimeout(timer);
  }
}

function parseAyahs(payload: ApiSurahPayload): AyahText[] {
  if (!payload || !Array.isArray(payload.ayahs)) {
    throw new QuranApiError("network", "The Qur'an service returned an unexpected response.");
  }
  // Strip a stray BOM and apply Unicode NFC so combining-mark sequences
  // compare and render consistently. NFC is canonically equivalent to the
  // source bytes — no word, letter or vowelling is ever changed.
  return payload.ayahs.map((a) => ({
    n: a.numberInSurah,
    g: a.number,
    text: typeof a.text === "string" ? a.text.replace(/^\uFEFF/, "").normalize("NFC") : "",
  }));
}

/** Arabic (Uthmani) text of a surah. Cache-first, so it works offline after first read. */
export async function fetchSurahArabic(surah: number): Promise<AyahText[]> {
  if (!isValidSurah(surah)) {
    throw new QuranApiError("invalid", `Surah ${surah} does not exist.`);
  }
  const key = `${CACHE_AR_PREFIX}${surah}`;
  const cached = readCache<AyahText[]>(key);
  if (cached) return cached;
  const data = (await fetchJson(`${API_BASE}/surah/${surah}/quran-uthmani`)) as ApiSurahPayload;
  const ayahs = parseAyahs(data);
  writeCache(key, ayahs);
  return ayahs;
}

/**
 * Translation of a surah in a specific verified edition (see
 * src/lib/translation-editions.ts). Cache-first, so a downloaded edition
 * stays available offline. Unknown identifiers fall back to Saheeh
 * International — this function never invents text.
 */
export async function fetchSurahTranslation(
  surah: number,
  edition: string = DEFAULT_TRANSLATION_ID,
): Promise<AyahText[]> {
  if (!isValidSurah(surah)) {
    throw new QuranApiError("invalid", `Surah ${surah} does not exist.`);
  }
  const id = isKnownTranslation(edition) ? edition : DEFAULT_TRANSLATION_ID;
  // en.sahih keeps its historical cache key so previously saved surahs still
  // count as downloaded.
  const key =
    id === DEFAULT_TRANSLATION_ID
      ? `${CACHE_EN_PREFIX}${surah}`
      : `${CACHE_TR_PREFIX}${id}:${surah}`;
  const cached = readCache<AyahText[]>(key);
  if (cached) return cached;
  const data = (await fetchJson(`${API_BASE}/surah/${surah}/${id}`)) as ApiSurahPayload;
  const ayahs = parseAyahs(data);
  writeCache(key, ayahs);
  return ayahs;
}

/* ------------------------------------------------------------------ */
/* Tafsir (commentary)                                                 */
/* ------------------------------------------------------------------ */

/**
 * Tafsir resources, served by the Qur'an.com API (https://api.quran.com,
 * public, CORS-enabled — verified). Two recognised sources are offered:
 *
 *  - id 169: Tafsir Ibn Kathir (Abridged), Hafiz Ibn Kathir, English
 *  - id 16:  Tafsir al-Muyassar, King Fahd Complex, Arabic
 *
 * Tafsir is commentary, NOT scripture — the UI labels it as such. It is
 * fetched on demand (needs a connection) and never cached to storage.
 */
export interface TafsirResource {
  id: number;
  name: string;
  author: string;
  lang: "ar" | "en";
  label: string;
}

export const TAFSIRS: TafsirResource[] = [
  {
    id: 169,
    name: "Ibn Kathir (Abridged)",
    author: "Hafiz Ibn Kathir (1300–1373 CE)",
    lang: "en",
    label: "Ibn Kathir — English",
  },
  {
    id: 16,
    name: "Tafsir al-Muyassar",
    author: "King Fahd Complex for the Printing of the Holy Qur'an",
    lang: "ar",
    label: "Al-Muyassar — Arabic",
  },
];

const TAFSIR_BASE = "https://api.quran.com/api/v4/tafsirs";

/** Remove the HTML tags quran.com wraps tafsir text in. Plain text out. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Tafsir of one ayah (by its Qur'an-wide number, 1..6236). Requires a
 * connection; throws QuranApiError("offline") with a clear message when the
 * device is offline. NOT cached to localStorage — commentary is fetched on
 * demand so storage stays reserved for scripture.
 */
export async function fetchTafsir(
  globalAyah: number,
  tafsirId: number = TAFSIRS[0].id,
): Promise<string> {
  if (!Number.isInteger(globalAyah) || globalAyah < 1 || globalAyah > 6236) {
    throw new QuranApiError("invalid", `Ayah ${globalAyah} does not exist.`);
  }
  const known = TAFSIRS.find((t) => t.id === tafsirId);
  if (!known) {
    throw new QuranApiError("invalid", "Unknown tafsir source.");
  }
  const data = (await fetchJson(`${TAFSIR_BASE}/${tafsirId}/by_ayah/${globalAyah}`)) as {
    tafsir?: { text?: string };
  };
  const text = data?.tafsir?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new QuranApiError("not-found", "No tafsir is available for this ayah.");
  }
  return stripHtml(text);
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export interface SearchMatch {
  surah: number;
  surahName: string;
  ayah: number;
  text: string;
}

/** True when the query contains Arabic-script characters (then we search the Arabic text). */
export function isArabicQuery(query: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(query);
}

/**
 * Full-text search across the whole Qur'an. Searches the Arabic Uthmani text
 * for Arabic queries and the Saheeh International translation otherwise.
 */
export async function searchQuran(query: string): Promise<SearchMatch[]> {
  const q = query.trim();
  if (!q) return [];
  const edition = isArabicQuery(q) ? "quran-uthmani" : "en.sahih";
  const url = `${API_BASE}/search/${encodeURIComponent(q)}/all/${edition}`;
  try {
    const data = (await fetchJson(url)) as {
      matches?: { numberInSurah: number; text: string; surah: { number: number; englishName: string } }[];
    } | null;
    if (!data || !Array.isArray(data.matches)) return [];
    return data.matches.map((m) => ({
      surah: m.surah.number,
      surahName: m.surah.englishName,
      ayah: m.numberInSurah,
      text: typeof m.text === "string" ? m.text.replace(/^\uFEFF/, "").normalize("NFC") : "",
    }));
  } catch (err) {
    // The API reports "not found" for zero results — that is an empty result set, not an error.
    if (err instanceof QuranApiError && err.kind === "not-found") return [];
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Cache management                                                    */
/* ------------------------------------------------------------------ */

function countKeys(prefix: string): number {
  let count = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) count++;
    }
  } catch {
    /* storage unavailable */
  }
  return count;
}

/** Number of surahs whose text is saved on this device for offline reading. */
export function offlineSurahCount(): number {
  return countKeys(CACHE_AR_PREFIX);
}

export interface CacheEntry {
  surah: number;
  /** Uthmani text saved? */
  arabic: boolean;
  /** Translation saved? */
  translation: boolean;
  /** Approximate size of the saved JSON (UTF-16 units ≈ 1–2 bytes each). */
  bytes: number;
}

/** Per-surah cache inventory for the download manager. Sorted by surah. */
export function listQuranCache(): CacheEntry[] {
  const map = new Map<number, CacheEntry>();
  const entryFor = (surah: number): CacheEntry => {
    let e = map.get(surah);
    if (!e) {
      e = { surah, arabic: false, translation: false, bytes: 0 };
      map.set(surah, e);
    }
    return e;
  };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key) ?? "";
      if (key.startsWith(CACHE_AR_PREFIX)) {
        const surah = Number(key.slice(CACHE_AR_PREFIX.length));
        if (Number.isInteger(surah) && surah >= 1 && surah <= 114) {
          const e = entryFor(surah);
          e.arabic = true;
          e.bytes += value.length;
        }
      } else if (key.startsWith(CACHE_EN_PREFIX)) {
        const surah = Number(key.slice(CACHE_EN_PREFIX.length));
        if (Number.isInteger(surah) && surah >= 1 && surah <= 114) {
          const e = entryFor(surah);
          e.translation = true;
          e.bytes += value.length;
        }
      } else if (key.startsWith(CACHE_TR_PREFIX)) {
        // noor:tr:{edition}:{surah}
        const rest = key.slice(CACHE_TR_PREFIX.length);
        const colon = rest.lastIndexOf(":");
        const surah = Number(rest.slice(colon + 1));
        if (colon > 0 && Number.isInteger(surah) && surah >= 1 && surah <= 114) {
          const e = entryFor(surah);
          e.translation = true;
          e.bytes += value.length;
        }
      }
    }
  } catch {
    /* storage unavailable */
  }
  return [...map.values()].sort((a, b) => a.surah - b.surah);
}

/** Remove the saved text of one surah (Arabic + every saved translation). */
export function removeSurahCache(surah: number): void {
  try {
    localStorage.removeItem(`${CACHE_AR_PREFIX}${surah}`);
    localStorage.removeItem(`${CACHE_EN_PREFIX}${surah}`);
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${CACHE_TR_PREFIX}`) && key.endsWith(`:${surah}`)) {
        stale.push(key);
      }
    }
    stale.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
}

/** Download (fetch + cache) a surah's Arabic and translation for offline use. */
export async function downloadSurah(surah: number): Promise<void> {
  await Promise.all([
    fetchSurahArabic(surah),
    fetchSurahTranslation(surah),
  ]);
}

/** Remove all cached Qur'an text from this device. Returns how many surahs were removed. */
export function clearQuranCache(): number {
  const removed = countKeys(CACHE_AR_PREFIX) + countKeys(CACHE_EN_PREFIX);
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(CACHE_AR_PREFIX) ||
          key.startsWith(CACHE_EN_PREFIX) ||
          key.startsWith(CACHE_TR_PREFIX))
      ) {
        keys.push(key);
      }
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
  return removed;
}
