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

const API_BASE = "https://api.alquran.cloud/v1";
const AUDIO_BASE = "https://cdn.islamic.network/quran/audio";
const REQUEST_TIMEOUT_MS = 15000;

const CACHE_AR_PREFIX = "noor:ar:";
const CACHE_EN_PREFIX = "noor:en:";

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

/** Saheeh International English translation of a surah. Cache-first. */
export async function fetchSurahTranslation(surah: number): Promise<AyahText[]> {
  if (!isValidSurah(surah)) {
    throw new QuranApiError("invalid", `Surah ${surah} does not exist.`);
  }
  const key = `${CACHE_EN_PREFIX}${surah}`;
  const cached = readCache<AyahText[]>(key);
  if (cached) return cached;
  const data = (await fetchJson(`${API_BASE}/surah/${surah}/en.sahih`)) as ApiSurahPayload;
  const ayahs = parseAyahs(data);
  writeCache(key, ayahs);
  return ayahs;
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

/** Remove all cached Qur'an text from this device. Returns how many surahs were removed. */
export function clearQuranCache(): number {
  const removed = countKeys(CACHE_AR_PREFIX) + countKeys(CACHE_EN_PREFIX);
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(CACHE_AR_PREFIX) || key.startsWith(CACHE_EN_PREFIX))) {
        keys.push(key);
      }
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
  return removed;
}
