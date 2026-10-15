/**
 * Curated duʿāʾ library — every entry is either Qur'anic or from rigorously
 * authenticated collections (Bukhārī, Muslim, Abū Dāwūd, Tirmidhī, Ibn Mājah).
 * Arabic in standard ʿUthmānī-style orthography; English is a faithful
 * meaning, not a literal translation. Sources are named so anything can be
 * verified against the original.
 */

export interface Dua {
  id: string;
  title: string;
  arabic: string;
  translation: string;
  source: string;
}

export interface DuaCategory {
  id: string;
  label: string;
  blurb: string;
  duas: Dua[];
}

export const DUA_CATEGORIES: DuaCategory[] = [
  {
    id: "morning-evening",
    label: "Morning & evening",
    blurb: "Adhkār that bookend every day.",
    duas: [
      {
        id: "ayat-kursi",
        title: "Āyat al-Kursī",
        arabic:
          "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۗ مَن ذَا ٱلَّذِى يَشْفَعُ عِندَهُۥٓ إِلَّا بِإِذْنِهِۦ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَىْءٍ مِّنْ عِلْمِهِۦٓ إِلَّا بِمَا شَآءَ ۚ وَسِعَ كُرْسِيُّهُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ ۖ وَلَا يَـُٔودُهُۥ حِفْظُهُمَا ۚ وَهُوَ ٱلْعَلِىُّ ٱلْعَظِيمُ",
        translation:
          "Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursī extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
        source: "Qur'an 2:255",
      },
      {
        id: "morning",
        title: "Morning adhkar",
        arabic:
          "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ. رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        translation:
          "We have entered the morning and with it all dominion belongs to Allah. Praise is for Allah. There is no deity worthy of worship except Allah alone, without partner; His is the dominion and His the praise, and He has power over all things. Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
        source: "Sahih Muslim",
      },
      {
        id: "evening",
        title: "Evening adhkar",
        arabic:
          "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ. رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        translation:
          "We have entered the evening and with it all dominion belongs to Allah. Praise is for Allah. There is no deity worthy of worship except Allah alone, without partner; His is the dominion and His the praise, and He has power over all things. Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
        source: "Sahih Muslim",
      },
      {
        id: "live-die",
        title: "By Your name we live and die",
        arabic:
          "اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ",
        translation:
          "O Allah, by You we enter the evening and by You we enter the morning; by You we live and by You we die, and to You is the final return.",
        source: "Jami' at-Tirmidhi",
      },
      {
        id: "sayyid-istighfar",
        title: "Sayyid al-Istighfār (Master of seeking forgiveness)",
        arabic:
          "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
        translation:
          "O Allah, You are my Lord; there is no deity worthy of worship except You. You created me and I am Your servant, and I hold to Your covenant as much as I am able. I seek refuge in You from the evil I have done. I acknowledge before You Your favour upon me, and I acknowledge my sin, so forgive me — for none forgives sins except You.",
        source: "Sahih al-Bukhari",
      },
      {
        id: "light",
        title: "Light upon light",
        arabic:
          "اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا، وَفِي لِسَانِي نُورًا، وَفِي سَمْعِي نُورًا، وَفِي بَصَرِي نُورًا، وَمِنْ فَوْقِي نُورًا، وَمِنْ تَحْتِي نُورًا، وَعَنْ يَمِينِي نُورًا، وَعَنْ شِمَالِي نُورًا، وَمِنْ أَمَامِي نُورًا، وَمِنْ خَلْفِي نُورًا، وَاجْعَلْ فِي نَفْسِي نُورًا، وَأَعْظِمْ لِي نُورًا",
        translation:
          "O Allah, place light in my heart, light on my tongue, light in my hearing, light in my sight, light above me, light below me, light on my right, light on my left, light in front of me, light behind me; place light within my soul, and make the light great for me.",
        source: "Sahih al-Bukhari & Sahih Muslim",
      },
    ],
  },
  {
    id: "after-salah",
    label: "After the prayer",
    blurb: "What is said between the taslām and moving on.",
    duas: [
      {
        id: "istighfar",
        title: "Seeking forgiveness",
        arabic: "أَسْتَغْفِرُ اللَّهَ (ثلاثًا) ثُمَّ: اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
        translation:
          "I seek Allah's forgiveness (three times), then: O Allah, You are Peace and from You comes peace. Blessed are You, O Possessor of majesty and honour.",
        source: "Sahih Muslim",
      },
      {
        id: "post-salah-help",
        title: "Help in worship",
        arabic: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
        translation:
          "O Allah, help me to remember You, to thank You, and to worship You well.",
        source: "Sunan Abi Dawud & Jami' at-Tirmidhi",
      },
      {
        id: "glory-lord",
        title: "Glory to my Lord, the Exalted",
        arabic: "سُبْحَانَ رَبِّكَ رَبِّ الْعِزَّةِ عَمَّا يَصِفُونَ، وَسَلَامٌ عَلَى الْمُرْسَلِينَ، وَالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
        translation:
          "Glory is to Your Lord, the Lord of Majesty, beyond what they describe; and peace be upon the messengers; and praise be to Allah, Lord of all the worlds.",
        source: "Qur'an 37:180–182",
      },
      {
        id: "forgive",
        title: "Forgiveness, three times",
        arabic: "اللَّهُمَّ اغْفِرْ لِي (ثلاثًا)",
        translation: "O Allah, forgive me (three times).",
        source: "Sunan at-Tirmidhi",
      },
    ],
  },
  {
    id: "sleep-waking",
    label: "Sleep & waking",
    blurb: "Entering sleep and rising with His name.",
    duas: [
      {
        id: "sleep-name",
        title: "In Your name I die and live",
        arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
        translation: "In Your name, O Allah, I die and I live.",
        source: "Sahih al-Bukhari",
      },
      {
        id: "sleep-position",
        title: "Before sleeping",
        arabic:
          "اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ",
        translation:
          "O Allah, I submit myself to You, entrust my affair to You, turn my face to You, and lean my back to You, in hope of You and in fear of You. There is no refuge from You except with You. I believe in Your Book that You revealed and in Your Prophet that You sent.",
        source: "Sahih al-Bukhari & Sahih Muslim",
      },
      {
        id: "waking",
        title: "On waking",
        arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
        translation:
          "Praise is to Allah who gave us life after causing us to die, and to Him is the resurrection.",
        source: "Sahih al-Bukhari",
      },
      {
        id: "waking-thanks",
        title: "Thanking for the body and faith",
        arabic:
          "الْحَمْدُ لِلَّهِ الَّذِي عَافَانِي فِي جَسَدِي، وَرَدَّ عَلَيَّ رُوحِي، وَأَذِنَ لِي بِذِكْرِهِ",
        translation:
          "Praise is to Allah who restored my health to me, returned my soul to me, and permitted me to remember Him.",
        source: "Jami' at-Tirmidhi",
      },
    ],
  },
  {
    id: "travel-home",
    label: "Travel & home",
    blurb: "Leaving, arriving, and the masjid.",
    duas: [
      {
        id: "travel-opening",
        title: "For every journey",
        arabic:
          "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ",
        translation:
          "Glory to Him who has subjected this to us, and we could never have accomplished it ourselves; and indeed, to our Lord we will surely return.",
        source: "Qur'an 43:13–14",
      },
      {
        id: "travel-dua",
        title: "Supplication for travel",
        arabic:
          "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ",
        translation:
          "O Allah, on this journey of ours we ask You for righteousness and piety, and deeds that please You. O Allah, make this journey easy for us and fold up its distance for us. O Allah, You are the Companion on the journey and the Guardian of the family.",
        source: "Sahih Muslim",
      },
      {
        id: "leave-home",
        title: "Leaving the home",
        arabic: "بِاسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
        translation:
          "In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah.",
        source: "Sunan Abi Dawud & Jami' at-Tirmidhi",
      },
      {
        id: "enter-home",
        title: "Entering the home",
        arabic: "بِاسْمِ اللَّهِ وَلَجْنَا، وَبِاسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا",
        translation:
          "In the name of Allah we enter, in the name of Allah we leave, and upon our Lord we rely.",
        source: "Sunan Abi Dawud",
      },
      {
        id: "enter-masjid",
        title: "Entering the masjid",
        arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
        translation: "O Allah, open for me the gates of Your mercy.",
        source: "Sahih Muslim",
      },
    ],
  },
  {
    id: "distress",
    label: "Distress & istikhārah",
    blurb: "For worry, hardship, and decisions.",
    duas: [
      {
        id: "yunus",
        title: "The supplication of Yunus",
        arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
        translation:
          "There is no deity worthy of worship except You; glory be to You. Indeed, I have been among the wrongdoers.",
        source: "Qur'an 21:87",
      },
      {
        id: "hasbiyah",
        title: "Allah is sufficient for me",
        arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
        translation:
          "Allah is sufficient for me; there is no deity worthy of worship except Him. In Him I place my trust, and He is the Lord of the Mighty Throne.",
        source: "Qur'an 9:129",
      },
      {
        id: "mercy-not-self",
        title: "For anxiety",
        arabic:
          "اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ، وَأَصْلِحْ لِي شَأْنِي كُلَّهُ، لَا إِلَهَ إِلَّا أَنْتَ",
        translation:
          "O Allah, I hope for Your mercy, so do not abandon me to myself even for an instant, and fix all my affairs. There is no deity worthy of worship except You.",
        source: "Sunan Abi Dawud & Jami' at-Tirmidhi",
      },
      {
        id: "istikhara",
        title: "Istikhārah (seeking the best choice)",
        arabic:
          "اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ، اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاقْدُرْهُ لِي وَيَسِّرْهُ لِي ثُمَّ بَارِكْ لِي فِيهِ، وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ وَاقْدُرْ لِي الْخَيْرَ حَيْثُ كَانَ ثُمَّ أَرْضِنِي بِهِ",
        translation:
          "O Allah, I seek Your guidance through Your knowledge, I ask You for Your power, and I ask You from Your immense favour. For You can power and I cannot, You know and I do not, and You are the Knower of the unseen. O Allah, if You know this matter to be good for my religion, my livelihood and the outcome of my affair, ordain it for me, make it easy for me, then bless me in it. And if You know it to be bad for me, turn it away from me and turn me from it, and ordain the good for me wherever it may be, then make me pleased with it.",
        source: "Sahih al-Bukhari",
      },
      {
        id: "yaqub",
        title: "The distress of Ya'qub",
        arabic: "إِنَّمَا أَشْكُو بَعْثِي وَحُزْنِي إِلَى اللَّهِ",
        translation: "I only complain of my grief and my sorrow to Allah.",
        source: "Qur'an 12:86",
      },
    ],
  },
  {
    id: "quranic",
    label: "Qur'anic duʿāʾ",
    blurb: "Supplications revealed in the Qur'an itself.",
    duas: [
      {
        id: "easy-affair",
        title: "Open my breast",
        arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي",
        translation:
          "My Lord, expand for me my breast and ease for me my task, and untie the knot from my tongue that they may understand my speech.",
        source: "Qur'an 20:25–28",
      },
      {
        id: "rahmah",
        title: "From Your mercy",
        arabic: "رَبَّنَا آتِنَا مِنْ لُدُنْكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا",
        translation:
          "Our Lord, grant us from Yourself mercy and prepare for us from our affair right guidance.",
        source: "Qur'an 18:10",
      },
      {
        id: "no-misguide",
        title: "Do not let our hearts deviate",
        arabic: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لُدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ",
        translation:
          "Our Lord, let not our hearts deviate after You have guided us, and grant us from Yourself mercy. Indeed, You are the Bestower.",
        source: "Qur'an 3:8",
      },
      {
        id: "parents",
        title: "For one's parents",
        arabic: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
        translation: "My Lord, have mercy upon them as they brought me up when I was small.",
        source: "Qur'an 17:24",
      },
      {
        id: "brothers-before",
        title: "For those who came before us",
        arabic:
          "رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالْإِيمَانِ وَلَا تَجْعَلْ فِي قُلُوبِنَا غِلًّا لِلَّذِينَ آمَنُوا رَبَّنَا إِنَّكَ رَءُوفٌ رَحِيمٌ",
        translation:
          "Our Lord, forgive us and our brothers who preceded us in faith, and do not place in our hearts any rancour toward those who believe. Our Lord, indeed You are Kind and Merciful.",
        source: "Qur'an 59:10",
      },
    ],
  },
  {
    id: "fasting",
    label: "Ramadan & fasting",
    blurb: "Breaking the fast and taking suḥūr.",
    duas: [
      {
        id: "iftar",
        title: "Breaking the fast",
        arabic: "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوبُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ",
        translation:
          "The thirst has gone, the veins are moistened, and the reward is assured, if Allah wills.",
        source: "Sunan Abi Dawud",
      },
      {
        id: "suhoor",
        title: "At suḥūr",
        arabic: "اللَّهُمَّ إِنِّي لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ",
        translation: "O Allah, I fasted for You and with Your provision I break my fast.",
        source: "Sunan Abi Dawud",
      },
    ],
  },
];
