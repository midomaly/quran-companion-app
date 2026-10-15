/**
 * Curated hadith collection — brief, well-known reports from the verified
 * collections, many of them from Imām an-Nawawī's Forty Hadith. Each entry
 * names its source so it can be checked in the original. English is a
 * faithful rendering of the meaning.
 */

export type HadithTheme = "faith" | "character" | "conduct" | "knowledge" | "community";

export interface Hadith {
  id: string;
  text: string;
  source: string;
  theme: HadithTheme;
}

export const HADITH_THEMES: { id: HadithTheme; label: string }[] = [
  { id: "faith", label: "Faith" },
  { id: "character", label: "Character" },
  { id: "conduct", label: "Conduct" },
  { id: "knowledge", label: "Knowledge" },
  { id: "community", label: "Community" },
];

export const HADITHS: Hadith[] = [
  {
    id: "intentions",
    text: "Actions are judged by intentions, and every person will get what they intended. So whoever emigrated for the sake of Allah and His Messenger, his emigration was for Allah and His Messenger; and whoever emigrated for worldly gain or to marry a woman, his emigration was for that which he emigrated for.",
    source: "Sahih al-Bukhari & Sahih Muslim",
    theme: "faith",
  },
  {
    id: "jibreel",
    text: "Islam is built on five: the testimony that there is no god but Allah and that Muhammad is the Messenger of Allah, establishing prayer, giving zakat, fasting Ramadan, and performing Hajj to the House. Ihsan is to worship Allah as if you see Him, and though you do not see Him, He sees you.",
    source: "Sahih al-Bukhari & Sahih Muslim",
    theme: "faith",
  },
  {
    id: "brother-love",
    text: "None of you truly believes until he loves for his brother what he loves for himself.",
    source: "Sahih al-Bukhari & Sahih Muslim",
    theme: "character",
  },
  {
    id: "best-deeds",
    text: "The most beloved deeds to Allah are those done consistently, even if they are small.",
    source: "Sahih al-Bukhari & Sahih Muslim",
    theme: "conduct",
  },
  {
    id: "best-of-you",
    text: "The best of you are those with the best character.",
    source: "Sahih al-Bukhari",
    theme: "character",
  },
  {
    id: "tongue-hands",
    text: "A Muslim is one from whose tongue and hand the Muslims are safe.",
    source: "Sahih al-Bukhari & Sahih Muslim",
    theme: "conduct",
  },
  {
    id: "speak-good",
    text: "Whoever believes in Allah and the Last Day, let him speak good or remain silent.",
    source: "Sahih al-Bukhari & Sahih Muslim",
    theme: "conduct",
  },
  {
    id: "religion-easy",
    text: "Religion is easy, and no one overloads religion except that it overwhelms him. So be moderate, and if you cannot, then strive to do what you can.",
    source: "Sahih al-Bukhari",
    theme: "faith",
  },
  {
    id: "no-harm",
    text: "The believer does not inflict harm (on others) with his tongue or his hand.",
    source: "Sahih Muslim",
    theme: "conduct",
  },
  {
    id: "angry-strong",
    text: "The strong person is not the one who can wrestle others down; the strong one is the one who controls himself when he is angry.",
    source: "Sahih al-Bukhari & Sahih Muslim",
    theme: "character",
  },
  {
    id: "mercy",
    text: "The Most Merciful shows mercy to the merciful. Be merciful to those on earth and the One in the heavens will be merciful to you.",
    source: "Jami' at-Tirmidhi",
    theme: "character",
  },
  {
    id: "charity-no-decrease",
    text: "Charity does not decrease wealth, and Allah increases the one who forgives with honour and dignity — and no one humbles himself for the sake of Allah except that Allah raises him.",
    source: "Sahih Muslim",
    theme: "conduct",
  },
  {
    id: "two-words",
    text: "Two words are light on the tongue, heavy on the scale, beloved to the Most Merciful: Subhanallahi wa bihamdihi, Subhanallahil-'Azim.",
    source: "Sahih al-Bukhari",
    theme: "faith",
  },
  {
    id: "seek-knowledge",
    text: "Seeking knowledge is an obligation upon every Muslim.",
    source: "Sunan Ibn Majah",
    theme: "knowledge",
  },
  {
    id: "quran-teachers",
    text: "The best of you are those who learn the Qur'an and teach it.",
    source: "Sahih al-Bukhari",
    theme: "knowledge",
  },
  {
    id: "cleanliness",
    text: "Cleanliness is half of faith.",
    source: "Sahih Muslim",
    theme: "conduct",
  },
  {
    id: "harm-road",
    text: "Removing something harmful from the road is charity.",
    source: "Sahih al-Bukhari & Sahih Muslim",
    theme: "community",
  },
  {
    id: "gentle",
    text: "Allah is Gentle and loves gentleness in all matters.",
    source: "Sahih al-Bukhari & Sahih Muslim",
    theme: "character",
  },
  {
    id: "young-elders",
    text: "He is not one of us who does not show mercy to our young and respect our elders.",
    source: "Jami' at-Tirmidhi",
    theme: "community",
  },
  {
    id: "world-prison",
    text: "The world is the believer's prison and the disbeliever's Paradise.",
    source: "Sahih Muslim",
    theme: "faith",
  },
  {
    id: "affair-wonderful",
    text: "Wondrous is the affair of the believer, for all of it is good: if good befalls him he is grateful, and if hardship befalls him he is patient. And that is good only for the believer.",
    source: "Sahih Muslim",
    theme: "faith",
  },
  {
    id: "neighbours",
    text: "Jibril kept urging me about the neighbour until I thought he would include him among the heirs.",
    source: "Sahih al-Bukhari & Sahih Muslim",
    theme: "community",
  },
  {
    id: "words-wisdom",
    text: "Convey from me even if it is one verse, and speak of Bani Isra'il without hesitation — there is no harm in it, and there is no shame in speaking wisely with people.",
    source: "Sahih al-Bukhari",
    theme: "knowledge",
  },
  {
    id: "envy",
    text: "Beware of envy, for envy devours good deeds as fire devours wood.",
    source: "Jami' at-Tirmidhi",
    theme: "character",
  },
];
