/**
 * Reciters Library (src/lib/reciters.ts): catalog invariants for the 60-entry
 * library — exact count, unique ids, legacy-id back-compat, source mix, and
 * the three URL-building schemes (islamic.network global numbering,
 * everyayah surah+ayah numbering, mp3quran whole-surah files).
 *
 * Network availability of the CDNs is verified by scripts at catalog-build
 * time (and re-checked in CI via the workflow) — these tests pin the data
 * and the URL shapes, which is what can silently regress in code.
 *
 * Run with: bun test
 */
import { describe, expect, test } from "bun:test";
import {
  DEFAULT_RECITER_ID,
  RECITERS,
  ayahAudioUrl,
  getReciter,
  isKnownReciter,
  isPerSurahReciter,
  previewAudioUrl,
  reciterCountries,
  recitersByCountry,
  surahAudioUrl,
} from "../src/lib/reciters";

/** Ids that shipped in earlier app versions — users' saved settings depend on them. */
const LEGACY_IDS = [
  "ar.alafasy",
  "ar.husary",
  "ar.husarymujawwad",
  "ar.abdurrahmaansudais",
  "ar.mahermuaiqly",
  "ar.saoodshuraym",
  "ar.abdullahbasfar",
];

describe("reciters catalog", () => {
  test("ships exactly 60 reciters with unique ids", () => {
    expect(RECITERS.length).toBe(60);
    const ids = new Set(RECITERS.map((r) => r.id));
    expect(ids.size).toBe(60);
  });

  test("every entry has a name, country and known source", () => {
    for (const r of RECITERS) {
      expect(r.name.trim().length).toBeGreaterThan(0);
      expect(r.country.trim().length).toBeGreaterThan(0);
      expect(["islamic", "everyayah", "mp3quran"]).toContain(r.source);
      expect(r.path.length).toBeGreaterThan(0);
    }
  });

  test("legacy reciter ids from earlier versions stay valid", () => {
    for (const id of LEGACY_IDS) {
      expect(isKnownReciter(id)).toBe(true);
      expect(getReciter(id)?.source).toBe("islamic");
    }
    expect(isKnownReciter(DEFAULT_RECITER_ID)).toBe(true);
    expect(isKnownReciter("nope")).toBe(false);
  });

  test("islamic.network entries carry a plausible verified bitrate", () => {
    for (const r of RECITERS.filter((x) => x.source === "islamic")) {
      expect([64, 128, 192]).toContain(r.bitrate);
      expect(r.id.startsWith("ar.")).toBe(true);
    }
  });

  test("only mp3quran entries are whole-surah, and they build surah URLs", () => {
    for (const r of RECITERS) {
      expect(r.perSurah === true).toBe(r.source === "mp3quran");
    }
    expect(surahAudioUrl(1, "mq-idrees-abkar")).toBe(
      "https://cdn.mp3quran.net/audio/idrees-abkar/r1/001.mp3",
    );
    expect(surahAudioUrl(114, "mq-bandar-balilah")).toBe(
      "https://cdn.mp3quran.net/audio/bandar-baleela/r1/114.mp3",
    );
    // Per-ayah reciters have no whole-surah URL and vice versa.
    expect(surahAudioUrl(1, "ar.alafasy")).toBeNull();
    expect(ayahAudioUrl({ surah: 1, ayah: 1, global: 1 }, "mq-idrees-abkar")).toBeNull();
    expect(isPerSurahReciter("mq-idrees-abkar")).toBe(true);
    expect(isPerSurahReciter("ar.alafasy")).toBe(false);
  });

  test("everyayah entries use zero-padded surah+ayah files", () => {
    expect(ayahAudioUrl({ surah: 8, ayah: 1, global: 4234 }, "Ghamadi_40kbps")).toBe(
      "https://everyayah.com/data/Ghamadi_40kbps/008001.mp3",
    );
  });

  test("preview URLs resolve for every reciter", () => {
    for (const r of RECITERS) {
      const url = previewAudioUrl(r.id);
      expect(typeof url).toBe("string");
      expect(url!.startsWith("https://")).toBe(true);
      expect(url!.endsWith(".mp3")).toBe(true);
    }
    expect(previewAudioUrl("unknown")).toBeNull();
  });

  test("groups by country without losing anyone", () => {
    const groups = recitersByCountry();
    const total = groups.reduce((sum, g) => sum + g.reciters.length, 0);
    expect(total).toBe(RECITERS.length);
    expect(reciterCountries().length).toBeGreaterThanOrEqual(8);
    // The user-facing country groupings from the library brief exist.
    const countries = reciterCountries();
    expect(countries).toContain("Saudi Arabia");
    expect(countries).toContain("Egypt");
  });
});
