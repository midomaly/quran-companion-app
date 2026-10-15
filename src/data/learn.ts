/**
 * Islamic learning content (phase 2): guides, seerah milestones and quiz
 * questions. Every fact here is mainstream, uncontroversial knowledge —
 * pillars of Islām/īmān, the pillars of salāh, standard wuḍūʾ steps, and
 * well-established Seerah events. Sources are named where relevant; nothing
 * here invents fiqh rulings or hadith citations.
 *
 * Content types are labelled distinctly in the UI so Qur'an, hadith and
 * educational material are never conflated. This is educational material, not
 * religious rulings — the app always points to scholars for fatwā.
 */

export interface Guide {
  id: string;
  title: string;
  subtitle: string;
  kind: "guide" | "seerah";
  steps: string[];
  note?: string;
}

export const GUIDES: Guide[] = [
  {
    id: "pillars-islam",
    title: "The pillars of Islām",
    subtitle: "Five practices on which the religion stands",
    kind: "guide",
    steps: [
      "Shahāda — bearing witness that none is worthy of worship but Allah and that Muḥammad ﷺ is His servant and Messenger.",
      "Ṣalāh — the five daily prayers.",
      "Zakāt — obligatory charity on qualifying wealth.",
      "Ṣawm — fasting the month of Ramaḍān.",
      "Ḥajj — the pilgrimage to the House in Makkah, for those able to make it.",
    ],
    note: "Reported in Ṣaḥīḥ al-Bukhārī and Ṣaḥīḥ Muslim from Ibn ʿUmar (may Allah be pleased with him).",
  },
  {
    id: "pillars-iman",
    title: "The pillars of Īmān",
    subtitle: "Six articles of faith",
    kind: "guide",
    steps: [
      "Belief in Allah — His oneness, His names and attributes.",
      "Belief in the angels — creation of light who obey Allah's command.",
      "Belief in the revealed books — the Torah, Zabūr, Injīl and Qur'ān.",
      "Belief in the messengers — starting with Ādam and ending with Muḥammad ﷺ.",
      "Belief in the Last Day.",
      "Belief in qadar — the divine decree, its good and its bad.",
    ],
    note: "From Jibrīl's famous hadith — Ṣaḥīḥ Muslim.",
  },
  {
    id: "wudu",
    title: "How to perform wuḍūʾ (ablution)",
    subtitle: "The purification before ṣalāh",
    kind: "guide",
    steps: [
      "Make the intention, then say 'Bismillāh'.",
      "Wash the hands three times up to the wrists.",
      "Rinse the mouth and pass water into the nostrils three times (using the same handful).",
      "Wash the face three times — from hairline to chin, ear to ear.",
      "Wash the arms three times — including the elbows, right arm first.",
      "Wipe the head once — front to back and returning.",
      "Wipe the ears once — inside and out with damp fingers.",
      "Wash the feet three times — including the ankles, right foot first.",
      "Conclude with: 'Ash-hadu an lā ilāha ill-Allāh waḥdahu lā sharīka lah, wa ash-hadu anna Muḥammadan ʿabduhū wa rasūluh.'",
    ],
    note: "The method and order are established in Ṣaḥīḥ al-Bukhārī and Muslim. Tayammum (dry purification) is available with earth or dust when water is unavailable or harmful.",
  },
  {
    id: "salah-pillars",
    title: "The pillars of ṣalāh",
    subtitle: "What every prayer must contain",
    kind: "guide",
    steps: [
      "Qiyām — standing, when able.",
      "Takbīrat al-iḥrām — 'Allāhu akbar' to enter the prayer.",
      "Reciting al-Fātiḥah in every rakʿah.",
      "Rukūʿ — bowing with hands on knees, back straight.",
      "Iʿtihāl — rising from bowing: 'Samiʿa Allāhu liman ḥamidah'.",
      "Sujūd — prostrating on seven limbs with 'Subḥāna Rabbiyal-Aʿlā'.",
      "Sitting between the two prostrations.",
      "Tashahhud — bearing witness while seated.",
      "The taslīm — 'As-salāmu ʿalaykum wa raḥmatullāh' once each way, finishing the prayer.",
    ],
    note: "A summary of fiqh essentials — Ḥanafī, Mālikī, Shāfiʿī and Ḥanbalī schools share these pillars with minor differences in details; learn from a trusted local teacher.",
  },
  {
    id: "salah-flow",
    title: "Anatomy of a two-rakʿah prayer",
    subtitle: "Following the imām, step by step",
    kind: "guide",
    steps: [
      "Face the qibla, make the intention, raise hands to the ears and say 'Allāhu akbar'.",
      "Fold the right hand over the left on the chest and recite the opening supplication (duʿāʾ al-istiftāḥ), then al-Fātiḥah and a short surah.",
      "Bow: 'Allāhu akbar', then recite 'Subḥāna Rabbiyal-Aʿlā' three times — or more if praying alone.",
      "Rise: 'Samiʿa Allāhu liman ḥamidah' — then 'Rabbanā wa laka l-ḥamd'.",
      "Prostrate: 'Subḥāna Rabbiyal-Aʿlā' — say it slowly, say 'Rabbighfir lī' between the prostrations.",
      "Sit for the tashahhud, then stand for the second rakʿah and repeat the recitation.",
      "Finish sitting with the tashahhud and taslīm. If praying behind an imām, follow his movements exactly.",
    ],
  },
  {
    id: "seerah",
    title: "Seerah timeline",
    subtitle: "Key events of the Prophet's life ﷺ",
    kind: "seerah",
    steps: [
      "c. 570 CE — born in Makkah, the Year of the Elephant; father ʿAbdullāh died before his birth, mother Āminah died when he was six.",
      "Raised first by his grandfather ʿAbd al-Muṭṭalib, then by his uncle Abū Ṭālib; known as al-Amīn — the trustworthy.",
      "c. 595 — married Khadījah at about 25; she was his first supporter.",
      "c. 610 — the first revelation in the Cave of Ḥirāʿ: 'Iqra' bismi Rabbik' — the beginning of Prophethood at 40.",
      "c. 610–619 — the private then public call in Makkah; years of persecution, including the boycott in Shi'b Abī Ṭālib.",
      "619 — the Year of Sorrow: deaths of Abū Ṭālib and Khadījah.",
      "622 — the Hijrah to Madinah: the turning point; the first Islamic state and the constitution of Madinah.",
      "624 — Badr: the first major battle; Ḥudaybiyyah, a treaty, in 628.",
      "630 — the conquest of Makkah; idols removed from the Ka'bah.",
      "632 — the Farewell Ḥajj and the passing in Madinah, aged about 63. The Quran and Sunnah he was entrusted with remain with us.",
    ],
    note: "Dates are approximate — Seerah chronology differs slightly between scholars; see Ibn Hishām's sīrah and the works of modern Seerah scholars for detail.",
  },
];

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export const QUIZ: QuizQuestion[] = [
  {
    id: "q1",
    question: "How many pillars does Islām have?",
    options: ["Four", "Five", "Six", "Seven"],
    answerIndex: 1,
    explanation:
      "Five: shahāda, ṣalāh, zakāt, ṣawm of Ramaḍān and ḥajj — from the hadith of Ibn ʿUmar in Ṣaḥīḥ Muslim.",
  },
  {
    id: "q2",
    question: "Which angel brought the first revelation in the Cave of Ḥirāʿ?",
    options: ["Mīkāʾīl", "Isrāfīl", "Jibrīl", "Malik"],
    answerIndex: 2,
    explanation: "Jibrīl brought the Qur'ān to the Prophet ﷺ, beginning with 'Iqra'.",
  },
  {
    id: "q3",
    question: "What is the qibla?",
    options: [
      "The direction of prayer toward the Ka'bah in Makkah",
      "The Friday sermon",
      "The call to prayer",
      "The zakāt rate",
    ],
    answerIndex: 0,
    explanation:
      "The qibla is the direction of the Ka'bah — this app's Qibla compass points to it from anywhere.",
  },
  {
    id: "q4",
    question: "What is the Hijrah?",
    options: [
      "The first revelation",
      "The migration from Makkah to Madinah",
      "The conquest of Makkah",
      "The farewell pilgrimage",
    ],
    answerIndex: 1,
    explanation:
      "The migration to Madinah in 622 CE — it begins the Islamic calendar (1 AH).",
  },
  {
    id: "q5",
    question: "Which surah is recited in every rakʿah of prayer?",
    options: ["Al-Baqarah", "Al-Ikhlāṣ", "Al-Fātiḥah", "Al-Kawthar"],
    answerIndex: 2,
    explanation: "Al-Fātiḥah — 'the Opening' — is a pillar of every rakʿah.",
  },
  {
    id: "q6",
    question: "In which cave did the first revelation come?",
    options: ["Thawr", "Ḥirāʿ", "Kandahār", "Uḥud"],
    answerIndex: 1,
    explanation: "The Cave of Ḥirāʿ, above Makkah, where the Prophet ﷺ used to retreat.",
  },
  {
    id: "q7",
    question: "How many articles of faith (pillars of Īmān) are there?",
    options: ["Three", "Five", "Six", "Ten"],
    answerIndex: 2,
    explanation: "Six: belief in Allah, the angels, the books, the messengers, the Last Day and qadar.",
  },
  {
    id: "q8",
    question: "What is tayammum?",
    options: [
      "A type of prayer",
      "Dry purification with earth when water is unavailable",
      "The call to prayer",
      "A charity payment",
    ],
    answerIndex: 1,
    explanation:
      "Tayammum is the permitted dry ablution using clean earth or dust when water is missing or unusable.",
  },
];
