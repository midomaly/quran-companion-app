/**
 * Essential-functionality tests for Noor Al-Islam version 1.
 * Run with: bun test
 *
 * These cover the religious-data integrity rules (114 surahs in order,
 * 6,236 ayahs, correct global ayah numbering for audio, juz boundaries)
 * and the pure helpers the UI depends on.
 */
import { describe, expect, test } from "bun:test";
import {
  JUZ,
  SURAHS,
  TOTAL_AYAHS,
  getSurah,
  globalAyahNumber,
  isValidAyah,
  isValidSurah,
  referenceFromGlobal,
} from "../src/lib/surahs";
import {
  BASMALA,
  DAILY_SURAHS,
  dailyAyahPick,
  splitBasmala,
  toArabicDigits,
} from "../src/lib/quranText";
import { RECITERS, ayahAudioUrl, isArabicQuery, reciterName } from "../src/lib/quranApi";

describe("surah metadata integrity", () => {
  test("contains exactly 114 surahs in order", () => {
    expect(SURAHS.length).toBe(114);
    SURAHS.forEach((s, i) => expect(s.n).toBe(i + 1));
  });

  test("total ayah count is 6,236 (standard Hafs numbering)", () => {
    const total = SURAHS.reduce((sum, s) => sum + s.ayahs, 0);
    expect(total).toBe(6236);
    expect(TOTAL_AYAHS).toBe(6236);
  });

  test("every surah has names, meaning and a positive ayah count", () => {
    for (const s of SURAHS) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.translit.length).toBeGreaterThan(0);
      expect(s.meaning.length).toBeGreaterThan(0);
      expect(s.ayahs).toBeGreaterThan(0);
      expect(["Meccan", "Medinan"]).toContain(s.revelation);
    }
  });

  test("well-known ayah counts", () => {
    expect(getSurah(1)?.ayahs).toBe(7); // Al-Faatiha
    expect(getSurah(2)?.ayahs).toBe(286); // Al-Baqara (longest)
    expect(getSurah(112)?.ayahs).toBe(4); // Al-Ikhlaas
    expect(getSurah(114)?.ayahs).toBe(6); // An-Naas
    expect(getSurah(115)).toBeUndefined();
  });
});

describe("ayah reference validation", () => {
  test("isValidSurah", () => {
    expect(isValidSurah(1)).toBe(true);
    expect(isValidSurah(114)).toBe(true);
    expect(isValidSurah(0)).toBe(false);
    expect(isValidSurah(115)).toBe(false);
    expect(isValidSurah(NaN)).toBe(false);
  });

  test("isValidAyah boundaries", () => {
    expect(isValidAyah(1, 1)).toBe(true);
    expect(isValidAyah(1, 7)).toBe(true);
    expect(isValidAyah(1, 8)).toBe(false);
    expect(isValidAyah(2, 286)).toBe(true);
    expect(isValidAyah(2, 287)).toBe(false);
    expect(isValidAyah(114, 6)).toBe(true);
    expect(isValidAyah(1, 0)).toBe(false);
  });
});

describe("global ayah numbering (used for verse audio URLs)", () => {
  test("known positions", () => {
    expect(globalAyahNumber(1, 1)).toBe(1);
    expect(globalAyahNumber(2, 1)).toBe(8); // after Al-Faatiha's 7
    expect(globalAyahNumber(2, 255)).toBe(262); // Ayat al-Kursi
    expect(globalAyahNumber(114, 6)).toBe(6236);
  });

  test("invalid references throw", () => {
    expect(() => globalAyahNumber(0, 1)).toThrow();
    expect(() => globalAyahNumber(1, 8)).toThrow();
    expect(() => globalAyahNumber(115, 1)).toThrow();
  });

  test("round-trips back to a surah:ayah reference", () => {
    expect(referenceFromGlobal(1)).toEqual({ surah: 1, ayah: 1 });
    expect(referenceFromGlobal(8)).toEqual({ surah: 2, ayah: 1 });
    expect(referenceFromGlobal(262)).toEqual({ surah: 2, ayah: 255 });
    expect(referenceFromGlobal(6236)).toEqual({ surah: 114, ayah: 6 });
    expect(referenceFromGlobal(0)).toBeNull();
    expect(referenceFromGlobal(6237)).toBeNull();
  });

  test("every surah's first ayah follows the previous surah's last ayah", () => {
    for (let i = 1; i < SURAHS.length; i++) {
      const prevLast = globalAyahNumber(SURAHS[i - 1].n, SURAHS[i - 1].ayahs);
      const first = globalAyahNumber(SURAHS[i].n, 1);
      expect(first).toBe(prevLast + 1);
    }
  });
});

describe("juz boundaries", () => {
  test("30 juz with valid, strictly increasing starts", () => {
    expect(JUZ.length).toBe(30);
    expect(JUZ[0]).toEqual({ juz: 1, surah: 1, ayah: 1 });
    expect(JUZ[29].surah).toBe(78);
    expect(JUZ[29].ayah).toBe(1);
    for (let i = 0; i < JUZ.length; i++) {
      const j = JUZ[i];
      expect(j.juz).toBe(i + 1);
      expect(isValidAyah(j.surah, j.ayah)).toBe(true);
      if (i > 0) {
        expect(globalAyahNumber(j.surah, j.ayah)).toBeGreaterThan(
          globalAyahNumber(JUZ[i - 1].surah, JUZ[i - 1].ayah),
        );
      }
    }
  });
});

describe("basmala display split", () => {
  const withBasmala = `${BASMALA} وَٱلضُّحَىٰ`;

  test("splits the prefix off ayah 1 of a surah (display only)", () => {
    const split = splitBasmala(93, 1, withBasmala);
    expect(split.basmala).toBe(BASMALA);
    expect(split.body).toBe("وَٱلضُّحَىٰ");
  });

  test("never splits Al-Faatiha (basmala IS ayah 1 there)", () => {
    const split = splitBasmala(1, 1, BASMALA);
    expect(split.basmala).toBeNull();
    expect(split.body).toBe(BASMALA);
  });

  test("never splits At-Tawbah (has no basmala)", () => {
    const text = "بَرَآءَةٌۭ مِّنَ ٱللَّهِ";
    const split = splitBasmala(9, 1, text);
    expect(split.basmala).toBeNull();
    expect(split.body).toBe(text);
  });

  test("never splits ayahs other than the first", () => {
    const text = "وَٱلضُّحَىٰ";
    expect(splitBasmala(93, 2, text).basmala).toBeNull();
    expect(splitBasmala(93, 2, text).body).toBe(text);
  });

  test("leaves text without the basmala prefix untouched", () => {
    const text = "الٓمٓ";
    const split = splitBasmala(2, 1, text);
    expect(split.basmala).toBeNull();
    expect(split.body).toBe(text);
  });

  test("handles the source's variant opening (stray shadda on surahs 95/97)", () => {
    // The live source merges the basmala into ayah 1 and writes the opening
    // word as "بِّسْمِ" on surahs 95 and 97. The split must still work and
    // must reproduce the source bytes exactly.
    const quirk = "بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ وَٱلتِّينِ وَٱلزَّيْتُونِ";
    const split = splitBasmala(95, 1, quirk);
    expect(split.basmala).not.toBeNull();
    expect(split.body).toBe("وَٱلتِّينِ وَٱلزَّيْتُونِ");
    // Preservation: the two parts concatenated are the original text.
    expect(`${split.basmala} ${split.body}`).toBe(quirk);
  });
});

describe("arabic-indic digits", () => {
  test("converts numbers for ayah medallions", () => {
    expect(toArabicDigits(1)).toBe("١");
    expect(toArabicDigits(255)).toBe("٢٥٥");
    expect(toArabicDigits(114)).toBe("١١٤");
    expect(toArabicDigits(7)).toBe("٧");
  });
});

describe("daily ayah pick", () => {
  test("is deterministic within the same day", () => {
    const d = new Date(2026, 9, 13, 9, 0);
    const d2 = new Date(2026, 9, 13, 23, 30);
    expect(dailyAyahPick(d)).toEqual(dailyAyahPick(d2));
  });

  test("always returns a valid reference from the rotation list", () => {
    for (let i = 0; i < 400; i++) {
      const date = new Date(2026, 0, 1 + i);
      const pick = dailyAyahPick(date);
      expect(DAILY_SURAHS).toContain(pick.surah);
      expect(isValidAyah(pick.surah, pick.ayah)).toBe(true);
    }
  });

  test("changes across days", () => {
    const picks = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const p = dailyAyahPick(new Date(2026, 0, 1 + i));
      picks.add(`${p.surah}:${p.ayah}`);
    }
    expect(picks.size).toBeGreaterThan(5);
  });
});

describe("search edition detection", () => {
  test("detects Arabic-script queries", () => {
    expect(isArabicQuery("بسم الله")).toBe(true);
    expect(isArabicQuery("الرحمن")).toBe(true);
    expect(isArabicQuery("mercy")).toBe(false);
    expect(isArabicQuery("bismillah")).toBe(false);
    expect(isArabicQuery("")).toBe(false);
  });
});

describe("audio helpers", () => {
  test("builds CDN URLs with global ayah numbering", () => {
    expect(ayahAudioUrl(262, "ar.alafasy")).toBe(
      "https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3",
    );
  });

  test("reciters have unique ids and display names", () => {
    expect(RECITERS.length).toBeGreaterThanOrEqual(5);
    const ids = new Set(RECITERS.map((r) => r.id));
    expect(ids.size).toBe(RECITERS.length);
    for (const r of RECITERS) {
      expect(r.name.length).toBeGreaterThan(0);
      expect(reciterName(r.id)).toBe(r.name);
    }
    expect(reciterName("unknown-id")).toBe("unknown-id");
  });
});
