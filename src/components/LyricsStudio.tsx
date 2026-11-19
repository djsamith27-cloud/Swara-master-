import React, { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { LanguageMode, LyricPolishResult } from '../types/studio';
import { INITIAL_LYRICS_TEXT } from '../data/defaultTrackData';

interface LyricsStudioProps {
  lang: LanguageMode;
}

export const LyricsStudio: React.FC<LyricsStudioProps> = ({ lang }) => {
  const [lyricsText, setLyricsText] = useState<string>(INITIAL_LYRICS_TEXT);
  const [style, setStyle] = useState<string>('Melodic Hip-Hop / Trap');
  const [isPolishing, setIsPolishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<LyricPolishResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePolish = async () => {
    if (!lyricsText.trim()) return;
    setIsPolishing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/polish-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: lyricsText, style, language: lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to polish lyrics.');
      }
      setResult(data as LyricPolishResult);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to polish lyrics.');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.polishedLyrics) return;
    await navigator.clipboard.writeText(result.polishedLyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Left: Lyrics Editor */}
      <div className="lg:col-span-6 bg-[#111722] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              {lang === 'si' ? 'පද රචනා සංස්කාරකය (Lyrics Editor)' : 'Lyrics & Rhythm Editor'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'si'
                ? 'දැනට ගීතයේ පද හෝ ඔබේ අලුත් පද මෙතන සංස්කරණය කරන්න.'
                : 'Edit the current track lyrics or paste new Sinhala/English lines to polish meter & rhyme.'}
            </p>
          </div>

          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            aria-label="Song genre style"
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="Melodic Hip-Hop / Trap">Melodic Hip-Hop / Trap</option>
            <option value="Sinhala Pop / Acoustic Ballad">Sinhala Pop / Acoustic Ballad</option>
            <option value="Fast Rap / Drill">Fast Rap / Drill</option>
            <option value="Baila / Dance Remix">Baila / Dance Remix</option>
          </select>
        </div>

        <textarea
          value={lyricsText}
          onChange={(e) => setLyricsText(e.target.value)}
          rows={18}
          className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-3.5 text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500 resize-y"
          placeholder={
            lang === 'si' ? 'ඔබේ සිංදුවේ පද මෙතන ලියන්න...' : 'Paste your song lyrics here...'
          }
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {lyricsText.split('\n').filter((l) => l.trim()).length}{' '}
            {lang === 'si' ? 'පේළි' : 'lines'}
          </span>

          <button
            type="button"
            onClick={handlePolish}
            disabled={isPolishing || !lyricsText.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isPolishing
              ? lang === 'si'
                ? 'පද සකස් කරමින්...'
                : 'Polishing Lyrics...'
              : lang === 'si'
                ? 'රිද්මය සහ අඩුපාඩු හදන්න'
                : 'Polish Lyrics & Flow'}
          </button>
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/70 rounded-lg px-3 py-2">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Right: Polished Output & Line-by-Line Critique */}
      <div className="lg:col-span-6 bg-[#111722] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <h2 className="text-base font-semibold text-slate-100">
            {lang === 'si' ? 'සකස් කළ පද මාලාව සහ නිවැරදි කිරීම්' : 'Polished Version & Fixes'}
          </h2>
          {result?.polishedLyrics && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 border border-slate-700 text-slate-200 hover:border-amber-500 transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? (lang === 'si' ? 'Copy වුණා' : 'Copied') : lang === 'si' ? 'Copy' : 'Copy'}
            </button>
          )}
        </div>

        {!result ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm text-slate-300">
              {lang === 'si'
                ? 'වම් පස ඇති "රිද්මය සහ අඩුපාඩු හදන්න" බොත්තම ඔබන්න.'
                : 'Click "Polish Lyrics & Flow" to tighten meter, rhyme, and phrasing.'}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {lang === 'si'
                ? 'සිංහල එළිසමය, අක්ෂර ගැළපීම (Syllable flow) සහ අස්වාභාවික වචන AI මගින් සකස් කර දෙනු ඇත.'
                : 'AI will preserve your story while smoothing syllable crowding, weak rhymes, and awkward phrasing.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>

            {result.lineFixes.length > 0 && (
              <div className="divide-y divide-slate-800/80 border-t border-b border-slate-800/80">
                {result.lineFixes.map((fix, i) => (
                  <div key={i} className="py-3 space-y-1">
                    <div className="text-xs text-rose-300/90 line-through">{fix.original}</div>
                    <div className="text-sm text-emerald-300 font-medium">{fix.improved}</div>
                    <div className="text-xs text-slate-400">{fix.reason}</div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="text-xs font-medium text-slate-400 mb-2">
                {lang === 'si' ? 'සම්පූර්ණ සකස් කළ පද රචනය:' : 'Full Polished Lyrics:'}
              </div>
              <pre className="bg-[#0B0F17] border border-slate-800 rounded-lg p-3.5 text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-h-[340px] overflow-y-auto">
                {result.polishedLyrics}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
