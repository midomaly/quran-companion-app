/**
 * Reciters Library — 60 well-known Qur'an reciters with streaming audio.
 *
 * Every entry was verified LIVE against its source before being added
 * (HEAD/GET on the first ayah of every reciter, plus a late ayah for the
 * per-ayah CDNs). Sources:
 *
 *  - cdn.islamic.network  — per-ayah files at /quran/audio/{bitrate}/{ar.id}/{globalAyah}.mp3.
 *                           Bitrates are NOT uniform across reciters; the value stored
 *                           per reciter is the one the CDN actually serves.
 *  - everyayah.com        — per-ayah files at /data/{folder}/{surah:3}{ayah:3}.mp3
 *                           (surah+ayah numbering, NOT the Quran-wide number).
 *  - cdn.mp3quran.net     — whole-surah files at {server}/{surah:3}.mp3. These reciters
 *                           have no per-ayah files on the free CDNs, so their entries
 *                           are marked `perSurah` and the Reader plays the full surah.
 *
 * The seven `ar.*` ids that shipped in earlier app versions stay unchanged so
 * users' saved reciter settings keep working.
 *
 * Audio attribution: everyayah.com, cdn.islamic.network (QuranicAudio) and
 * mp3quran.net — all free, key-less public CDNs.
 */

export type ReciterSource = "islamic" | "everyayah" | "mp3quran";

export interface Reciter {
  /** Stable id — stored in settings/sync. The legacy ar.* ids never change. */
  id: string;
  /** English display name. */
  name: string;
  /** Arabic display name (omitted only where no widely-used form is known). */
  arabicName?: string;
  /** Country used to group the Reciters Library. */
  country: string;
  source: ReciterSource;
  /** islamic: bitrate · everyayah: data folder · mp3quran: moshaf server URL (ends with /). */
  path: string;
  /** Recitation style when it differs from plain Murattal. */
  style?: string;
  /** True when the source only has whole-surah files (no per-ayah stepping). */
  perSurah?: boolean;
}

const ISLAMIC_BASE = "https://cdn.islamic.network/quran/audio";
const EVERYAYAH_BASE = "https://everyayah.com/data";

export const DEFAULT_RECITER_ID = "ar.alafasy";

/* ------------------------------------------------------------------ */
/* Catalog (60)                                                        */
/* ------------------------------------------------------------------ */

export const RECITERS: Reciter[] = [
  /* ---- cdn.islamic.network (per-ayah) ---- */
  { id: "ar.alafasy", name: "Mishary Rashid Alafasy", arabicName: "مشاري راشد العفاسي", country: "Kuwait", source: "islamic", path: "ar.alafasy", bitrate: 128 },
  { id: "ar.abdurrahmaansudais", name: "Abdul Rahman Al-Sudais", arabicName: "عبد الرحمن السديس", country: "Saudi Arabia", source: "islamic", path: "ar.abdurrahmaansudais", bitrate: 192 },
  { id: "ar.saoodshuraym", name: "Saud Al-Shuraim", arabicName: "سعود الشريم", country: "Saudi Arabia", source: "islamic", path: "ar.saoodshuraym", bitrate: 64 },
  { id: "ar.mahermuaiqly", name: "Maher Al-Muaiqly", arabicName: "ماهر المعيقلي", country: "Saudi Arabia", source: "islamic", path: "ar.mahermuaiqly", bitrate: 128 },
  { id: "ar.hudhaify", name: "Ali Al-Hudhaify", arabicName: "علي الحذيفي", country: "Saudi Arabia", source: "islamic", path: "ar.hudhaify", bitrate: 128 },
  { id: "ar.abdullahbasfar", name: "Abdullah Basfar", arabicName: "عبد الله بصفر", country: "Saudi Arabia", source: "islamic", path: "ar.abdullahbasfar", bitrate: 192 },
  { id: "ar.shaatree", name: "Abu Bakr Al-Shatri", arabicName: "أبو بكر الشاطري", country: "Saudi Arabia", source: "islamic", path: "ar.shaatree", bitrate: 128 },
  { id: "ar.ahmedajamy", name: "Ahmed Al-Ajamy", arabicName: "أحمد العجمي", country: "Kuwait", source: "islamic", path: "ar.ahmedajamy", bitrate: 128 },
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit Abdus Samad", arabicName: "عبد الباسط عبد الصمد", country: "Egypt", source: "islamic", path: "ar.abdulbasitmurattal", bitrate: 192 },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary", arabicName: "محمود خليل الحصري", country: "Egypt", source: "islamic", path: "ar.husary", bitrate: 128 },
  { id: "ar.husarymujawwad", name: "Al-Husary (Mujawwad)", arabicName: "الحصري — مجود", country: "Egypt", source: "islamic", path: "ar.husarymujawwad", bitrate: 128, style: "Mujawwad" },
  { id: "ar.minshawi", name: "Muhammad Siddiq Al-Minshawi", arabicName: "محمد صديق المنشاوي", country: "Egypt", source: "islamic", path: "ar.minshawi", bitrate: 128 },
  { id: "ar.minshawimujawwad", name: "Al-Minshawi (Mujawwad)", arabicName: "المنشاوي — مجود", country: "Egypt", source: "islamic", path: "ar.minshawimujawwad", bitrate: 64, style: "Mujawwad" },

  /* ---- everyayah.com (per-ayah) ---- */
  { id: "AbdulSamad_64kbps_QuranExplorer.Com", name: "Abdul-Samad", arabicName: "عبد الصمد", country: "Egypt", source: "everyayah", path: "AbdulSamad_64kbps_QuranExplorer.Com" },
  { id: "Abdul_Basit_Mujawwad_128kbps", name: "Abdul Basit (Mujawwad)", arabicName: "عبد الباسط — مجود", country: "Egypt", source: "everyayah", path: "Abdul_Basit_Mujawwad_128kbps", style: "Mujawwad" },
  { id: "Abdullaah_3awwaad_Al-Juhaynee_128kbps", name: "Abdullah Awad Al-Juhany", arabicName: "عبد الله عوض الجهني", country: "Saudi Arabia", source: "everyayah", path: "Abdullaah_3awwaad_Al-Juhaynee_128kbps" },
  { id: "Abdullah_Matroud_128kbps", name: "Abdullah Al-Matroud", arabicName: "عبد الله المطرود", country: "Saudi Arabia", source: "everyayah", path: "Abdullah_Matroud_128kbps" },
  { id: "Ahmed_Neana_128kbps", name: "Ahmed Neana", arabicName: "أحمد نعينع", country: "Egypt", source: "everyayah", path: "Ahmed_Neana_128kbps" },
  { id: "Akram_AlAlaqimy_128kbps", name: "Akram Al-Alaqimy", arabicName: "أكرم العلاقمي", country: "Libya", source: "everyayah", path: "Akram_AlAlaqimy_128kbps" },
  { id: "Ali_Hajjaj_AlSuesy_128kbps", name: "Ali Hajjaj Al-Suesy", arabicName: "علي حجاج السويسي", country: "Egypt", source: "everyayah", path: "Ali_Hajjaj_AlSuesy_128kbps" },
  { id: "Ali_Jaber_64kbps", name: "Ali Jaber", arabicName: "علي جابر", country: "Saudi Arabia", source: "everyayah", path: "Ali_Jaber_64kbps" },
  { id: "Ayman_Sowaid_64kbps", name: "Ayman Sowaid", arabicName: "أيمن سويد", country: "Syria", source: "everyayah", path: "Ayman_Sowaid_64kbps" },
  { id: "Fares_Abbad_64kbps", name: "Fares Abbad", arabicName: "فارس عباد", country: "Saudi Arabia", source: "everyayah", path: "Fares_Abbad_64kbps" },
  { id: "Ghamadi_40kbps", name: "Saad Al-Ghamdi", arabicName: "سعود الغامدي", country: "Saudi Arabia", source: "everyayah", path: "Ghamadi_40kbps" },
  { id: "Hani_Rifai_192kbps", name: "Hani Ar-Rifai", arabicName: "هاني الرفاعي", country: "Saudi Arabia", source: "everyayah", path: "Hani_Rifai_192kbps" },
  { id: "Husary_Muallim_128kbps", name: "Al-Husary (Muallim)", arabicName: "الحصري — معلم", country: "Egypt", source: "everyayah", path: "Husary_Muallim_128kbps", style: "Muallim" },
  { id: "Ibrahim_Akhdar_32kbps", name: "Ibrahim Al-Akdar", arabicName: "إبراهيم الأخضر", country: "Saudi Arabia", source: "everyayah", path: "Ibrahim_Akhdar_32kbps" },
  { id: "Karim_Mansoori_40kbps", name: "Karim Mansoori", arabicName: "کریم منصوری", country: "Afghanistan", source: "everyayah", path: "Karim_Mansoori_40kbps" },
  { id: "Khaalid_Abdullaah_al-Qahtaanee_192kbps", name: "Khalid Al-Qahtani", arabicName: "خالد القحطاني", country: "Saudi Arabia", source: "everyayah", path: "Khaalid_Abdullaah_al-Qahtaanee_192kbps" },
  { id: "Menshawi_32kbps", name: "Muhammad Mutawalli Al-Minshawi", arabicName: "محمد متولي المنشاوي", country: "Egypt", source: "everyayah", path: "Menshawi_32kbps" },
  { id: "Minshawy_Teacher_128kbps", name: "Al-Minshawi (Teacher)", arabicName: "المنشاوي — معلم", country: "Egypt", source: "everyayah", path: "Minshawy_Teacher_128kbps", style: "Muallim" },
  { id: "Mohammad_al_Tablaway_128kbps", name: "Mohammad Al-Tablaway", arabicName: "محمد الطبلاوي", country: "Sudan", source: "everyayah", path: "Mohammad_al_Tablaway_128kbps" },
  { id: "Muhammad_AbdulKareem_128kbps", name: "Muhammad Abdulkareem", arabicName: "محمد عبد الكريم", country: "Saudi Arabia", source: "everyayah", path: "Muhammad_AbdulKareem_128kbps" },
  { id: "Muhammad_Ayyoub_128kbps", name: "Muhammad Ayyoub", arabicName: "محمد أيوب", country: "Saudi Arabia", source: "everyayah", path: "Muhammad_Ayyoub_128kbps" },
  { id: "Muhammad_Jibreel_128kbps", name: "Muhammad Jebril", arabicName: "محمد جبريل", country: "Egypt", source: "everyayah", path: "Muhammad_Jibreel_128kbps" },
  { id: "Muhsin_Al_Qasim_192kbps", name: "Abdul Mohsen Al-Qasim", arabicName: "عبد المحسن القاسم", country: "Saudi Arabia", source: "everyayah", path: "Muhsin_Al_Qasim_192kbps" },
  { id: "Mustafa_Ismail_48kbps", name: "Mustafa Ismail", arabicName: "مصطفى إسماعيل", country: "Egypt", source: "everyayah", path: "Mustafa_Ismail_48kbps" },
  { id: "Nabil_Rifa3i_48kbps", name: "Nabil Ar-Rifa'i", arabicName: "نبيل الرفاعي", country: "Egypt", source: "everyayah", path: "Nabil_Rifa3i_48kbps" },
  { id: "Nasser_Alqatami_128kbps", name: "Nasser Al-Qatami", arabicName: "ناصر القطامي", country: "Saudi Arabia", source: "everyayah", path: "Nasser_Alqatami_128kbps" },
  { id: "Parhizgar_48kbps", name: "Parhizgar", arabicName: "پرهیزگار", country: "Turkey", source: "everyayah", path: "Parhizgar_48kbps" },
  { id: "Sahl_Yassin_128kbps", name: "Sahl Yassin", arabicName: "سهل ياسين", country: "Egypt", source: "everyayah", path: "Sahl_Yassin_128kbps" },
  { id: "Salaah_AbdulRahman_Bukhatir_128kbps", name: "Salah Al-Bukhatir", arabicName: "صلاح البختري", country: "United Arab Emirates", source: "everyayah", path: "Salaah_AbdulRahman_Bukhatir_128kbps" },
  { id: "Salah_Al_Budair_128kbps", name: "Salah Al-Budair", arabicName: "صالح البدير", country: "Saudi Arabia", source: "everyayah", path: "Salah_Al_Budair_128kbps" },
  { id: "Yaser_Salamah_128kbps", name: "Yasser Salama", arabicName: "ياسر سلامة", country: "Egypt", source: "everyayah", path: "Yaser_Salamah_128kbps" },
  { id: "Yasser_Ad-Dussary_128kbps", name: "Yasser Al-Dosari", arabicName: "ياسر الدوسري", country: "Saudi Arabia", source: "everyayah", path: "Yasser_Ad-Dussary_128kbps" },
  { id: "aziz_alili_128kbps", name: "Aziz Alili", arabicName: "عزيز العليلي", country: "Morocco", source: "everyayah", path: "aziz_alili_128kbps" },
  { id: "khalefa_al_tunaiji_64kbps", name: "Khalifa Al-Tunaiji", arabicName: "خليفة التنيجي", country: "United Arab Emirates", source: "everyayah", path: "khalefa_al_tunaiji_64kbps" },
  { id: "mahmoud_ali_al_banna_32kbps", name: "Mahmoud Al-Banna", arabicName: "محمود علي البنا", country: "Egypt", source: "everyayah", path: "mahmoud_ali_al_banna_32kbps" },

  /* ---- cdn.mp3quran.net (whole surahs — no per-ayah files on the free CDNs) ---- */
  { id: "mq-idrees-abkar", name: "Idris Abkar", arabicName: "إدريس أبكر", country: "Saudi Arabia", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/idrees-abkar/r1/", perSurah: true },
  { id: "mq-khalid-al-jileel", name: "Khalid Al-Jalil", arabicName: "خالد الجليل", country: "Saudi Arabia", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/khalid-jalil/r1/", perSurah: true },
  { id: "mq-bandar-balilah", name: "Bandar Baleela", arabicName: "بندر بليلة", country: "Saudi Arabia", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/bandar-baleela/r1/", perSurah: true },
  { id: "mq-mohammed-al-lohaidan", name: "Mohammed Al-Lohaidan", arabicName: "محمد اللحيذان", country: "Saudi Arabia", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/muhammad-luhaidan/r1/", perSurah: true },
  { id: "mq-majed-al-enezi", name: "Majed Al-Enezi", arabicName: "ماجد العنزي", country: "Kuwait", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/majed-anazi/r1/", perSurah: true },
  { id: "mq-abdulaziz-az-zahrani", name: "Abdulaziz Al-Zahrani", arabicName: "عبد العزيز الزهراني", country: "Saudi Arabia", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/abdulaziz-zahrani/r1/", perSurah: true },
  { id: "mq-abdullah-al-kandari", name: "Abdullah Al-Kandari", arabicName: "عبد الله الكندري", country: "Kuwait", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/abdullah-kandari/r1/", perSurah: true },
  { id: "mq-mustafa-al-azawy", name: "Mustafa Raad Al-Azawy", arabicName: "مصطفى رعد العزاوي", country: "Iraq", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/mustafa-azzawi/r1/", perSurah: true },
  { id: "mq-ibrahim-al-dosari", name: "Ibrahim Al-Dosari", arabicName: "إبراهيم الدوسري", country: "Saudi Arabia", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/ibrahim-dosari/r2/", perSurah: true },
  { id: "mq-mohammad-al-airawy", name: "Mohammad Al-Airawy", arabicName: "محمد العراقي", country: "Egypt", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/muhammad-iraoui/r1/", perSurah: true },
  { id: "mq-mohammed-al-barrak", name: "Mohammed Al-Barrak", arabicName: "محمد البراك", country: "Saudi Arabia", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/muhammad-barrak/r1/", perSurah: true },
  { id: "mq-mustafa-al-lahoni", name: "Mustafa Al-Lahoni", arabicName: "مصطفى اللاهوني", country: "Egypt", source: "mp3quran", path: "https://cdn.mp3quran.net/audio/mustafa-lahouni/r1/", perSurah: true },
];

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

const BY_ID = new Map(RECITERS.map((r) => [r.id, r]));

export function getReciter(id: string): Reciter | undefined {
  return BY_ID.get(id);
}

export function isKnownReciter(id: string): boolean {
  return BY_ID.has(id);
}

export function reciterName(id: string): string {
  return BY_ID.get(id)?.name ?? id;
}

/** Countries in catalog order (first appearance), for grouped pickers. */
export function reciterCountries(): string[] {
  const seen: string[] = [];
  for (const r of RECITERS) if (!seen.includes(r.country)) seen.push(r.country);
  return seen;
}

export function recitersByCountry(): { country: string; reciters: Reciter[] }[] {
  return reciterCountries().map((country) => ({
    country,
    reciters: RECITERS.filter((r) => r.country === country),
  }));
}

/* ------------------------------------------------------------------ */
/* Audio URL builders                                                  */
/* ------------------------------------------------------------------ */

/** Location of one ayah — all three numbers the sources need. */
export interface AyahRef {
  /** Ayah number within its surah (1-based). */
  ayah: number;
  /** Surah number (1..114). */
  surah: number;
  /** Quran-wide ayah number (1..6236). */
  global: number;
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

/**
 * Per-ayah streaming URL for a reciter, or null when the reciter's source
 * only offers whole-surah files (use {@link surahAudioUrl} for those).
 */
export function ayahAudioUrl(ref: AyahRef, reciterId: string): string | null {
  const reciter = BY_ID.get(reciterId);
  if (!reciter || reciter.perSurah) return null;
  if (reciter.source === "islamic") {
    return `${ISLAMIC_BASE}/${reciter.bitrate ?? 128}/${reciter.path}/${ref.global}.mp3`;
  }
  // everyayah.com: {surah:3}{ayah:3}.mp3 (local numbering, NOT the global number).
  return `${EVERYAYAH_BASE}/${reciter.path}/${pad3(ref.surah)}${pad3(ref.ayah)}.mp3`;
}

/** Whole-surah streaming URL (mp3quran reciters), or null for per-ayah reciters. */
export function surahAudioUrl(surah: number, reciterId: string): string | null {
  const reciter = BY_ID.get(reciterId);
  if (!reciter || !reciter.perSurah) return null;
  return `${reciter.path}${pad3(surah)}.mp3`;
}

/** True when this reciter's audio can only be played one whole surah at a time. */
export function isPerSurahReciter(reciterId: string): boolean {
  return BY_ID.get(reciterId)?.perSurah === true;
}

/**
 * URL for a 10-second-scale preview of any reciter: the first ayah of
 * Al-Fatiha for per-ayah sources, the whole Surah 1 for mp3quran ones.
 */
export function previewAudioUrl(reciterId: string): string | null {
  return ayahAudioUrl({ surah: 1, ayah: 1, global: 1 }, reciterId) ?? surahAudioUrl(1, reciterId);
}
