/**
 * Live Qur'an data integrity check for Noor Al-Islam.
 *
 * Run: bun run verify:data
 *
 * Fetches all 114 surahs through the app's own data client (src/lib/quranApi)
 * and verifies against the embedded metadata:
 *   - ayah counts per surah (sum = 6,236)
 *   - in-surah ayah numbering is sequential 1..N
 *   - Quran-wide ayah numbers match globalAyahNumber() (drives verse audio URLs)
 *   - basmala appears as the ayah-1 prefix exactly where expected
 *   - the display split never alters text
 *   - no BOM characters survive into the UI
 *   - second fetch is served from the offline cache (no network)
 *   - English translation and Arabic/English search return real results
 *
 * Exits non-zero on any failure. Requires network access.
 */

// In-memory localStorage polyfill so the client works under Bun.
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: (k: string, v: string) => {
    store.set(k, String(v));
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  clear: () => store.clear(),
  get length() {
    return store.size;
  },
};

// Count network calls to prove the cache works.
let fetchCount = 0;
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
  fetchCount++;
  return realFetch(...args);
}) as typeof fetch;

import { splitBasmala } from "../src/lib/quranText";
import {
  fetchSurahArabic,
  fetchSurahTranslation,
  searchQuran,
} from "../src/lib/quranApi";
import { TOTAL_AYAHS, globalAyahNumber, getSurah } from "../src/lib/surahs";

let failures = 0;
function check(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL  ${message}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

console.log("Verifying all 114 surahs against the live source…");

let totalAyahs = 0;
for (let n = 1; n <= 114; n++) {
  const ayahs = await fetchSurahArabic(n);
  const meta = getSurah(n)!;
  totalAyahs += ayahs.length;

  check(ayahs.length === meta.ayahs, `surah ${n}: ${ayahs.length} ayahs fetched, expected ${meta.ayahs}`);
  check(
    ayahs.every((a, i) => a.n === i + 1),
    `surah ${n}: in-surah numbering not sequential`,
  );
  check(
    ayahs.every((a, i) => a.g === globalAyahNumber(n, i + 1)),
    `surah ${n}: Quran-wide ayah numbers mismatch`,
  );
  check(
    ayahs.every((a) => !a.text.includes("\uFEFF") && a.text.trim().length > 0),
    `surah ${n}: empty text or leftover BOM`,
  );

  // Basmala placement: the source merges it into ayah 1 of every surah
  // except Al-Faatiha (where it is ayah 1 itself) and At-Tawbah (none).
  // The display split must succeed for those and preserve the exact bytes.
  const first = ayahs[0];
  const firstSplit = splitBasmala(n, 1, first.text);
  if (n !== 1 && n !== 9) {
    check(
      firstSplit.basmala !== null,
      `surah ${n}: expected the basmala to be split off ayah 1`,
    );
    check(
      firstSplit.basmala !== null &&
        first.text.startsWith(firstSplit.basmala) &&
        first.text.endsWith(firstSplit.body),
      `surah ${n}: basmala split does not reproduce the source text`,
    );
  } else {
    check(
      firstSplit.basmala === null && firstSplit.body === first.text,
      `surah ${n}: basmala must not be split here`,
    );
  }
  for (let k = 1; k < ayahs.length; k++) {
    const s = splitBasmala(n, k + 1, ayahs[k].text);
    if (s.basmala !== null || s.body !== ayahs[k].text) {
      check(false, `surah ${n}:${k + 1}: non-first ayah was altered by the split`);
      break;
    }
  }

  if (n % 25 === 0) console.log(`  …verified ${n}/114 surahs`);
  await sleep(95); // stay under the API's per-second rate limit
}

check(totalAyahs === TOTAL_AYAHS, `total ayahs ${totalAyahs}, expected ${TOTAL_AYAHS}`);
console.log(`Checked 114 surahs, ${totalAyahs} ayahs.`);

// Offline cache: repeat fetch must not hit the network.
await fetchSurahTranslation(1); // ensure it is cached (arabic already is from the loop)
fetchCount = 0;
await fetchSurahArabic(1);
await fetchSurahTranslation(1);
check(fetchCount === 0, `cache miss: expected 0 network calls, got ${fetchCount}`);
console.log("Offline cache: repeat reads served from localStorage.");

// Translation samples.
for (const n of [1, 2, 50, 114]) {
  const tr = await fetchSurahTranslation(n);
  const meta = getSurah(n)!;
  check(tr.length === meta.ayahs, `translation surah ${n}: ${tr.length} entries, expected ${meta.ayahs}`);
  check(
    tr.every((a) => a.text.trim().length > 0 && !a.text.includes("\uFEFF")),
    `translation surah ${n}: empty or BOM text`,
  );
  await sleep(95);
}
console.log("Translation samples (1, 2, 50, 114) verified.");

// Search: English, Arabic and a query with no matches.
const en = await searchQuran("mercy");
check(en.length > 0, "English search returned no results");
await sleep(120);
const ar = await searchQuran("الرحمن");
check(ar.length > 0, "Arabic search returned no results");
await sleep(120);
const none = await searchQuran("zzqqxyzzy123");
check(Array.isArray(none) && none.length === 0, "No-match search should return an empty array");
console.log(`Search verified (English: ${en.length} matches for "mercy", Arabic: ${ar.length} for "الرحمن", no-match: ${none.length}).`);

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll live data integrity checks passed.");
