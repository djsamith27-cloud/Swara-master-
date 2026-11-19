import {
  AudioFileStats,
  AudioIssue,
  LanguageMode,
  LyricPolishResult,
  MasteringParams,
  OnlineCheckResult,
  TrackAnalysis,
} from '../types/studio';
import { getInitialAnalysis, RECOMMENDED_REMIX_PARAMS } from '../data/defaultTrackData';

// Fast 2nd-order biquad filter coefficient & RMS energy helper for real PCM frequency analysis
function measureBandRmsDb(
  samples: Float32Array,
  sampleRate: number,
  type: 'lowpass' | 'bandpass' | 'highpass',
  freq: number,
  q = 1.0
): number {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha;

  if (type === 'lowpass') {
    b0 = (1 - cosW0) / 2;
    b1 = 1 - cosW0;
    b2 = (1 - cosW0) / 2;
  } else if (type === 'highpass') {
    b0 = (1 + cosW0) / 2;
    b1 = -(1 + cosW0);
    b2 = (1 + cosW0) / 2;
  } else {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  }

  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  let sumSq = 0;

  // Analyze up to 60 seconds evenly sampled or full track at stride 1 on mono mix
  const maxSamples = Math.min(samples.length, sampleRate * 90);
  const offset = Math.max(0, Math.floor((samples.length - maxSamples) / 2));

  for (let i = 0; i < maxSamples; i++) {
    const x0 = samples[offset + i];
    const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    sumSq += y0 * y0;
  }

  const rms = Math.sqrt(sumSq / Math.max(1, maxSamples));
  return rms > 1e-6 ? 20 * Math.log10(rms) : -96;
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function analyzeAudioInBrowser(
  buffer: AudioBuffer,
  fileName: string,
  stats: AudioFileStats,
  lang: LanguageMode,
  isDefaultTrack: boolean
): TrackAnalysis {
  if (isDefaultTrack) {
    return getInitialAnalysis(lang);
  }

  const ch0 = buffer.getChannelData(0);
  const sr = buffer.sampleRate;

  const subDb = measureBandRmsDb(ch0, sr, 'lowpass', 85, 0.707);
  const mudDb = measureBandRmsDb(ch0, sr, 'bandpass', 250, 1.2);
  const vocalDb = measureBandRmsDb(ch0, sr, 'bandpass', 3200, 1.0);
  const harshDb = measureBandRmsDb(ch0, sr, 'bandpass', 6800, 1.5);

  // Scan 4-second windows to find loudest jump / drop timestamp
  const winLen = Math.max(1, Math.floor(sr * 4));
  const windowRms: number[] = [];
  for (let start = 0; start < ch0.length; start += winLen) {
    const end = Math.min(ch0.length, start + winLen);
    let sq = 0;
    for (let i = start; i < end; i += 4) {
      sq += ch0[i] * ch0[i];
    }
    const count = Math.max(1, Math.floor((end - start) / 4));
    const r = Math.sqrt(sq / count);
    windowRms.push(r > 1e-6 ? 20 * Math.log10(r) : -72);
  }

  let maxJumpDb = 0;
  let maxJumpSec = Math.min(20, Math.floor(buffer.duration * 0.25));
  for (let i = 1; i < windowRms.length; i++) {
    const diff = windowRms[i] - windowRms[i - 1];
    if (diff > maxJumpDb) {
      maxJumpDb = diff;
      maxJumpSec = i * 4;
    }
  }

  const issues: AudioIssue[] = [];
  const recommendedEq: MasteringParams = { ...RECOMMENDED_REMIX_PARAMS };

  const mudExcess = mudDb - vocalDb;
  if (mudExcess > 4) {
    const cut = Number(Math.max(-4.5, Math.min(-1.5, -(mudExcess - 3) * 0.45)).toFixed(1));
    recommendedEq.mudCutDb = cut;
    issues.push({
      timestampSec: Math.min(buffer.duration - 2, maxJumpSec + 8),
      timestampLabel: formatSec(Math.min(buffer.duration - 2, maxJumpSec + 8)),
      category: 'EQ',
      severity: 'high',
      title:
        lang === 'si'
          ? '250Hz අවට Low-Mid Mud ගතිය වැඩියි'
          : 'Excessive Low-Mid Mud around 250 Hz',
      detail:
        lang === 'si'
          ? `DSP මිනුම් අනුව 250Hz කලාපය (${mudDb.toFixed(1)} dB) Vocal කලාපයට (${vocalDb.toFixed(1)} dB) වඩා ඉහළින් ඇත. මෙය වචන පැහැදිලි බව අඩු කරයි.`
          : `Measured 250Hz energy (${mudDb.toFixed(1)} dB) sits ${mudExcess.toFixed(1)} dB above the 3.2kHz vocal band, masking vocal clarity.`,
      fixAction: `Cut 250Hz (${cut} dB) & High-Pass 34Hz`,
      patch: { highPassHz: 34, mudFreqHz: 250, mudCutDb: cut },
    });
  } else {
    recommendedEq.mudCutDb = -1.4;
  }

  if (vocalDb < stats.rmsDbfs - 11) {
    const lift = 2.8;
    recommendedEq.presenceGainDb = lift;
    issues.push({
      timestampSec: Math.min(buffer.duration - 2, 10),
      timestampLabel: formatSec(Math.min(buffer.duration - 2, 10)),
      category: 'Vocals',
      severity: 'high',
      title:
        lang === 'si'
          ? 'ගායන හඬ (3.2kHz) පසුබිමට මඳක් යට වී ඇත'
          : 'Recessed Vocal Presence (3.2 kHz)',
      detail:
        lang === 'si'
          ? '3.2kHz Vocal Clarity මට්ටම සමස්ත RMS මට්ටමට සාපේක්ෂව අඩු බැවින් ගායනය ඉදිරියට ගැනීමට Presence boost අවශ්‍ය වේ.'
          : 'Upper-mid vocal energy sits low relative to overall RMS, causing lyrics to sit behind instruments.',
      fixAction: 'Boost 3.2kHz (+2.8 dB) & Air 11kHz (+1.6 dB)',
      patch: { presenceFreqHz: 3200, presenceGainDb: lift, airGainDb: 1.6 },
    });
  } else {
    recommendedEq.presenceGainDb = 1.6;
  }

  if (maxJumpDb > 5.5) {
    issues.push({
      timestampSec: maxJumpSec,
      timestampLabel: formatSec(maxJumpSec),
      category: 'Dynamics',
      severity: 'medium',
      title:
        lang === 'si'
          ? `${formatSec(maxJumpSec)} අසල හදිසි ශබ්ද වැඩිවීමක් (+${maxJumpDb.toFixed(1)} dB)`
          : `Sudden loudness jump (+${maxJumpDb.toFixed(1)} dB) at ${formatSec(maxJumpSec)}`,
      detail:
        lang === 'si'
          ? 'මෘදු කොටසකින් පසුව Beats/Drums ඇතුළු වන විට ශබ්ද මට්ටම එකවර ඉහළ යයි.'
          : 'Quiet section transitions abruptly into a louder beat drop; gentle bus compression evens out playback.',
      fixAction: 'Compressor -15 dB threshold (2.8:1)',
      patch: { compThresholdDb: -15, compRatio: 2.8, makeupGainDb: 1.4 },
    });
  }

  if (harshDb > vocalDb - 3.5) {
    recommendedEq.deEssDb = -2.4;
    issues.push({
      timestampSec: Math.min(buffer.duration - 2, Math.floor(buffer.duration * 0.5)),
      timestampLabel: formatSec(Math.min(buffer.duration - 2, Math.floor(buffer.duration * 0.5))),
      category: 'Mix',
      severity: 'medium',
      title:
        lang === 'si'
          ? '6.8kHz Hi-Hat / Sibilance තියුණු ගතිය'
          : 'Bright Sibilance & Hi-Hat Energy (6.8 kHz)',
      detail:
        lang === 'si'
          ? '6–8kHz ඉහළ සංඛ්‍යාත ශක්තිය වැඩි බැවින් වැඩි ශබ්දයකින් අසන විට කනට තියුණු ගතියක් දැනිය හැක.'
          : 'Upper high-mid energy at 6.8kHz is elevated, which can sound sharp on earbuds and phone speakers.',
      fixAction: 'De-Ess 6.8kHz (-2.4 dB)',
      patch: { deEssDb: -2.4 },
    });
  }

  if (subDb > stats.rmsDbfs - 4) {
    recommendedEq.lowGainDb = -1.2;
  }

  const dur = buffer.duration;
  const sections = [
    { label: 'Intro', startSec: 0, endSec: Math.round(dur * 0.15) },
    { label: 'Part 1', startSec: Math.round(dur * 0.15), endSec: Math.round(dur * 0.45) },
    { label: 'Hook / Mid', startSec: Math.round(dur * 0.45), endSec: Math.round(dur * 0.75) },
    { label: 'Outro', startSec: Math.round(dur * 0.75), endSec: Math.round(dur) },
  ];

  return {
    title: fileName.replace(/\.[^.]+$/, ''),
    genre: 'Browser DSP Audio Audit',
    summary:
      lang === 'si'
        ? `Browser DSP විශ්ලේෂණය සම්පූර්ණයි: Peak ${stats.peakDbfs} dBFS, RMS ${stats.rmsDbfs} dBFS (Dynamic Range ${stats.crestFactorDb} dB). හඳුනාගත් සංඛ්‍යාත අඩුපාඩු ${issues.length}ක් සඳහා EQ විසඳුම් සකසා ඇත.`
        : `Browser DSP analysis complete: Peak ${stats.peakDbfs} dBFS, RMS ${stats.rmsDbfs} dBFS (Crest Factor ${stats.crestFactorDb} dB). Generated ${issues.length} targeted mix repairs from measured band energy.`,
    sections,
    audioIssues: issues,
    lyricIssues: [],
    recommendedEq,
  };
}

export function buildStaticBenchmarkReport(
  stats: AudioFileStats,
  params: MasteringParams,
  lang: LanguageMode
): OnlineCheckResult {
  const peakOk = stats.peakDbfs <= -1.0;
  const rmsTargetDiff = (-14 - stats.rmsDbfs).toFixed(1);

  const reportText =
    lang === 'si'
      ? `Static Hosting / Browser DSP මිනුම් වාර්තාව:

1. Streaming Platform සැසඳුම (Spotify / YouTube / Apple Music):
• Spotify සහ YouTube සම්මතය: -14 LUFS (Integrated) සහ -1.0 dBTP True Peak ceiling.
• ඔබේ මුල් ගීතයේ මිනුම්: Peak ${stats.peakDbfs} dBFS | RMS ${stats.rmsDbfs} dBFS | Dynamic Range ${stats.crestFactorDb} dB.
• ${
          peakOk
            ? 'Peak මට්ටම ආරක්ෂිත සීමාවේ ඇත.'
            : `Peak මට්ටම ${stats.peakDbfs} dBFS බැවින් (-1.0 dBFS ට ආසන්න), Streaming conversion වලදී Clipping වැළැක්වීමට Fixed Master Limiter (-0.6 dBFS) සක්‍රීය කර ඇත.`
        } (සාපේක්ෂ RMS වෙනස: ${rmsTargetDiff} dB).

2. දැනට යොදා ඇති Mastering EQ සැකසුම්:
• High-Pass: ${params.highPassHz} Hz | Mud Cut: ${params.mudCutDb.toFixed(1)} dB @ ${params.mudFreqHz} Hz
• Vocal Lift: +${params.presenceGainDb.toFixed(1)} dB @ ${params.presenceFreqHz} Hz | De-Ess: ${params.deEssDb.toFixed(1)} dB
• Compressor: ${params.compThresholdDb} dB (${params.compRatio}:1) | Stereo Width: ${params.stereoWidth}x`
      : `Browser DSP & Streaming Standards Check (Static GitHub Pages Mode):

1. Streaming Loudness & Ceiling Check:
• Industry Targets: Spotify (-14 LUFS / -1.0 dBTP), YouTube (-14 LUFS), Apple Music (-16 LUFS / -1.0 dBTP).
• Track Readings: Peak ${stats.peakDbfs} dBFS | RMS ${stats.rmsDbfs} dBFS | Crest Factor ${stats.crestFactorDb} dB.
• ${
          peakOk
            ? 'Headroom is safe below -1.0 dBFS.'
            : `Peak reaches ${stats.peakDbfs} dBFS — the Fixed Master -0.6 dBFS safety limiter prevents inter-sample clipping during AAC/Ogg encoding.`
        } (RMS delta to -14 dB target: ${rmsTargetDiff} dB).

2. Active Mastering Chain:
• High-Pass: ${params.highPassHz} Hz | Mud Cut: ${params.mudCutDb.toFixed(1)} dB @ ${params.mudFreqHz} Hz
• Vocal Lift: +${params.presenceGainDb.toFixed(1)} dB @ ${params.presenceFreqHz} Hz | De-Ess: ${params.deEssDb.toFixed(1)} dB
• Compressor: ${params.compThresholdDb} dB (${params.compRatio}:1) | Stereo Width: ${params.stereoWidth}x`;

  return {
    reportText,
    sources: [
      {
        title: 'Spotify for Artists — Loudness Normalization Guide',
        uri: 'https://support.spotify.com/us/artists/article/loudness-normalization/',
      },
      {
        title: 'Apple Music — Mastering Guidelines (-16 LUFS / -1 dBTP)',
        uri: 'https://www.apple.com/apple-music/apple-digital-masters/',
      },
    ],
    checkedAt: new Date().toISOString(),
  };
}

export function polishLyricsInBrowser(lyrics: string, lang: LanguageMode): LyricPolishResult {
  const lines = lyrics
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('['));

  const counts = lines.map((l) => l.split(/\s+/).length);
  const avgWords =
    counts.reduce((acc, c) => acc + c, 0) / Math.max(1, counts.length);

  const lineFixes: LyricPolishResult['lineFixes'] = [];
  for (const line of lines) {
    const words = line.split(/\s+/);
    if (words.length > Math.max(10, avgWords * 1.45)) {
      lineFixes.push({
        original: line,
        reason:
          lang === 'si'
            ? `මෙම පේළියේ වචන ${words.length}ක් ඇත (සාමාන්‍යය ${Math.round(avgWords)}). ගායනයේදී හුස්ම ගැනීමට සහ රිද්මයට මඳක් දිග වැඩියි.`
            : `Line has ${words.length} words (average ${Math.round(avgWords)}), which may crowd the vocal pocket.`,
        improved: `${words.slice(0, Math.ceil(words.length / 2)).join(' ')} / ${words
          .slice(Math.ceil(words.length / 2))
          .join(' ')}`,
      });
    }
  }

  return {
    summary:
      lang === 'si'
        ? `Static Browser Mode: පේළි ${lines.length}ක් පරීක්ෂා කළා (සාමාන්‍ය වචන ගණන ${avgWords.toFixed(1)}). රිද්මය තද වන පේළි ${lineFixes.length}ක් හඳුනා ගන්නා ලදී.`
        : `Static Browser Mode: Checked ${lines.length} lyric lines (avg ${avgWords.toFixed(1)} words/line). Found ${lineFixes.length} lines with potential meter crowding.`,
    lineFixes,
    polishedLyrics: lyrics,
  };
}
