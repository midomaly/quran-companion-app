/**
 * Quran metadata for all 114 surahs and all 30 juz.
 *
 * Source: AlQuran Cloud API (https://api.alquran.cloud/v1/surah and /v1/meta),
 * which serves Tanzil.net's Quran data. Verified at build time against the live
 * API: 114 surahs in order 1..114, 6,236 total ayahs, standard Hafs numbering.
 * Do not edit these values by hand without re-verifying against the source.
 */

export interface Surah {
  /** Surah number 1..114 */
  n: number;
  /** Arabic surah name as served by the source (includes the "سُورَةُ" prefix) */
  name: string;
  /** Latin transliteration, e.g. "Al-Faatiha" */
  translit: string;
  /** English meaning, e.g. "The Opening" */
  meaning: string;
  /** Number of ayahs (verified: sum across all surahs = 6,236) */
  ayahs: number;
  revelation: "Meccan" | "Medinan";
}

export interface JuzRef {
  juz: number;
  /** Surah where this juz begins */
  surah: number;
  /** Ayah where this juz begins */
  ayah: number;
}

export const SURAHS: Surah[] = [
  { n: 1, name: "سُورَةُ ٱلْفَاتِحَةِ", translit: "Al-Faatiha", meaning: "The Opening", ayahs: 7, revelation: "Meccan" },
  { n: 2, name: "سُورَةُ البَقَرَةِ", translit: "Al-Baqara", meaning: "The Cow", ayahs: 286, revelation: "Medinan" },
  { n: 3, name: "سُورَةُ آلِ عِمۡرَانَ", translit: "Aal-i-Imraan", meaning: "The Family of Imraan", ayahs: 200, revelation: "Medinan" },
  { n: 4, name: "سُورَةُ النِّسَاءِ", translit: "An-Nisaa", meaning: "The Women", ayahs: 176, revelation: "Medinan" },
  { n: 5, name: "سُورَةُ المَائـِدَةِ", translit: "Al-Maaida", meaning: "The Table", ayahs: 120, revelation: "Medinan" },
  { n: 6, name: "سُورَةُ الأَنۡعَامِ", translit: "Al-An'aam", meaning: "The Cattle", ayahs: 165, revelation: "Meccan" },
  { n: 7, name: "سُورَةُ الأَعۡرَافِ", translit: "Al-A'raaf", meaning: "The Heights", ayahs: 206, revelation: "Meccan" },
  { n: 8, name: "سُورَةُ الأَنفَالِ", translit: "Al-Anfaal", meaning: "The Spoils of War", ayahs: 75, revelation: "Medinan" },
  { n: 9, name: "سُورَةُ التَّوۡبَةِ", translit: "At-Tawba", meaning: "The Repentance", ayahs: 129, revelation: "Medinan" },
  { n: 10, name: "سُورَةُ يُونُسَ", translit: "Yunus", meaning: "Jonas", ayahs: 109, revelation: "Meccan" },
  { n: 11, name: "سُورَةُ هُودٍ", translit: "Hud", meaning: "Hud", ayahs: 123, revelation: "Meccan" },
  { n: 12, name: "سُورَةُ يُوسُفَ", translit: "Yusuf", meaning: "Joseph", ayahs: 111, revelation: "Meccan" },
  { n: 13, name: "سُورَةُ الرَّعۡدِ", translit: "Ar-Ra'd", meaning: "The Thunder", ayahs: 43, revelation: "Medinan" },
  { n: 14, name: "سُورَةُ إِبۡرَاهِيمَ", translit: "Ibrahim", meaning: "Abraham", ayahs: 52, revelation: "Meccan" },
  { n: 15, name: "سُورَةُ الحِجۡرِ", translit: "Al-Hijr", meaning: "The Rock", ayahs: 99, revelation: "Meccan" },
  { n: 16, name: "سُورَةُ النَّحۡلِ", translit: "An-Nahl", meaning: "The Bee", ayahs: 128, revelation: "Meccan" },
  { n: 17, name: "سُورَةُ الإِسۡرَاءِ", translit: "Al-Israa", meaning: "The Night Journey", ayahs: 111, revelation: "Meccan" },
  { n: 18, name: "سُورَةُ الكَهۡفِ", translit: "Al-Kahf", meaning: "The Cave", ayahs: 110, revelation: "Meccan" },
  { n: 19, name: "سُورَةُ مَرۡيَمَ", translit: "Maryam", meaning: "Mary", ayahs: 98, revelation: "Meccan" },
  { n: 20, name: "سُورَةُ طه", translit: "Taa-Haa", meaning: "Taa-Haa", ayahs: 135, revelation: "Meccan" },
  { n: 21, name: "سُورَةُ الأَنبِيَاءِ", translit: "Al-Anbiyaa", meaning: "The Prophets", ayahs: 112, revelation: "Meccan" },
  { n: 22, name: "سُورَةُ الحَجِّ", translit: "Al-Hajj", meaning: "The Pilgrimage", ayahs: 78, revelation: "Medinan" },
  { n: 23, name: "سُورَةُ المُؤۡمِنُونَ", translit: "Al-Muminoon", meaning: "The Believers", ayahs: 118, revelation: "Meccan" },
  { n: 24, name: "سُورَةُ النُّورِ", translit: "An-Noor", meaning: "The Light", ayahs: 64, revelation: "Medinan" },
  { n: 25, name: "سُورَةُ الفُرۡقَانِ", translit: "Al-Furqaan", meaning: "The Criterion", ayahs: 77, revelation: "Meccan" },
  { n: 26, name: "سُورَةُ الشُّعَرَاءِ", translit: "Ash-Shu'araa", meaning: "The Poets", ayahs: 227, revelation: "Meccan" },
  { n: 27, name: "سُورَةُ النَّمۡلِ", translit: "An-Naml", meaning: "The Ant", ayahs: 93, revelation: "Meccan" },
  { n: 28, name: "سُورَةُ القَصَصِ", translit: "Al-Qasas", meaning: "The Stories", ayahs: 88, revelation: "Meccan" },
  { n: 29, name: "سُورَةُ العَنكَبُوتِ", translit: "Al-Ankaboot", meaning: "The Spider", ayahs: 69, revelation: "Meccan" },
  { n: 30, name: "سُورَةُ الرُّومِ", translit: "Ar-Room", meaning: "The Romans", ayahs: 60, revelation: "Meccan" },
  { n: 31, name: "سُورَةُ لُقۡمَانَ", translit: "Luqman", meaning: "Luqman", ayahs: 34, revelation: "Meccan" },
  { n: 32, name: "سُورَةُ السَّجۡدَةِ", translit: "As-Sajda", meaning: "The Prostration", ayahs: 30, revelation: "Meccan" },
  { n: 33, name: "سُورَةُ الأَحۡزَابِ", translit: "Al-Ahzaab", meaning: "The Clans", ayahs: 73, revelation: "Medinan" },
  { n: 34, name: "سُورَةُ سَبَإٍ", translit: "Saba", meaning: "Sheba", ayahs: 54, revelation: "Meccan" },
  { n: 35, name: "سُورَةُ فَاطِرٍ", translit: "Faatir", meaning: "The Originator", ayahs: 45, revelation: "Meccan" },
  { n: 36, name: "سُورَةُ يسٓ", translit: "Yaseen", meaning: "Yaseen", ayahs: 83, revelation: "Meccan" },
  { n: 37, name: "سُورَةُ الصَّافَّاتِ", translit: "As-Saaffaat", meaning: "Those drawn up in Ranks", ayahs: 182, revelation: "Meccan" },
  { n: 38, name: "سُورَةُ صٓ", translit: "Saad", meaning: "The letter Saad", ayahs: 88, revelation: "Meccan" },
  { n: 39, name: "سُورَةُ الزُّمَرِ", translit: "Az-Zumar", meaning: "The Groups", ayahs: 75, revelation: "Meccan" },
  { n: 40, name: "سُورَةُ غَافِرٍ", translit: "Ghafir", meaning: "The Forgiver", ayahs: 85, revelation: "Meccan" },
  { n: 41, name: "سُورَةُ فُصِّلَتۡ", translit: "Fussilat", meaning: "Explained in detail", ayahs: 54, revelation: "Meccan" },
  { n: 42, name: "سُورَةُ الشُّورَىٰ", translit: "Ash-Shura", meaning: "Consultation", ayahs: 53, revelation: "Meccan" },
  { n: 43, name: "سُورَةُ الزُّخۡرُفِ", translit: "Az-Zukhruf", meaning: "Ornaments of gold", ayahs: 89, revelation: "Meccan" },
  { n: 44, name: "سُورَةُ الدُّخَانِ", translit: "Ad-Dukhaan", meaning: "The Smoke", ayahs: 59, revelation: "Meccan" },
  { n: 45, name: "سُورَةُ الجَاثِيَةِ", translit: "Al-Jaathiya", meaning: "Crouching", ayahs: 37, revelation: "Meccan" },
  { n: 46, name: "سُورَةُ الأَحۡقَافِ", translit: "Al-Ahqaf", meaning: "The Dunes", ayahs: 35, revelation: "Meccan" },
  { n: 47, name: "سُورَةُ مُحَمَّدٍ", translit: "Muhammad", meaning: "Muhammad", ayahs: 38, revelation: "Medinan" },
  { n: 48, name: "سُورَةُ الفَتۡحِ", translit: "Al-Fath", meaning: "The Victory", ayahs: 29, revelation: "Medinan" },
  { n: 49, name: "سُورَةُ الحُجُرَاتِ", translit: "Al-Hujuraat", meaning: "The Inner Apartments", ayahs: 18, revelation: "Medinan" },
  { n: 50, name: "سُورَةُ قٓ", translit: "Qaaf", meaning: "The letter Qaaf", ayahs: 45, revelation: "Meccan" },
  { n: 51, name: "سُورَةُ الذَّارِيَاتِ", translit: "Adh-Dhaariyat", meaning: "The Winnowing Winds", ayahs: 60, revelation: "Meccan" },
  { n: 52, name: "سُورَةُ الطُّورِ", translit: "At-Tur", meaning: "The Mount", ayahs: 49, revelation: "Meccan" },
  { n: 53, name: "سُورَةُ النَّجۡمِ", translit: "An-Najm", meaning: "The Star", ayahs: 62, revelation: "Meccan" },
  { n: 54, name: "سُورَةُ القَمَرِ", translit: "Al-Qamar", meaning: "The Moon", ayahs: 55, revelation: "Meccan" },
  { n: 55, name: "سُورَةُ الرَّحۡمَٰن", translit: "Ar-Rahmaan", meaning: "The Beneficent", ayahs: 78, revelation: "Medinan" },
  { n: 56, name: "سُورَةُ الوَاقِعَةِ", translit: "Al-Waaqia", meaning: "The Inevitable", ayahs: 96, revelation: "Meccan" },
  { n: 57, name: "سُورَةُ الحَدِيدِ", translit: "Al-Hadid", meaning: "The Iron", ayahs: 29, revelation: "Medinan" },
  { n: 58, name: "سُورَةُ المُجَادلَةِ", translit: "Al-Mujaadila", meaning: "The Pleading Woman", ayahs: 22, revelation: "Medinan" },
  { n: 59, name: "سُورَةُ الحَشۡرِ", translit: "Al-Hashr", meaning: "The Exile", ayahs: 24, revelation: "Medinan" },
  { n: 60, name: "سُورَةُ المُمۡتَحنَةِ", translit: "Al-Mumtahana", meaning: "She that is to be examined", ayahs: 13, revelation: "Medinan" },
  { n: 61, name: "سُورَةُ الصَّفِّ", translit: "As-Saff", meaning: "The Ranks", ayahs: 14, revelation: "Medinan" },
  { n: 62, name: "سُورَةُ الجُمُعَةِ", translit: "Al-Jumu'a", meaning: "Friday", ayahs: 11, revelation: "Medinan" },
  { n: 63, name: "سُورَةُ المُنَافِقُونَ", translit: "Al-Munaafiqoon", meaning: "The Hypocrites", ayahs: 11, revelation: "Medinan" },
  { n: 64, name: "سُورَةُ التَّغَابُنِ", translit: "At-Taghaabun", meaning: "Mutual Disillusion", ayahs: 18, revelation: "Medinan" },
  { n: 65, name: "سُورَةُ الطَّلَاقِ", translit: "At-Talaaq", meaning: "Divorce", ayahs: 12, revelation: "Medinan" },
  { n: 66, name: "سُورَةُ التَّحۡرِيمِ", translit: "At-Tahrim", meaning: "The Prohibition", ayahs: 12, revelation: "Medinan" },
  { n: 67, name: "سُورَةُ المُلۡكِ", translit: "Al-Mulk", meaning: "The Sovereignty", ayahs: 30, revelation: "Meccan" },
  { n: 68, name: "سُورَةُ القَلَمِ", translit: "Al-Qalam", meaning: "The Pen", ayahs: 52, revelation: "Meccan" },
  { n: 69, name: "سُورَةُ الحَاقَّةِ", translit: "Al-Haaqqa", meaning: "The Reality", ayahs: 52, revelation: "Meccan" },
  { n: 70, name: "سُورَةُ المَعَارِجِ", translit: "Al-Ma'aarij", meaning: "The Ascending Stairways", ayahs: 44, revelation: "Meccan" },
  { n: 71, name: "سُورَةُ نُوحٍ", translit: "Nooh", meaning: "Noah", ayahs: 28, revelation: "Meccan" },
  { n: 72, name: "سُورَةُ الجِنِّ", translit: "Al-Jinn", meaning: "The Jinn", ayahs: 28, revelation: "Meccan" },
  { n: 73, name: "سُورَةُ المُزَّمِّلِ", translit: "Al-Muzzammil", meaning: "The Enshrouded One", ayahs: 20, revelation: "Meccan" },
  { n: 74, name: "سُورَةُ المُدَّثِّرِ", translit: "Al-Muddaththir", meaning: "The Cloaked One", ayahs: 56, revelation: "Meccan" },
  { n: 75, name: "سُورَةُ القِيَامَةِ", translit: "Al-Qiyaama", meaning: "The Resurrection", ayahs: 40, revelation: "Meccan" },
  { n: 76, name: "سُورَةُ الإِنسَانِ", translit: "Al-Insaan", meaning: "Man", ayahs: 31, revelation: "Medinan" },
  { n: 77, name: "سُورَةُ المُرۡسَلَاتِ", translit: "Al-Mursalaat", meaning: "The Emissaries", ayahs: 50, revelation: "Meccan" },
  { n: 78, name: "سُورَةُ النَّبَإِ", translit: "An-Naba", meaning: "The Announcement", ayahs: 40, revelation: "Meccan" },
  { n: 79, name: "سُورَةُ النَّازِعَاتِ", translit: "An-Naazi'aat", meaning: "Those who drag forth", ayahs: 46, revelation: "Meccan" },
  { n: 80, name: "سُورَةُ عَبَسَ", translit: "Abasa", meaning: "He frowned", ayahs: 42, revelation: "Meccan" },
  { n: 81, name: "سُورَةُ التَّكۡوِيرِ", translit: "At-Takwir", meaning: "The Overthrowing", ayahs: 29, revelation: "Meccan" },
  { n: 82, name: "سُورَةُ الانفِطَارِ", translit: "Al-Infitaar", meaning: "The Cleaving", ayahs: 19, revelation: "Meccan" },
  { n: 83, name: "سُورَةُ المُطَفِّفِينَ", translit: "Al-Mutaffifin", meaning: "Defrauding", ayahs: 36, revelation: "Meccan" },
  { n: 84, name: "سُورَةُ الانشِقَاقِ", translit: "Al-Inshiqaaq", meaning: "The Splitting Open", ayahs: 25, revelation: "Meccan" },
  { n: 85, name: "سُورَةُ البُرُوجِ", translit: "Al-Burooj", meaning: "The Constellations", ayahs: 22, revelation: "Meccan" },
  { n: 86, name: "سُورَةُ الطَّارِقِ", translit: "At-Taariq", meaning: "The Morning Star", ayahs: 17, revelation: "Meccan" },
  { n: 87, name: "سُورَةُ الأَعۡلَىٰ", translit: "Al-A'laa", meaning: "The Most High", ayahs: 19, revelation: "Meccan" },
  { n: 88, name: "سُورَةُ الغَاشِيَةِ", translit: "Al-Ghaashiya", meaning: "The Overwhelming", ayahs: 26, revelation: "Meccan" },
  { n: 89, name: "سُورَةُ الفَجۡرِ", translit: "Al-Fajr", meaning: "The Dawn", ayahs: 30, revelation: "Meccan" },
  { n: 90, name: "سُورَةُ البَلَدِ", translit: "Al-Balad", meaning: "The City", ayahs: 20, revelation: "Meccan" },
  { n: 91, name: "سُورَةُ الشَّمۡسِ", translit: "Ash-Shams", meaning: "The Sun", ayahs: 15, revelation: "Meccan" },
  { n: 92, name: "سُورَةُ اللَّيۡلِ", translit: "Al-Lail", meaning: "The Night", ayahs: 21, revelation: "Meccan" },
  { n: 93, name: "سُورَةُ الضُّحَىٰ", translit: "Ad-Dhuhaa", meaning: "The Morning Hours", ayahs: 11, revelation: "Meccan" },
  { n: 94, name: "سُورَةُ الشَّرۡحِ", translit: "Ash-Sharh", meaning: "The Consolation", ayahs: 8, revelation: "Meccan" },
  { n: 95, name: "سُورَةُ التِّينِ", translit: "At-Tin", meaning: "The Fig", ayahs: 8, revelation: "Meccan" },
  { n: 96, name: "سُورَةُ العَلَقِ", translit: "Al-Alaq", meaning: "The Clot", ayahs: 19, revelation: "Meccan" },
  { n: 97, name: "سُورَةُ القَدۡرِ", translit: "Al-Qadr", meaning: "The Power, Fate", ayahs: 5, revelation: "Meccan" },
  { n: 98, name: "سُورَةُ البَيِّنَةِ", translit: "Al-Bayyina", meaning: "The Evidence", ayahs: 8, revelation: "Medinan" },
  { n: 99, name: "سُورَةُ الزَّلۡزَلَةِ", translit: "Az-Zalzala", meaning: "The Earthquake", ayahs: 8, revelation: "Medinan" },
  { n: 100, name: "سُورَةُ العَادِيَاتِ", translit: "Al-Aadiyaat", meaning: "The Chargers", ayahs: 11, revelation: "Meccan" },
  { n: 101, name: "سُورَةُ القَارِعَةِ", translit: "Al-Qaari'a", meaning: "The Calamity", ayahs: 11, revelation: "Meccan" },
  { n: 102, name: "سُورَةُ التَّكَاثُرِ", translit: "At-Takaathur", meaning: "Competition", ayahs: 8, revelation: "Meccan" },
  { n: 103, name: "سُورَةُ العَصۡرِ", translit: "Al-Asr", meaning: "The Declining Day, Epoch", ayahs: 3, revelation: "Meccan" },
  { n: 104, name: "سُورَةُ الهُمَزَةِ", translit: "Al-Humaza", meaning: "The Traducer", ayahs: 9, revelation: "Meccan" },
  { n: 105, name: "سُورَةُ الفِيلِ", translit: "Al-Fil", meaning: "The Elephant", ayahs: 5, revelation: "Meccan" },
  { n: 106, name: "سُورَةُ قُرَيۡشٍ", translit: "Quraish", meaning: "Quraysh", ayahs: 4, revelation: "Meccan" },
  { n: 107, name: "سُورَةُ المَاعُونِ", translit: "Al-Maa'un", meaning: "Almsgiving", ayahs: 7, revelation: "Meccan" },
  { n: 108, name: "سُورَةُ الكَوۡثَرِ", translit: "Al-Kawthar", meaning: "Abundance", ayahs: 3, revelation: "Meccan" },
  { n: 109, name: "سُورَةُ الكَافِرُونَ", translit: "Al-Kaafiroon", meaning: "The Disbelievers", ayahs: 6, revelation: "Meccan" },
  { n: 110, name: "سُورَةُ النَّصۡرِ", translit: "An-Nasr", meaning: "Divine Support", ayahs: 3, revelation: "Medinan" },
  { n: 111, name: "سُورَةُ المَسَدِ", translit: "Al-Masad", meaning: "The Palm Fibre", ayahs: 5, revelation: "Meccan" },
  { n: 112, name: "سُورَةُ الإِخۡلَاصِ", translit: "Al-Ikhlaas", meaning: "Sincerity", ayahs: 4, revelation: "Meccan" },
  { n: 113, name: "سُورَةُ الفَلَقِ", translit: "Al-Falaq", meaning: "The Dawn", ayahs: 5, revelation: "Meccan" },
  { n: 114, name: "سُورَةُ النَّاسِ", translit: "An-Naas", meaning: "Mankind", ayahs: 6, revelation: "Meccan" },
];

/** Starting reference of each of the 30 juz (verified against /v1/meta). */
export const JUZ: JuzRef[] = [
  { juz: 1, surah: 1, ayah: 1 },
  { juz: 2, surah: 2, ayah: 142 },
  { juz: 3, surah: 2, ayah: 253 },
  { juz: 4, surah: 3, ayah: 93 },
  { juz: 5, surah: 4, ayah: 24 },
  { juz: 6, surah: 4, ayah: 148 },
  { juz: 7, surah: 5, ayah: 82 },
  { juz: 8, surah: 6, ayah: 111 },
  { juz: 9, surah: 7, ayah: 88 },
  { juz: 10, surah: 8, ayah: 41 },
  { juz: 11, surah: 9, ayah: 93 },
  { juz: 12, surah: 11, ayah: 6 },
  { juz: 13, surah: 12, ayah: 53 },
  { juz: 14, surah: 15, ayah: 1 },
  { juz: 15, surah: 17, ayah: 1 },
  { juz: 16, surah: 18, ayah: 75 },
  { juz: 17, surah: 21, ayah: 1 },
  { juz: 18, surah: 23, ayah: 1 },
  { juz: 19, surah: 25, ayah: 21 },
  { juz: 20, surah: 27, ayah: 56 },
  { juz: 21, surah: 29, ayah: 46 },
  { juz: 22, surah: 33, ayah: 31 },
  { juz: 23, surah: 36, ayah: 28 },
  { juz: 24, surah: 39, ayah: 32 },
  { juz: 25, surah: 41, ayah: 47 },
  { juz: 26, surah: 46, ayah: 1 },
  { juz: 27, surah: 51, ayah: 31 },
  { juz: 28, surah: 58, ayah: 1 },
  { juz: 29, surah: 67, ayah: 1 },
  { juz: 30, surah: 78, ayah: 1 },
];

/** Canonical total ayah count of the Qur'an (Hafs 'an Asim, standard numbering). */
export const TOTAL_AYAHS = 6236;

/** Cumulative ayah count before each surah: OFFSETS[surah - 1]. */
const OFFSETS: number[] = (() => {
  const offsets: number[] = [];
  let running = 0;
  for (const s of SURAHS) {
    offsets.push(running);
    running += s.ayahs;
  }
  offsets.push(running);
  return offsets;
})();

export function getSurah(n: number): Surah | undefined {
  return SURAHS.find((s) => s.n === n);
}

export function isValidSurah(surah: number): boolean {
  return Number.isInteger(surah) && surah >= 1 && surah <= 114;
}

export function isValidAyah(surah: number, ayah: number): boolean {
  if (!isValidSurah(surah)) return false;
  return Number.isInteger(ayah) && ayah >= 1 && ayah <= (getSurah(surah)?.ayahs ?? 0);
}

/** Quran-wide ayah number (1..6236) — used for verse audio URLs. */
export function globalAyahNumber(surah: number, ayah: number): number {
  if (!isValidAyah(surah, ayah)) {
    throw new Error(`Invalid ayah reference ${surah}:${ayah}`);
  }
  return OFFSETS[surah - 1] + ayah;
}

/** Map a Quran-wide ayah number back to a surah:ayah reference. */
export function referenceFromGlobal(global: number): { surah: number; ayah: number } | null {
  if (!Number.isInteger(global) || global < 1 || global > TOTAL_AYAHS) return null;
  for (let i = 0; i < SURAHS.length; i++) {
    const start = OFFSETS[i] + 1;
    const end = OFFSETS[i] + SURAHS[i].ayahs;
    if (global >= start && global <= end) {
      return { surah: SURAHS[i].n, ayah: global - OFFSETS[i] };
    }
  }
  return null;
}
