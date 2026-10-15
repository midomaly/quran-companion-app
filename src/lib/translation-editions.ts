/**
 * Verified Qur'an translation editions available through the AlQuran Cloud
 * API. Every entry below was verified live against
 * `GET /v1/surah/1/{identifier}` (HTTP 200 with real ayah text) before being
 * listed here — do not add an identifier without verifying it serves content.
 *
 * These are published, attributed translations of the Qur'an (each translator
 * is named), served from the same source as the Uthmani text. The interface
 * language (src/lib/i18n.tsx) is separate: switching the UI to Yoruba does
 * NOT imply a Yoruba Qur'an translation exists — no verified Yoruba
 * translation is served by this source, so we never substitute one.
 *
 * Source: https://api.alquran.cloud/v1/edition/type/translation (124 editions;
 * the subset below covers the languages this app supports, plus the most
 * widely-used English editions).
 */

export interface TranslationEdition {
  /** AlQuran Cloud edition identifier, e.g. "en.sahih" */
  id: string;
  /** Translator / edition name as attributed below */
  name: string;
  /** ISO-ish language code, used for grouping and labels */
  lang: "en" | "fr" | "ha" | "id" | "tr";
  /** Human label including the language, shown in the picker */
  label: string;
}

export const TRANSLATIONS: TranslationEdition[] = [
  { id: "en.sahih", name: "Saheeh International", lang: "en", label: "English — Saheeh International" },
  { id: "en.pickthall", name: "Muhammad Marmaduke Pickthall", lang: "en", label: "English — Pickthall" },
  { id: "en.yusufali", name: "Abdullah Yusuf Ali", lang: "en", label: "English — Yusuf Ali" },
  { id: "en.hilali", name: "Hilali & Khan", lang: "en", label: "English — Hilali & Khan" },
  { id: "fr.hamidullah", name: "Muhammad Hamidullah", lang: "fr", label: "Français — Hamidullah" },
  { id: "ha.gumi", name: "Sheikh Abubakar Mahmud Gumi", lang: "ha", label: "Hausa — Gumi" },
  { id: "id.indonesian", name: "Bahasa Indonesia (Tim Kemajuan Al-Qur'an)", lang: "id", label: "Indonesia — Kemenag" },
  { id: "tr.diyanet", name: "Diyanet İşleri Başkanlığı", lang: "tr", label: "Türkçe — Diyanet" },
];

export const DEFAULT_TRANSLATION_ID = "en.sahih";

export function isKnownTranslation(id: string): boolean {
  return TRANSLATIONS.some((t) => t.id === id);
}

export function translationById(id: string): TranslationEdition {
  return TRANSLATIONS.find((t) => t.id === id) ?? TRANSLATIONS[0];
}

/** Attribution string for share text and the sources list, e.g. "Saheeh International". */
export function translationEditionName(id: string): string {
  return translationById(id).name;
}
