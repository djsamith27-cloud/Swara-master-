import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '35mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.post('/api/analyze-song', async (req, res) => {
  try {
    const { audioBase64, mimeType, filePath, fileName, language = 'si' } = req.body as {
      audioBase64?: string;
      mimeType?: string;
      filePath?: string;
      fileName?: string;
      language?: 'si' | 'en';
    };

    let base64Data = audioBase64;
    let resolvedMime = mimeType || 'audio/mpeg';

    if (!base64Data && filePath) {
      const cleanRel = filePath.replace(/^\/+/, '');
      const publicRoot = path.resolve(__dirname, 'public');
      const distRoot = path.resolve(__dirname, 'dist');
      const candidatePublic = path.resolve(publicRoot, cleanRel);
      const candidateDist = path.resolve(distRoot, cleanRel);

      let targetFile = '';
      if (candidatePublic.startsWith(publicRoot + path.sep) && fs.existsSync(candidatePublic)) {
        targetFile = candidatePublic;
      } else if (candidateDist.startsWith(distRoot + path.sep) && fs.existsSync(candidateDist)) {
        targetFile = candidateDist;
      }

      if (!targetFile) {
        res.status(404).json({ error: 'Audio file not found on server.' });
        return;
      }
      base64Data = fs.readFileSync(targetFile).toString('base64');
      if (targetFile.endsWith('.wav')) resolvedMime = 'audio/wav';
      else if (targetFile.endsWith('.m4a')) resolvedMime = 'audio/mp4';
      else if (targetFile.endsWith('.ogg')) resolvedMime = 'audio/ogg';
      else resolvedMime = 'audio/mpeg';
    }

    if (!base64Data) {
      res.status(400).json({ error: 'No audio payload or file path provided.' });
      return;
    }

    const ai = getGeminiClient();
    const isSinhala = language === 'si';

    const promptText = isSinhala
      ? `මෙම ගීතය (${fileName || 'Uploaded Track'}) ඉතා හොඳින් අසා, Audio Mixing / Mastering අඩුපාඩු සහ පද රචනා / ගායන රිද්මයේ (Lyrics & Flow) අඩුපාඩු සවිස්තරාත්මකව විශ්ලේෂණය කරන්න.
සියලුම විස්තර සහ පැහැදිලි කිරීම් ස්වභාවික සිංහලෙන් (සංගීත තාක්ෂණික පද ඉංග්‍රීසියෙන් වරහන් තුළ හෝ කෙලින්ම තබමින්) ලබා දෙන්න.
ඇත්තටම ඔබට ඇසෙන timestamps (තත්පර ගණන්) නිවැරදිව සඳහන් කරන්න. EQ සහ Compressor අගයන් යථාර්ථවාදීව දෙන්න.`
      : `Listen carefully to this track (${fileName || 'Uploaded Track'}) and perform a thorough Audio Mixing/Mastering diagnostic plus Lyrics, Pronunciation & Flow critique.
Report real audible timestamps (in seconds), concrete audio issues (EQ mud, vocal presence, harshness/sibilance, dynamics, stereo image), lyric/rhythm issues with improved lines, and realistic mastering EQ/compressor repair parameters.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: resolvedMime,
              data: base64Data,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        systemInstruction:
          'You are a senior mastering audio engineer and Sinhala/English songwriting producer. Only report issues you actually observe in the audio. Keep EQ recommendations musical and safe (-6 dB to +6 dB).',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            genre: { type: Type.STRING },
            bpmEstimate: { type: Type.INTEGER },
            keyEstimate: { type: Type.STRING },
            summary: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  startSec: { type: Type.NUMBER },
                  endSec: { type: Type.NUMBER },
                },
                required: ['label', 'startSec', 'endSec'],
              },
            },
            audioIssues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestampSec: { type: Type.NUMBER },
                  timestampLabel: { type: Type.STRING },
                  category: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  title: { type: Type.STRING },
                  detail: { type: Type.STRING },
                  fixAction: { type: Type.STRING },
                },
                required: ['timestampSec', 'timestampLabel', 'category', 'severity', 'title', 'detail', 'fixAction'],
              },
            },
            lyricIssues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestampSec: { type: Type.NUMBER },
                  timestampLabel: { type: Type.STRING },
                  originalLine: { type: Type.STRING },
                  issue: { type: Type.STRING },
                  improvedLine: { type: Type.STRING },
                },
                required: ['timestampSec', 'timestampLabel', 'originalLine', 'issue', 'improvedLine'],
              },
            },
            recommendedEq: {
              type: Type.OBJECT,
              properties: {
                highPassHz: { type: Type.NUMBER },
                lowGainDb: { type: Type.NUMBER },
                mudFreqHz: { type: Type.NUMBER },
                mudCutDb: { type: Type.NUMBER },
                presenceFreqHz: { type: Type.NUMBER },
                presenceGainDb: { type: Type.NUMBER },
                deEssDb: { type: Type.NUMBER },
                airGainDb: { type: Type.NUMBER },
                compThresholdDb: { type: Type.NUMBER },
                compRatio: { type: Type.NUMBER },
                stereoWidth: { type: Type.NUMBER },
                makeupGainDb: { type: Type.NUMBER },
              },
              required: [
                'highPassHz',
                'lowGainDb',
                'mudFreqHz',
                'mudCutDb',
                'presenceFreqHz',
                'presenceGainDb',
                'deEssDb',
                'airGainDb',
                'compThresholdDb',
                'compRatio',
                'stereoWidth',
                'makeupGainDb',
              ],
            },
          },
          required: [
            'title',
            'genre',
            'summary',
            'sections',
            'audioIssues',
            'lyricIssues',
            'recommendedEq',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to analyze song.';
    console.error('Analyze song error:', err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/polish-lyrics', async (req, res) => {
  try {
    const { lyrics, style = 'Melodic Hip-Hop / Trap', language = 'si' } = req.body as {
      lyrics?: string;
      style?: string;
      language?: 'si' | 'en';
    };

    if (!lyrics || !lyrics.trim()) {
      res.status(400).json({ error: 'Lyrics text is required.' });
      return;
    }

    const ai = getGeminiClient();
    const isSinhala = language === 'si';

    const promptText = isSinhala
      ? `පහත ගීත පද රචනය (${style} රිද්මයට) පරීක්ෂා කර රිද්මය (Flow/Meter), එළිසමය (Rhyme), වචන උච්චාරණය හා අර්ථවත් බව තියෙන අඩුපාඩු හඳුනාගෙන වඩාත් සුමට හා බලවත් විදිහට සකස් කරන්න.\n\nපද රචනය:\n${lyrics}`
      : `Review and polish the following lyrics for a ${style} track. Identify rhythm/syllable crowding, weak rhymes, or phrasing flaws, and provide a tighter, polished version while preserving the original story and emotion.\n\nLyrics:\n${lyrics}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: {
        systemInstruction:
          'You are an expert Sinhala and English lyricist and vocal producer. Preserve the songwriter’s authentic voice and story while fixing syllable crowding, pronunciation mismatches, and weak rhymes.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            lineFixes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  improved: { type: Type.STRING },
                },
                required: ['original', 'reason', 'improved'],
              },
            },
            polishedLyrics: { type: Type.STRING },
          },
          required: ['summary', 'lineFixes', 'polishedLyrics'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to polish lyrics.';
    console.error('Polish lyrics error:', err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/online-check', async (req, res) => {
  try {
    const {
      title,
      genre,
      bpmEstimate,
      peakDbfs,
      rmsDbfs,
      crestFactorDb,
      params,
      language = 'si',
    } = req.body as {
      title?: string;
      genre?: string;
      bpmEstimate?: number;
      peakDbfs?: number;
      rmsDbfs?: number;
      crestFactorDb?: number;
      params?: Record<string, number>;
      language?: 'si' | 'en';
    };

    const ai = getGeminiClient();
    const isSinhala = language === 'si';

    const trackContext = [
      `Track: ${title || 'Untitled Track'}`,
      `Genre: ${genre || 'Modern Pop / Hip-Hop'}`,
      bpmEstimate ? `Estimated BPM: ${bpmEstimate}` : '',
      peakDbfs !== undefined ? `Measured Peak: ${peakDbfs} dBFS` : '',
      rmsDbfs !== undefined ? `Measured RMS: ${rmsDbfs} dBFS` : '',
      crestFactorDb !== undefined ? `Measured Crest Factor (Dynamic Range): ${crestFactorDb} dB` : '',
      params
        ? `Current Mastering Chain: HPF ${params.highPassHz}Hz, Low ${params.lowGainDb}dB, Mud Cut ${params.mudCutDb}dB @ ${params.mudFreqHz}Hz, Vocal Presence ${params.presenceGainDb}dB @ ${params.presenceFreqHz}Hz, De-Ess ${params.deEssDb}dB @ 6.8kHz, Air ${params.airGainDb}dB, Compressor ${params.compThresholdDb}dB (${params.compRatio}:1), Stereo Width ${params.stereoWidth}x`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const promptText = isSinhala
      ? `අන්තර්ජාලයෙන් (Google Search) නවතම Spotify, YouTube Music සහ Apple Music mastering loudness (LUFS / True Peak dBTP) ප්‍රමිතීන් සහ මෙම ගීතයේ ශෛලියට (${genre || 'Trap / Hip-Hop'}) අදාළ mixing සම්මතයන් පරීක්ෂා කරන්න.

පහත දැක්වෙන මේ ගීතයේ සැබෑ මිනුම් අගයන් සමඟ සසඳා බලන්න:
${trackContext}

සිංහලෙන් පැහැදිලි, කෙටි කරුණු ලෙස (1) Streaming platforms (Spotify / YouTube / Apple Music) සඳහා මේ ගීතයේ Loudness සහ Peak තත්ත්වය ගැළපෙනවාද, (2) 808/Bass සහ Vocal Clarity සඳහා තව වෙනස් කළ යුතු දේ මොනවාද යන්න ඉදිරිපත් කරන්න.`
      : `Search online for current Spotify, YouTube Music, and Apple Music audio mastering loudness and true-peak standards, as well as modern ${genre || 'Trap / Hip-Hop'} mix balance benchmarks.

Compare those online industry standards against this track's measured readings:
${trackContext}

Provide a concise, practical evaluation covering:
1. Streaming platform readiness (Spotify / YouTube / Apple Music target LUFS & True Peak vs this track's RMS/Peak).
2. Genre-specific mix & EQ adjustments recommended based on current production standards.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const reportText = (response.text ?? '').trim();
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const seen = new Set<string>();
    const sources: Array<{ title: string; uri: string }> = [];

    for (const chunk of rawChunks) {
      const web = (chunk as { web?: { uri?: string; title?: string } }).web;
      if (web?.uri && !seen.has(web.uri)) {
        seen.add(web.uri);
        sources.push({
          title: web.title || web.uri,
          uri: web.uri,
        });
      }
    }

    res.json({
      reportText,
      sources,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to run online AI benchmark check.';
    console.error('Online check error:', err);
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Swara Studio server running at http://0.0.0.0:${port}`);
  });
}

startServer();
