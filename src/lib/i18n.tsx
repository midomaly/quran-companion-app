/**
 * Multilingual interface (phase 2): language selection for English, Arabic,
 * French, Hausa and Yoruba covering navigation, common labels, Home and the
 * Prayer dashboard — the surfaces users touch every day.
 *
 * Scope notes (intentional, see README):
 * - Religious *content* (Qur'an translation, hadith text, duas) is NOT
 *   machine-translated here. Verified translations are pulled from their
 *   sources (e.g. ha.gumi / fr.hamidullah for Qur'an translations); Yoruba
 *   has no verified Qur'an translation in our sources, so Yoruba covers the
 *   interface only.
 * - Arabic sets document direction to RTL. Pages keep their own `dir` on
 *   Arabic religious text regardless.
 *
 * `t(key)` falls back to English when a key is missing, so adding a language
 * never breaks the UI.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LanguageId = "en" | "ar" | "fr" | "ha" | "yo";

export interface LanguageInfo {
  id: LanguageId;
  /** Native label shown in the picker. */
  label: string;
  dir: "ltr" | "rtl";
}

export const LANGUAGES: LanguageInfo[] = [
  { id: "en", label: "English", dir: "ltr" },
  { id: "ar", label: "العربية", dir: "rtl" },
  { id: "fr", label: "Français", dir: "ltr" },
  { id: "ha", label: "Hausa", dir: "ltr" },
  { id: "yo", label: "Yorùbá", dir: "ltr" },
];

export function isLanguageId(value: unknown): value is LanguageId {
  return typeof value === "string" && LANGUAGES.some((l) => l.id === value);
}

type Dict = Partial<Record<string, string>>;

/* ------------------------------------------------------------------ */
/* Dictionaries — flat keys, English is the source of truth            */
/* ------------------------------------------------------------------ */

const en: Dict = {
  "nav.home": "Home",
  "nav.quran": "Quran",
  "nav.prayer": "Prayer",
  "nav.calendar": "Calendar",
  "nav.more": "More",
  "nav.qibla": "Qibla compass",
  "nav.tasbih": "Tasbih counter",
  "nav.duas": "Duas library",
  "nav.hadith": "Hadith library",
  "nav.ramadan": "Ramadan & Zakat",
  "nav.reminders": "Reminders",
  "nav.mosques": "Mosque finder",
  "nav.learn": "Learning center",
  "nav.downloads": "Offline & downloads",
  "nav.tracker": "Worship tracker",
  "common.settings": "Settings",
  "common.search": "Search",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.done": "Done",
  "common.today": "Today",
  "common.close": "Close",
  "common.language": "Language",
  "home.greeting": "As-salamu alaikum",
  "home.morning": "Good morning",
  "home.afternoon": "Good afternoon",
  "home.evening": "Good evening",
  "home.startReading": "Start reading",
  "home.continueReading": "Continue reading",
  "home.verseOfDay": "Verse of the day",
  "home.readQuran": "Read the Qur'an",
  "home.companion": "Muslim companion",
  "home.surahs": "Surahs",
  "home.juz": "Juz",
  "home.bookmarks": "Bookmarks",
  "home.prayerTimes": "Prayer times",
  "home.tasbih": "Tasbih",
  "home.calendar": "Calendar",
  "home.hadith": "Hadith",
  "home.nextPrayer": "Next prayer",
  "prayer.title": "Prayer times",
  "prayer.today": "Today's schedule",
  "prayer.week": "Weekly timetable",
  "prayer.month": "Monthly timetable",
  "prayer.settings": "Calculation & alarms",
  "prayer.location": "Location",
  "prayer.method": "Method",
  "prayer.asr": "Asr",
  "prayer.standard": "Standard (Shafi'i)",
  "prayer.hanafi": "Hanafi",
  "prayer.alarms": "Alarms",
  "prayer.testAlarm": "Test alarm",
  "prayer.notifications": "Notifications",
  "prayer.setPrayerNotifications": "Enable reminders for each prayer here.",
  "prayer.noLocation": "Set your location to see today's times",
  "prayer.fajr": "Fajr",
  "prayer.sunrise": "Sunrise",
  "prayer.dhuhr": "Dhuhr",
  "prayer.asrName": "Asr",
  "prayer.maghrib": "Maghrib",
  "prayer.isha": "Isha",
  "prayer.countdown": "Countdown",
  "common.theme": "Theme",
  "common.light": "Light",
  "common.dark": "Dark",
  "common.system": "System",
};

const ar: Dict = {
  "nav.home": "الرئيسية",
  "nav.quran": "القرآن",
  "nav.prayer": "الصلاة",
  "nav.calendar": "التقويم",
  "nav.more": "المزيد",
  "nav.qibla": "بوصلة القبلة",
  "nav.tasbih": "المسبحة",
  "nav.duas": "الأدعية",
  "nav.hadith": "الحديث",
  "nav.ramadan": "رمضان والزكاة",
  "nav.reminders": "التذكيرات",
  "nav.mosques": "بحث عن مسجد",
  "nav.learn": "مركز التعلم",
  "nav.downloads": "دوناتج وأوفلاين",
  "nav.tracker": "متابعة العبادة",
  "common.settings": "الإعدادات",
  "common.search": "بحث",
  "common.cancel": "إلغاء",
  "common.save": "حفظ",
  "common.delete": "حذف",
  "common.edit": "تعديل",
  "common.done": "تم",
  "common.today": "اليوم",
  "common.close": "إغلاق",
  "common.language": "اللغة",
  "home.greeting": "السلام عليكم ورحمة الله",
  "home.morning": "صباح الخير",
  "home.afternoon": "مساء الخير",
  "home.evening": "مساء الخير",
  "home.startReading": "ابدأ القراءة",
  "home.continueReading": "متابعة القراءة",
  "home.verseOfDay": "آية اليوم",
  "home.readQuran": "اقرأ القرآن",
  "home.companion": "رفيق المسلم",
  "home.surahs": "السور",
  "home.juz": "الأجزاء",
  "home.bookmarks": "العلامات",
  "home.prayerTimes": "مواقيت الصلاة",
  "home.tasbih": "المسبحة",
  "home.calendar": "التقويم",
  "home.hadith": "الحديث",
  "home.nextPrayer": "الصلاة القادمة",
  "prayer.title": "مواقيت الصلاة",
  "prayer.today": "جدول اليوم",
  "prayer.week": "الجدول الأسبوعي",
  "prayer.month": "الجدول الشهري",
  "prayer.settings": "الحساب والتنبيهات",
  "prayer.location": "الموقع",
  "prayer.method": "الطريقة",
  "prayer.asr": "العصر",
  "prayer.standard": "الجمهور",
  "prayer.hanafi": "الحنفي",
  "prayer.alarms": "المنبهات",
  "prayer.testAlarm": "تجربة المنبه",
  "prayer.notifications": "الإشعارات",
  "prayer.setPrayerNotifications": "فعّل التذكير لكل صلاة هنا.",
  "prayer.noLocation": "حدد موقعك لرؤية مواقيت اليوم",
  "prayer.fajr": "الفجر",
  "prayer.sunrise": "الشروق",
  "prayer.dhuhr": "الظهر",
  "prayer.asrName": "العصر",
  "prayer.maghrib": "المغرب",
  "prayer.isha": "العشاء",
  "prayer.countdown": "الوقت المتبقي",
  "common.theme": "المظهر",
  "common.light": "فاتح",
  "common.dark": "داكن",
  "common.system": "النظام",
};

const fr: Dict = {
  "nav.home": "Accueil",
  "nav.quran": "Coran",
  "nav.prayer": "Prières",
  "nav.calendar": "Calendrier",
  "nav.more": "Plus",
  "nav.qibla": "Boussole Qibla",
  "nav.tasbih": "Compteur de tasbih",
  "nav.duas": "Library des dua",
  "nav.hadith": "Hadiths",
  "nav.ramadan": "Ramadan et zakat",
  "nav.reminders": "Rappels",
  "nav.mosques": "Trouver une mosquée",
  "nav.learn": "Centre d'apprentissage",
  "nav.downloads": "Hors ligne",
  "nav.tracker": "Suivi d'adoration",
  "common.settings": "Paramètres",
  "common.search": "Rechercher",
  "common.cancel": "Annuler",
  "common.save": "Enregistrer",
  "common.delete": "Supprimer",
  "common.edit": "Modifier",
  "common.done": "Terminé",
  "common.today": "Aujourd'hui",
  "common.close": "Fermer",
  "common.language": "Langue",
  "home.greeting": "As-salamu alaikum",
  "home.morning": "Bonjour",
  "home.afternoon": "Bon après-midi",
  "home.evening": "Bonsoir",
  "home.startReading": "Commencer la lecture",
  "home.continueReading": "Continuer la lecture",
  "home.verseOfDay": "Verset du jour",
  "home.readQuran": "Lire le Coran",
  "home.companion": "Compagnon musulman",
  "home.surahs": "Sourates",
  "home.juz": "Juz",
  "home.bookmarks": "Signets",
  "home.prayerTimes": "Horaires de prière",
  "home.tasbih": "Tasbih",
  "home.calendar": "Calendrier",
  "home.hadith": "Hadith",
  "home.nextPrayer": "Prochaine prière",
  "prayer.title": "Horaires de prière",
  "prayer.today": "Horaire du jour",
  "prayer.week": "Horaire hebdomadaire",
  "prayer.month": "Horaire mensuel",
  "prayer.settings": "Calcul et alarmes",
  "prayer.location": "Localisation",
  "prayer.method": "Méthode",
  "prayer.asr": "Asr",
  "prayer.standard": "Standard (Shafi'i)",
  "prayer.hanafi": "Hanafite",
  "prayer.alarms": "Alarmes",
  "prayer.testAlarm": "Tester l'alarme",
  "prayer.notifications": "Notifications",
  "prayer.setPrayerNotifications": "Activez les rappels pour chaque prière ici.",
  "prayer.noLocation": "Définissez votre position pour voir les horaires",
  "prayer.fajr": "Fajr",
  "prayer.sunrise": "Lever du soleil",
  "prayer.dhuhr": "Dhouhr",
  "prayer.asrName": "Asr",
  "prayer.maghrib": "Maghrib",
  "prayer.isha": "Icha",
  "prayer.countdown": "Compte à rebours",
  "common.theme": "Thème",
  "common.light": "Clair",
  "common.dark": "Sombre",
  "common.system": "Système",
};

const ha: Dict = {
  "nav.home": "Gida",
  "nav.quran": "Alkur'ani",
  "nav.prayer": "Sallah",
  "nav.calendar": "Kwalta",
  "nav.more": "Ƙari",
  "nav.qibla": "Kibla",
  "nav.tasbih": "Tasbih",
  "nav.duas": "Addu'o'i",
  "nav.hadith": "Hadisi",
  "nav.ramadan": "Ramadani da Zakka",
  "nav.reminders": "Tunatarwa",
  "nav.mosques": "Nemo masallaci",
  "nav.learn": "Dakin koyo",
  "nav.downloads": "Ba tare da intanet ba",
  "nav.tracker": "Biyan ubauda",
  "common.settings": "Saituna",
  "common.search": "Nema",
  "common.cancel": "Soke",
  "common.save": "Ajiye",
  "common.delete": "Goge",
  "common.edit": "Gyara",
  "common.done": "An gama",
  "common.today": "Yau",
  "common.close": "Rufe",
  "common.language": "Harshe",
  "home.greeting": "Assalamu alaikum",
  "home.morning": "Barka da safiya",
  "home.afternoon": "Barka da rana",
  "home.evening": "Barka da yamma",
  "home.startReading": "Fara karantawa",
  "home.continueReading": "Ci gaba da karantawa",
  "home.verseOfDay": "Ayoyin yau",
  "home.readQuran": "Karanta Alkur'ani",
  "home.companion": "Abokiyar Musulunci",
  "home.surahs": "Surori",
  "home.juz": "Juzu'i",
  "home.bookmarks": "Alamomi",
  "home.prayerTimes": "Lokacin sallah",
  "home.tasbih": "Tasbih",
  "home.calendar": "Kwalta",
  "home.hadith": "Hadisi",
  "home.nextPrayer": "Sallah ta gaba",
  "prayer.title": "Lokacin sallah",
  "prayer.today": "Jadawalin yau",
  "prayer.week": "Mako da mako",
  "prayer.month": "Wata da wata",
  "prayer.settings": "Kima da girgizar kai",
  "prayer.location": "Wuri",
  "prayer.method": "Hanya",
  "prayer.asr": "Asr",
  "prayer.standard": "Na yau da kullum",
  "prayer.hanafi": "Hanafi",
  "prayer.alarms": "Girgizar kai",
  "prayer.testAlarm": "Gwada girgizar kai",
  "prayer.notifications": "Sanarwa",
  "prayer.setPrayerNotifications": "Kunna tunatarwar kowace sallah a nan.",
  "prayer.noLocation": "Saita wurinka don ganin lokacin yau",
  "prayer.fajr": "Sahar",
  "prayer.sunrise": "Haske",
  "prayer.dhuhr": "Tsakar rana",
  "prayer.asrName": "Asr",
  "prayer.maghrib": "Maghrib",
  "prayer.isha": "Isha",
  "prayer.countdown": "Lokacin da ya rage",
  "common.theme": "Salon gani",
  "common.light": "Haske",
  "common.dark": "Duhu",
  "common.system": "Tsari",
};

const yo: Dict = {
  "nav.home": "Ilé",
  "nav.quran": "Kur'ani",
  "nav.prayer": "Ìṣìn",
  "nav.calendar": "Àkọsílẹ̀",
  "nav.more": "Mìíràn",
  "nav.qibla": "Kíbùlá",
  "nav.tasbih": "Tàsbìh",
  "nav.duas": "Àdúrà",
  "nav.hadith": "Hàdìs",
  "nav.ramadan": "Ràmàdàn àti Zakát",
  "nav.reminders": "Ìrántí",
  "nav.mosques": "Wa ìjọ́kọ́",
  "nav.learn": "Ìwé-kọ́",
  "nav.downloads": "Láìsí ìntánẹ́ẹ̀tì",
  "nav.tracker": "Tírà ìṣìjì",
  "common.settings": "Ètò",
  "common.search": "Wá",
  "common.cancel": "Fagbẹ́",
  "common.save": "Fi ipamọ́",
  "common.delete": "Parẹ́",
  "common.edit": "Ṣàtúnṣe",
  "common.done": "Parí",
  "common.today": "Lónìí",
  "common.close": "Tí",
  "common.language": "Èdè",
  "home.greeting": "Àssálàmu àlàykùm",
  "home.morning": "Ẹ káàárọ̀",
  "home.afternoon": "Ẹ káàsán",
  "home.evening": "Ẹ káalẹ́",
  "home.startReading": "Bẹ̀rẹ̀ ìkàwé",
  "home.continueReading": "Tẹ̀síwájú ìkàwé",
  "home.verseOfDay": "Àyá ọ̀la",
  "home.readQuran": "Ka Kùránì",
  "home.companion": "Alágbàgbọ́ Ìmísì",
  "home.surahs": "Sùrà",
  "home.juz": "Júzù",
  "home.bookmarks": "Àmì",
  "home.prayerTimes": "Àkókò ìṣìn",
  "home.tasbih": "Tàsbìh",
  "home.calendar": "Àkọsílẹ̀",
  "home.hadith": "Hàdìs",
  "home.nextPrayer": "Ìṣìn tókàn",
  "prayer.title": "Àkókò ìṣìn",
  "prayer.today": "Àkókò lónìí",
  "prayer.week": "Àkókò ọ̀sẹ̀",
  "prayer.month": "Àkókò oṣù",
  "prayer.settings": "Ìṣiro àti ìrántí",
  "prayer.location": "Ipò",
  "prayer.method": "Ọ̀nà",
  "prayer.asr": "Asr",
  "prayer.standard": "Àpèjúwe",
  "prayer.hanafi": "Hanafì",
  "prayer.alarms": "Ìrántí",
  "prayer.testAlarm": "Dán ìrántí wò",
  "prayer.notifications": "Ìkèlọ̀rọ̀",
  "prayer.setPrayerNotifications": "Mú ìrántí ìṣìn kọ̀ọ̀kan lọ́ wọ̀n níbí.",
  "prayer.noLocation": "Ṣètò ipò rẹ láti rí àkókò lónìí",
  "prayer.fajr": "Fàjì",
  "prayer.sunrise": "Ìmọ́lẹ̀",
  "prayer.dhuhr": "Ọ̀sán",
  "prayer.asrName": "Asr",
  "prayer.maghrib": "Màgrìb",
  "prayer.isha": "Ìṣàlẹ̀",
  "prayer.countdown": "Ìkòfin",
  "common.theme": "Àwòrán",
  "common.light": "Ìmọ́lẹ̀",
  "common.dark": "Òkùnkùn",
  "common.system": "Ètò",
};

const DICTIONARIES: Record<LanguageId, Dict> = { en, ar, fr, ha, yo };

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

const LANG_KEY = "noor:lang";

export interface I18nValue {
  lang: LanguageId;
  dir: "ltr" | "rtl";
  setLang: (lang: LanguageId) => void;
  /** Translate a key; falls back to English, then to the key itself. */
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function loadLang(): LanguageId {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (isLanguageId(raw)) return raw;
  } catch {
    /* storage unavailable */
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageId>(loadLang);

  const info = LANGUAGES.find((l) => l.id === lang) ?? LANGUAGES[0];

  // Apply direction + lang attribute to the document.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = info.id;
    root.dir = info.dir;
  }, [info]);

  const setLang = useCallback((next: LanguageId) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const value = DICTIONARIES[lang]?.[key] ?? en[key];
      return value ?? key;
    },
    [lang],
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, dir: info.dir, setLang, t }),
    [lang, info.dir, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return ctx;
}
