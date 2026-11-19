import { LanguageMode, MasteringParams, MasteringPreset, TrackAnalysis } from '../types/studio';

export const DEFAULT_TRACK_URL = '/assets/aistudio/______________2__Remix___1__28472cd6.mp3';
export const DEFAULT_TRACK_FILENAME = 'රතු හැට්ටකාරි (Remix).mp3';

export const FLAT_PARAMS: MasteringParams = {
  highPassHz: 20,
  lowGainDb: 0,
  mudFreqHz: 250,
  mudCutDb: 0,
  presenceFreqHz: 3200,
  presenceGainDb: 0,
  deEssDb: 0,
  airGainDb: 0,
  compThresholdDb: -6,
  compRatio: 1.5,
  stereoWidth: 1.0,
  makeupGainDb: 0,
};

export const RECOMMENDED_REMIX_PARAMS: MasteringParams = {
  highPassHz: 34,
  lowGainDb: -1.0,
  mudFreqHz: 250,
  mudCutDb: -2.6,
  presenceFreqHz: 3200,
  presenceGainDb: 2.8,
  deEssDb: -2.4,
  airGainDb: 1.8,
  compThresholdDb: -15,
  compRatio: 2.8,
  stereoWidth: 1.08,
  makeupGainDb: 1.5,
};

export const MASTERING_PRESETS: MasteringPreset[] = [
  {
    id: 'recommended-fix',
    nameSi: 'රතු හැට්ටකාරි — නිර්දේශිත Fix',
    nameEn: 'Rathu Hattakari — Recommended Fix',
    descriptionSi: '250Hz 808 mud එක අඩු කර, කාන්තා හඬ (3.2kHz) ඉදිරියට ගෙන, තියුණු Hi-hats මෘදු කරයි.',
    descriptionEn: 'Cuts 250Hz 808 mud, lifts female vocal presence at 3.2kHz, softens 6.8kHz hi-hats, and evens intro-to-drop dynamics.',
    params: RECOMMENDED_REMIX_PARAMS,
  },
  {
    id: 'trap-punch',
    nameSi: 'Trap & Rap Punch',
    nameEn: 'Trap & Rap Punch',
    descriptionSi: 'Kick සහ 808 පැහැදිලි බව වැඩි කර රැප් වචන තියුණු ලෙස මතු කරයි.',
    descriptionEn: 'Tight sub control with crisp rap midrange punch and controlled transient limiting.',
    params: {
      highPassHz: 32,
      lowGainDb: 1.2,
      mudFreqHz: 260,
      mudCutDb: -3.0,
      presenceFreqHz: 3000,
      presenceGainDb: 2.2,
      deEssDb: -1.8,
      airGainDb: 2.0,
      compThresholdDb: -16,
      compRatio: 3.2,
      stereoWidth: 1.12,
      makeupGainDb: 1.8,
    },
  },
  {
    id: 'vocal-clarity',
    nameSi: 'Vocal Clarity Focus',
    nameEn: 'Vocal Clarity Focus',
    descriptionSi: 'පසුබිම් සංගීතයට යට වන ගායන හඬ පැහැදිලිව ඉස්මතු කරයි.',
    descriptionEn: 'Carves low-mid room buildup and boosts vocal articulation & air for lyric-first clarity.',
    params: {
      highPassHz: 42,
      lowGainDb: -1.5,
      mudFreqHz: 290,
      mudCutDb: -3.2,
      presenceFreqHz: 3500,
      presenceGainDb: 3.6,
      deEssDb: -2.8,
      airGainDb: 2.4,
      compThresholdDb: -14,
      compRatio: 2.5,
      stereoWidth: 0.96,
      makeupGainDb: 1.6,
    },
  },
  {
    id: 'warm-radio',
    nameSi: 'Warm Radio Master',
    nameEn: 'Warm Radio Master',
    descriptionSi: 'YouTube, Spotify සහ Car Audio සඳහා සමබර සහ මෘදු ශබ්ද මට්ටමක් ලබා දෙයි.',
    descriptionEn: 'Balanced loudness, gentle top-end sheen, and smooth bus glue for streaming & car speakers.',
    params: {
      highPassHz: 30,
      lowGainDb: 0.5,
      mudFreqHz: 230,
      mudCutDb: -1.8,
      presenceFreqHz: 2800,
      presenceGainDb: 1.6,
      deEssDb: -2.0,
      airGainDb: 1.2,
      compThresholdDb: -17,
      compRatio: 3.0,
      stereoWidth: 1.05,
      makeupGainDb: 2.0,
    },
  },
  {
    id: 'flat-bypass',
    nameSi: 'Flat (මුල් තත්ත්වය)',
    nameEn: 'Flat (Zero Processing)',
    descriptionSi: 'සියලුම EQ සහ Compressor වෙනස්කම් ශුන්‍ය කරයි.',
    descriptionEn: 'Resets all EQ, dynamics, and stereo controls back to neutral unity.',
    params: FLAT_PARAMS,
  },
];

export function getInitialAnalysis(lang: LanguageMode): TrackAnalysis {
  if (lang === 'en') {
    return {
      title: 'රතු හැට්ටකාරි (Remix)',
      genre: 'Sinhala Melodic Trap / Storytelling Hip-Hop',
      bpmEstimate: 94,
      keyEstimate: 'C Minor',
      summary:
        'Strong narrative concept (Red Riding Hood dark metaphor) with solid male rap cadence. Main mix issues are heavy 808 mud around 240–280Hz, a recessed female vocal in the intro/bridge behind reverb pads, sharp hi-hat sibilance at ~6.8kHz, and a noticeable loudness jump from the 0:00 intro into the 0:21 beat drop.',
      sections: [
        { label: 'Intro', startSec: 0, endSec: 8 },
        { label: 'Female Verse 1', startSec: 8, endSec: 21 },
        { label: 'Beat Drop', startSec: 21, endSec: 35 },
        { label: 'Male Rap 1', startSec: 35, endSec: 63 },
        { label: 'Pre-Chorus', startSec: 63, endSec: 76 },
        { label: 'Chorus', startSec: 76, endSec: 92 },
        { label: 'Male Rap 2', startSec: 92, endSec: 120 },
        { label: 'Rap Bridge', startSec: 120, endSec: 134 },
        { label: 'Female Bridge', startSec: 134, endSec: 155 },
        { label: 'Final Chorus', startSec: 155, endSec: 170 },
        { label: 'Outro', startSec: 170, endSec: 191 },
      ],
      audioIssues: [
        {
          timestampSec: 8,
          timestampLabel: '0:08',
          category: 'Vocals',
          severity: 'high',
          title: 'Female vocal sits behind pad & reverb',
          detail:
            'In the opening verse (0:08–0:20), the female voice lacks upper-mid presence (2.5–4kHz), making lyrics slightly soft against the warm synth pad.',
          fixAction: 'Boost 3.2kHz (+2.8 dB) & Air 11kHz (+1.8 dB)',
          patch: { presenceFreqHz: 3200, presenceGainDb: 2.8, airGainDb: 1.8 },
        },
        {
          timestampSec: 21,
          timestampLabel: '0:21',
          category: 'Dynamics',
          severity: 'high',
          title: 'Abrupt volume jump at the Beat Drop',
          detail:
            'The quiet piano intro jumps sharply in perceived loudness when the 808 and trap percussion enter at 0:21.',
          fixAction: 'Apply gentle bus compression (-15 dB thresh, 2.8:1)',
          patch: { compThresholdDb: -15, compRatio: 2.8, makeupGainDb: 1.5 },
        },
        {
          timestampSec: 35,
          timestampLabel: '0:35',
          category: 'EQ',
          severity: 'medium',
          title: 'Low-mid 808 mud masking male rap clarity',
          detail:
            'Heavy sub/808 harmonics around 220–280Hz collide with the lower chest resonance of the male rap vocal.',
          fixAction: 'Tighten sub @ 34Hz & cut 250Hz (-2.6 dB)',
          patch: { highPassHz: 34, mudFreqHz: 250, mudCutDb: -2.6, lowGainDb: -1.0 },
        },
        {
          timestampSec: 76,
          timestampLabel: '1:16',
          category: 'Mix',
          severity: 'medium',
          title: 'Sharp hi-hat & "s/sh" sibilance in Chorus',
          detail:
            'Trap hi-hats and Sinhala "ස/ශ" consonants build up around 6.5–7.5kHz at higher playback volumes.',
          fixAction: 'Attenuate sibilance band (-2.4 dB @ 6.8kHz)',
          patch: { deEssDb: -2.4 },
        },
        {
          timestampSec: 134,
          timestampLabel: '2:14',
          category: 'Stereo',
          severity: 'low',
          title: 'Bridge vocal needs subtle width & lift',
          detail:
            'At the emotional bridge ("අම්මේ මට සමාව දෙන්න"), tightening low-mids and adding gentle stereo air creates stronger emotional contrast.',
          fixAction: 'Set Stereo Width 1.08x + Presence lift',
          patch: { stereoWidth: 1.08, presenceGainDb: 2.8 },
        },
      ],
      lyricIssues: [
        {
          timestampSec: 13,
          timestampLabel: '0:13',
          originalLine: 'මා පස්සෙන් එනවා (වක්කන්)',
          issue: 'Low-pitched ad-lib ("වක්කන්") sounds detached and muddies the end of the line.',
          improvedLine: 'මා පස්සෙන් එනවා — (soft echo "එනවා..." instead of pitched ad-lib)',
        },
        {
          timestampSec: 18,
          timestampLabel: '0:18',
          originalLine: 'දැන් මටම පේනවා මගේ වැරැද්දේ පිහිටි / හැටි',
          issue: 'Final word articulation gets clipped/ambiguous ("පිහිටි" vs "හැටි") right before the drop.',
          improvedLine: 'දැන් මටම පේනවා මා කළ වැරැද්දේ හැටි',
        },
        {
          timestampSec: 40,
          timestampLabel: '0:40',
          originalLine: 'කිව්වත් ගියේ මම මගේ නෑහෙන්',
          issue: 'Phrasing rushes slightly ("මගේ නෑහෙන්") — unnatural Sinhala idiom compared to "නොඅසා / හිතුවක්කාරෙන්".',
          improvedLine: 'කිව්වත් ගියේ මම කාටත් නොඅසා හිතින් (rhymes cleanly with ආසාවෙන් / මගෙන්)',
        },
        {
          timestampSec: 85,
          timestampLabel: '1:25',
          originalLine: 'හිනා වීගෙන ළං වුණේ වෙස් මූණක් බැඳපු මාරන්',
          issue: 'Syllable crowding after the "Look at what you did now" drop causes the final word to rush.',
          improvedLine: 'හිනැහී ළං වූයේ වෙස් මූණක් බැඳගෙනයි',
        },
      ],
      recommendedEq: RECOMMENDED_REMIX_PARAMS,
    };
  }

  return {
    title: 'රතු හැට්ටකාරි (Remix)',
    genre: 'සිංහල Melodic Trap / Storytelling Hip-Hop',
    bpmEstimate: 94,
    keyEstimate: 'C Minor',
    summary:
      'ගීතයේ කතා තේමාව (රතු හැට්ටකාරි / වෘකයා) සහ Male Rap rhythm එක ඉතා හොඳයි. නමුත් Audio Mix එකේ ප්‍රධාන අඩුපාඩු 4ක් තියෙනවා: (1) 250Hz අවට 808 Bass මඩ ගතිය නිසා වචන පැහැදිලි බව අඩු වීම, (2) Intro සහ Bridge එකේ කාන්තා හඬ Reverb එකට යට වීම, (3) 0:21 Beat Drop එකේදී එකපාරටම ශබ්දය වැඩි වීම, (4) Chorus එකේ Hi-hats සහ "ස/ශ" අකුරු තියුණු වැඩි වීම.',
    sections: [
      { label: 'Intro', startSec: 0, endSec: 8 },
      { label: 'කාන්තා පද 1', startSec: 8, endSec: 21 },
      { label: 'Beat Drop', startSec: 21, endSec: 35 },
      { label: 'Rap කොටස 1', startSec: 35, endSec: 63 },
      { label: 'Pre-Chorus', startSec: 63, endSec: 76 },
      { label: 'Chorus', startSec: 76, endSec: 92 },
      { label: 'Rap කොටස 2', startSec: 92, endSec: 120 },
      { label: 'Rap Bridge', startSec: 120, endSec: 134 },
      { label: 'කාන්තා Bridge', startSec: 134, endSec: 155 },
      { label: 'අවසන් Chorus', startSec: 155, endSec: 170 },
      { label: 'Outro', startSec: 170, endSec: 191 },
    ],
    audioIssues: [
      {
        timestampSec: 8,
        timestampLabel: '0:08',
        category: 'Vocals',
        severity: 'high',
        title: 'කාන්තා හඬ පසුබිම් සංගීතයට යට වී ඇත',
        detail:
          '0:08–0:20 කොටසේදී කාන්තා හඬට 2.5–4kHz Clarity අඩු නිසා Synth pad සහ Reverb අතර හඬ මෘදු වැඩි වී පැහැදිලි බව අඩු වෙයි.',
        fixAction: '3.2kHz (+2.8 dB) & Air 11kHz (+1.8 dB) වැඩි කරන්න',
        patch: { presenceFreqHz: 3200, presenceGainDb: 2.8, airGainDb: 1.8 },
      },
      {
        timestampSec: 21,
        timestampLabel: '0:21',
        category: 'Dynamics',
        severity: 'high',
        title: 'Beat Drop එකේදී Volume වෙනස ඉතා වැඩියි',
        detail:
          'මුල් Piano Intro එකට සාපේක්ෂව 0:21 දී 808 සහ Drums ඇතුළු වන විට ශබ්ද මට්ටම එකවර ඉහළ යයි.',
        fixAction: 'Bus Compressor (-15 dB, 2.8:1) සක්‍රීය කරන්න',
        patch: { compThresholdDb: -15, compRatio: 2.8, makeupGainDb: 1.5 },
      },
      {
        timestampSec: 35,
        timestampLabel: '0:35',
        category: 'EQ',
        severity: 'medium',
        title: '250Hz 808 Mud ගතිය නිසා Rap හඬ බොඳ වේ',
        detail:
          '0:35 සිට Rap කොටසේදී 808 Bass එකේ 220–280Hz සංඛ්‍යාතය පිරිමි හඬේ පහළ නාදය සමඟ ගැටේ.',
        fixAction: 'Sub-Tight 34Hz & 250Hz (-2.6 dB) අඩු කරන්න',
        patch: { highPassHz: 34, mudFreqHz: 250, mudCutDb: -2.6, lowGainDb: -1.0 },
      },
      {
        timestampSec: 76,
        timestampLabel: '1:16',
        category: 'Mix',
        severity: 'medium',
        title: 'Chorus එකේ Hi-hat සහ "ස/ශ" ශබ්ද තියුණුයි',
        detail:
          'වැඩි ශබ්දයකින් අසන විට 6.5–7.5kHz අවට Hi-hats සහ කටහඬේ "ස/පස්සේ" ශබ්ද කනට රිදෙන සුළු තියුණු ගතියක් දැනේ.',
        fixAction: 'De-Ess 6.8kHz (-2.4 dB) අඩු කරන්න',
        patch: { deEssDb: -2.4 },
      },
      {
        timestampSec: 134,
        timestampLabel: '2:14',
        category: 'Stereo',
        severity: 'low',
        title: 'Bridge කොටසේ හැඟීම්බර බව සහ Stereo පළල',
        detail:
          '"අම්මේ මට සමාව දෙන්න" කොටසේ හඬ මැදින් පැහැදිලිව තබා පසුබිම මඳක් පුළුල් කළ විට ගීතයේ අවසන් කොටස වඩාත් ආකර්ෂණීය වේ.',
        fixAction: 'Stereo Width 1.08x + Vocal Lift යොදන්න',
        patch: { stereoWidth: 1.08, presenceGainDb: 2.8 },
      },
    ],
    lyricIssues: [
      {
        timestampSec: 13,
        timestampLabel: '0:13',
        originalLine: 'මා පස්සෙන් එනවා (වක්කන්)',
        issue: 'පසුබිමෙන් එන ගැඹුරු Ad-lib ("වක්කන්") වචනය පැහැදිලි නැති අතර තේරුමට බාධා කරයි.',
        improvedLine: 'මා පස්සෙන් එනවා — (මෘදු Echo "එනවා..." ලෙස තබන්න)',
      },
      {
        timestampSec: 18,
        timestampLabel: '0:18',
        originalLine: 'දැන් මටම පේනවා මගේ වැරැද්දේ පිහිටි / හැටි',
        issue: 'පේළිය අවසානයේ වචනය ("පිහිටි/හැටි") උච්චාරණය අපැහැදිලිව කැපී යයි.',
        improvedLine: 'දැන් මටම පේනවා මා කළ වැරැද්දේ හැටි',
      },
      {
        timestampSec: 40,
        timestampLabel: '0:40',
        originalLine: 'කිව්වත් ගියේ මම මගේ නෑහෙන්',
        issue: '"මගේ නෑහෙන්" යෙදුම සිංහල ව්‍යවහාරයට අස්වාභාවික වන අතර රිද්මය මඳක් තද වේ.',
        improvedLine: 'කිව්වත් ගියේ මම කාටත් නොඅසා හිතින් (ආසාවෙන්/මගෙන් එළිසමයට ගැළපේ)',
      },
      {
        timestampSec: 85,
        timestampLabel: '1:25',
        originalLine: 'හිනා වීගෙන ළං වුණේ වෙස් මූණක් බැඳපු මාරන්',
        issue: '"Look at what you did now" කොටසෙන් පසු අක්ෂර ගණන වැඩි නිසා අවසන් වචනය ඉක්මන් වැඩි වේ.',
        improvedLine: 'හිනැහී ළං වූයේ වෙස් මූණක් බැඳගෙනයි',
      },
    ],
    recommendedEq: RECOMMENDED_REMIX_PARAMS,
  };
}

export const INITIAL_LYRICS_TEXT = `[0:00 - Intro]
හ්ම්ම්... හ්ම්ම්...

[0:08 - Female Verse 1]
රතු පාට සළුවක්...
සෙවණැල්ලක් වගේ මා පස්සෙන් එනවා...
අම්මා කිව්ව දේ අහන්න බැරි වුණු හැටි
දැන් මටම පේනවා මගේ වැරැද්දේ හැටි

[0:35 - Male Rap Verse 1]
කූඩයක් අරන් ආවේ හිතේ ලොකු ආසාවෙන්
කැලේ මැදින් යන්න එපා කිව්වත් ගියේ මම මගේ නෑහෙන්
පුංචි වයසේ හිතට හැමදේම අලුත් පාඩම්
නොදන්නා ලෝකේ ඇතුළේ හොයන්න ගියේ මං බාඩම්
කැලේ මැදින් යනකොට ලස්සන මල් පිපිලා
පොඩ්ඩක් බලලා යමු කියලා හිත ගියා ඇදිලා
වෙලාව ගියා දැනුනේ නෑ හිරුත් බැහැලා ගිහින්
පාර පේන්නේ නෑ දැන් අඳුර වැටිලා හොඳින්

[1:03 - Pre-Chorus]
කවුද මේ කතා කරන්නේ
හිතේ තියෙන බය නැති කරන්නේ
මම ඉන්නවා බය වෙන්න එපා කියලා
ඇයි මං මෙච්චර ඉක්මනට රැවටෙන්නේ

[1:16 - Chorus]
රතු හැට්ටේ පාට මැකිලා අඳුරු කැලේ මැද්දේ
කුතුහලේ පස්සේ ගිහින් මං වැටුනේ කොතැන්දේ
(Look at what you did now)
හිනා වීගෙන ළං වුණේ වෙස් මූණක් බැඳපු මාරන්
අහිංසකකම නැති වුණා ඉතුරු වුණේ පසුතැවිලි පමණක්

[1:32 - Male Rap Verse 2]
වෘකයා කවදාවත් කියන්නේ නෑ මං වෘකයෙක් කියලා
ඌ එන්නේ යාළුවෙක් වගේ හොඳ හිත පෙන්වලා
මේ පාර කෙටියි ඉක්මනට යන්න පුළුවන් කියලා
අරන් ගියේ අගාධයකට ජීවිතේම නැති කරලා
දොර ඇරගෙන ඇතුළට ගියාම ඇත්ත එළියට ආවා
ආච්චි නෙවෙයි එතන හිටියේ මුළු ලෝකෙම කැරකුණා
ඇයි ඔයාගේ අත් ඔච්චර ලොකු කියලා අහන්නත් කලින්
හැමදේම ඉවරයි වගේ හුස්මත් හිර වුණා හිතින්

[2:00 - Rap Bridge]
නව යොවුන් හීන වලට කුතුහලේ කියන්නේ විසක්
පාලනයක් නැති වුණොත් ඒකමයි අපේ විනාසයක්
අද සිනාසෙන මුහුණු හෙට අඬවන්න පුළුවන්
කතාව වෙනස් කරන්න බෑ පිටු ඉරිලා ගිහින්

[2:14 - Female Bridge]
අම්මේ මට සමාව දෙන්න...
ඔයාගේ ආදරේ තේරුම් ගන්න බැරි වුණා මා...
දැන් මං තනි වෙලා මේ අඳුරු කැලේ මැද්දේ
කවුරුත් නෑ මාව බේරගන්න මගෙම වරද හින්දා`;
