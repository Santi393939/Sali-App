/**
 * Starter reminder cards for the vertical feed.
 *
 * IMPORTANT: every Arabic text, translation and source reference here is a
 * draft. Per the brief, all of them must be checked by a qualified person
 * before launch; `verifiedBy` stays null until then. In the Supabase step,
 * these move to the `reminders` table and only verified, published rows are
 * shown.
 *
 * The first four plus the video slot are the brief's starter set; the rest
 * were added so the feed has enough cards to test scrolling.
 */

export type ReminderKind = 'quran' | 'hadith' | 'video';

export type Reminder = {
  id: string;
  kind: ReminderKind;
  arabic: string;
  english: string;
  sourceRef: string;
  /** Hosted video (Mux / Cloudflare Stream) — added in a later step. */
  videoUrl?: string;
  /** Who checked the text and translation. Null = not yet verified. */
  verifiedBy: string | null;
  /** Sample like count shown until real counts come from the server. */
  baseLikes: number;
};

export const REMINDERS: Reminder[] = [
  // ---- the brief's starter cards ----
  {
    id: 'quran-33-56',
    kind: 'quran',
    arabic:
      'إِنَّ ٱللَّهَ وَمَلَٰٓئِكَتَهُۥ يُصَلُّونَ عَلَى ٱلنَّبِيِّ ۚ يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ صَلُّوا۟ عَلَيْهِ وَسَلِّمُوا۟ تَسْلِيمًا',
    english:
      'Indeed, Allah and His angels send blessings upon the Prophet. O you who have believed, send blessings upon him and greet him with peace.',
    sourceRef: 'Sūrat al-Aḥzāb 33:56',
    verifiedBy: null,
    baseLikes: 412,
  },
  {
    id: 'muslim-408',
    kind: 'hadith',
    arabic: 'مَنْ صَلَّى عَلَيَّ وَاحِدَةً صَلَّى اللَّهُ عَلَيْهِ عَشْرًا',
    english: 'Whoever sends blessings upon me once, Allah sends blessings upon him ten times.',
    sourceRef: 'Ṣaḥīḥ Muslim 408',
    verifiedBy: null,
    baseLikes: 368,
  },
  {
    id: 'abudawud-1047',
    kind: 'hadith',
    arabic:
      'إِنَّ مِنْ أَفْضَلِ أَيَّامِكُمْ يَوْمَ الْجُمُعَةِ ... فَأَكْثِرُوا عَلَيَّ مِنَ الصَّلَاةِ فِيهِ، فَإِنَّ صَلَاتَكُمْ مَعْرُوضَةٌ عَلَيَّ',
    english:
      'Among the best of your days is Friday … so send abundant blessings upon me on it, for your blessings are presented to me.',
    sourceRef: 'Sunan Abī Dāwūd 1047',
    verifiedBy: null,
    baseLikes: 291,
  },
  {
    id: 'tirmidhi-484',
    kind: 'hadith',
    arabic: 'أَوْلَى النَّاسِ بِي يَوْمَ الْقِيَامَةِ أَكْثَرُهُمْ عَلَيَّ صَلَاةً',
    english: 'The closest of people to me on the Day of Resurrection are those who sent the most blessings upon me.',
    sourceRef: 'Jāmiʿ at-Tirmidhī 484',
    verifiedBy: null,
    baseLikes: 337,
  },
  {
    id: 'video-1',
    kind: 'video',
    arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    english: 'A short video reminder will play here once videos are hosted.',
    sourceRef: 'Video slot',
    verifiedBy: null,
    baseLikes: 0,
  },

  // ---- extra cards for testing the feed ----
  {
    id: 'quran-21-107',
    kind: 'quran',
    arabic: 'وَمَآ أَرْسَلْنَٰكَ إِلَّا رَحْمَةً لِّلْعَٰلَمِينَ',
    english: 'And We have not sent you except as a mercy to the worlds.',
    sourceRef: 'Sūrat al-Anbiyāʾ 21:107',
    verifiedBy: null,
    baseLikes: 520,
  },
  {
    id: 'nasai-1297',
    kind: 'hadith',
    arabic:
      'مَنْ صَلَّى عَلَيَّ صَلَاةً وَاحِدَةً صَلَّى اللَّهُ عَلَيْهِ عَشْرَ صَلَوَاتٍ، وَحُطَّتْ عَنْهُ عَشْرُ خَطِيئَاتٍ، وَرُفِعَتْ لَهُ عَشْرُ دَرَجَاتٍ',
    english:
      'Whoever sends one blessing upon me, Allah sends ten blessings upon him, ten sins are removed from him, and he is raised ten degrees.',
    sourceRef: 'Sunan an-Nasāʾī 1297',
    verifiedBy: null,
    baseLikes: 284,
  },
  {
    id: 'quran-68-4',
    kind: 'quran',
    arabic: 'وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ',
    english: 'And indeed, you are of a great moral character.',
    sourceRef: 'Sūrat al-Qalam 68:4',
    verifiedBy: null,
    baseLikes: 449,
  },
  {
    id: 'abudawud-2042',
    kind: 'hadith',
    arabic: 'وَصَلُّوا عَلَيَّ، فَإِنَّ صَلَاتَكُمْ تَبْلُغُنِي حَيْثُ كُنْتُمْ',
    english: 'And send blessings upon me, for your blessings reach me wherever you are.',
    sourceRef: 'Sunan Abī Dāwūd 2042',
    verifiedBy: null,
    baseLikes: 256,
  },
  {
    id: 'quran-33-21',
    kind: 'quran',
    arabic: 'لَّقَدْ كَانَ لَكُمْ فِى رَسُولِ ٱللَّهِ أُسْوَةٌ حَسَنَةٌ',
    english: 'There has certainly been for you in the Messenger of Allah an excellent example.',
    sourceRef: 'Sūrat al-Aḥzāb 33:21',
    verifiedBy: null,
    baseLikes: 388,
  },
  {
    id: 'bukhari-3370',
    kind: 'hadith',
    arabic:
      'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
    english:
      'O Allah, send blessings upon Muhammad and upon the family of Muhammad, as You sent blessings upon Ibrāhīm and upon the family of Ibrāhīm. Truly, You are Praiseworthy, Glorious.',
    sourceRef: 'Ṣaḥīḥ al-Bukhārī 3370',
    verifiedBy: null,
    baseLikes: 473,
  },
  {
    id: 'quran-9-128',
    kind: 'quran',
    arabic:
      'لَقَدْ جَآءَكُمْ رَسُولٌ مِّنْ أَنفُسِكُمْ عَزِيزٌ عَلَيْهِ مَا عَنِتُّمْ حَرِيصٌ عَلَيْكُم بِٱلْمُؤْمِنِينَ رَءُوفٌ رَّحِيمٌ',
    english:
      'There has certainly come to you a Messenger from among yourselves. Grievous to him is what you suffer; he is anxious over you, and to the believers he is kind and merciful.',
    sourceRef: 'Sūrat at-Tawbah 9:128',
    verifiedBy: null,
    baseLikes: 301,
  },
  {
    id: 'tirmidhi-2457',
    kind: 'hadith',
    arabic: 'إِذًا تُكْفَى هَمَّكَ، وَيُغْفَرُ لَكَ ذَنْبُكَ',
    english:
      'When a Companion said he would devote all his prayer to sending blessings on him, he ﷺ replied: “Then your worries will be taken care of, and your sins will be forgiven.”',
    sourceRef: 'Jāmiʿ at-Tirmidhī 2457',
    verifiedBy: null,
    baseLikes: 342,
  },
  {
    id: 'quran-3-31',
    kind: 'quran',
    arabic: 'قُلْ إِن كُنتُمْ تُحِبُّونَ ٱللَّهَ فَٱتَّبِعُونِى يُحْبِبْكُمُ ٱللَّهُ وَيَغْفِرْ لَكُمْ ذُنُوبَكُمْ',
    english: 'Say: If you love Allah, then follow me; Allah will love you and forgive you your sins.',
    sourceRef: 'Sūrat Āl ʿImrān 3:31',
    verifiedBy: null,
    baseLikes: 266,
  },
];

export const KIND_LABEL: Record<ReminderKind, string> = {
  quran: "Qur'an",
  hadith: 'Hadith',
  video: 'Video',
};
