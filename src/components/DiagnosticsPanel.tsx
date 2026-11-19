import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Play,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  AudioIssue,
  LanguageMode,
  LyricIssue,
  MasteringParams,
  OnlineCheckResult,
  TrackAnalysis,
} from '../types/studio';

interface DiagnosticsPanelProps {
  analysis: TrackAnalysis;
  lang: LanguageMode;
  isAnalyzing: boolean;
  analyzeError: string | null;
  onlineCheck: OnlineCheckResult | null;
  isCheckingOnline: boolean;
  onlineCheckError: string | null;
  appliedFixes: Record<number, boolean>;
  onJumpToTime: (sec: number) => void;
  onApplyIssueFix: (idx: number, patch?: Partial<MasteringParams>) => void;
  onApplyAllFixes: () => void;
  onRunAiAnalysis: () => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  analysis,
  lang,
  isAnalyzing,
  analyzeError,
  onlineCheck,
  isCheckingOnline,
  onlineCheckError,
  appliedFixes,
  onJumpToTime,
  onApplyIssueFix,
  onApplyAllFixes,
  onRunAiAnalysis,
}) => {
  const severityLabel = (sev: AudioIssue['severity']) => {
    if (lang === 'si') {
      if (sev === 'high') return 'ප්‍රධාන අඩුවක්';
      if (sev === 'medium') return 'මධ්‍යම අඩුවක්';
      return 'සුළු වැඩිදියුණුවක්';
    }
    if (sev === 'high') return 'High Impact';
    if (sev === 'medium') return 'Moderate';
    return 'Subtle Polish';
  };

  const severityColor = (sev: AudioIssue['severity']) => {
    if (sev === 'high') return 'text-rose-400';
    if (sev === 'medium') return 'text-amber-400';
    return 'text-slate-400';
  };

  const isBusy = isAnalyzing || isCheckingOnline;

  return (
    <div className="space-y-6">
      {/* Executive Summary & Actions */}
      <div className="bg-[#111722] border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-100 text-sm">{analysis.title}</span>
            <span aria-hidden="true">·</span>
            <span>{analysis.genre}</span>
            {analysis.bpmEstimate && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{analysis.bpmEstimate} BPM</span>
              </>
            )}
            {analysis.keyEstimate && (
              <>
                <span aria-hidden="true">·</span>
                <span>{analysis.keyEstimate}</span>
              </>
            )}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onApplyAllFixes}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Wrench className="w-3.5 h-3.5" />
            {lang === 'si' ? 'සියලු Audio අඩුපාඩු හදන්න' : 'Apply All Audio Fixes'}
          </button>
          <button
            type="button"
            onClick={onRunAiAnalysis}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isBusy
              ? lang === 'si'
                ? 'Online AI මගින් පරීක්ෂා වෙමින්...'
                : 'Checking Online via AI...'
              : lang === 'si'
                ? 'Online AI Check කරන්න'
                : 'Run Online AI Check'}
          </button>
        </div>
      </div>

      {analyzeError && (
        <div className="bg-rose-950/40 border border-rose-800/70 rounded-xl px-4 py-3 text-sm text-rose-200 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{analyzeError}</span>
        </div>
      )}

      {/* Online Web Search & Streaming Benchmark Check */}
      <div className="bg-[#111722] border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-semibold text-slate-100">
              {lang === 'si'
                ? 'Online AI Streaming සහ Reference පරීක්ෂාව'
                : 'Online AI Streaming & Reference Check'}
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {isCheckingOnline
              ? lang === 'si'
                ? 'අන්තර්ජාල ප්‍රමිතීන් පරීක්ෂා වෙමින්...'
                : 'Searching online benchmarks...'
              : onlineCheck
                ? `${lang === 'si' ? 'පරීක්ෂා කළා' : 'Checked'} · ${new Date(
                    onlineCheck.checkedAt
                  ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : lang === 'si'
                  ? 'සූදානම්'
                  : 'Ready'}
          </span>
        </div>

        {onlineCheckError && (
          <div className="bg-rose-950/40 border border-rose-800/70 rounded-lg px-3.5 py-2.5 text-xs text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{onlineCheckError}</span>
          </div>
        )}

        {isCheckingOnline && !onlineCheck ? (
          <div className="py-4 flex items-center gap-2.5 text-sm text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            <span>
              {lang === 'si'
                ? 'Spotify / YouTube / Apple Music mastering ප්‍රමිතීන් සමඟ ගීතය සසඳමින් පවතී...'
                : 'Comparing track loudness & mix balance against live online mastering standards...'}
            </span>
          </div>
        ) : onlineCheck ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {onlineCheck.reportText}
            </div>

            {onlineCheck.sources.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="text-xs font-medium text-slate-400">
                  {lang === 'si' ? 'පරීක්ෂා කළ Online මූලාශ්‍ර:' : 'Verified Online Sources:'}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {onlineCheck.sources.map((src, idx) => (
                    <a
                      key={`${src.uri}-${idx}`}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 hover:underline max-w-xs truncate"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{src.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            {lang === 'si'
              ? '"Online AI Check කරන්න" ඔබා අන්තර්ජාලයේ නවතම Mastering ප්‍රමිතීන් සමඟ ඔබේ ගීතය සසඳා බලන්න.'
              : 'Click "Run Online AI Check" to verify your track against live Spotify, YouTube, and genre mastering standards.'}
          </p>
        )}
      </div>

      {/* Two-Column Breakdown: Audio Mix Flaws vs Lyrics & Flow Flaws */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Audio Mix Issues */}
        <div className="lg:col-span-7 bg-[#111722] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <h2 className="text-base font-semibold text-slate-100">
              {lang === 'si'
                ? 'Audio Mix සහ Mastering අඩුපාඩු'
                : 'Audio Mix & Mastering Flaws'}
            </h2>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {analysis.audioIssues.length} {lang === 'si' ? 'කරුණු' : 'items'}
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {analysis.audioIssues.map((issue, idx) => {
              const isApplied = !!appliedFixes[idx];
              return (
                <div key={`${issue.timestampSec}-${idx}`} className="py-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onJumpToTime(issue.timestampSec)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 text-xs font-mono text-amber-300 tabular-nums shrink-0 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        {issue.timestampLabel}
                      </button>
                      <span className={`text-xs font-medium ${severityColor(issue.severity)}`}>
                        {severityLabel(issue.severity)}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-xs text-slate-400">{issue.category}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onApplyIssueFix(idx, issue.patch)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors border ${
                        isApplied
                          ? 'bg-emerald-950/60 border-emerald-700/70 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-emerald-500/60 hover:text-emerald-300'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {lang === 'si' ? 'හදන ලදී' : 'Applied'}
                        </>
                      ) : (
                        <>
                          <Wrench className="w-3.5 h-3.5" />
                          {lang === 'si' ? 'මෙය හදන්න' : 'Fix This'}
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100">{issue.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{issue.detail}</p>
                  <div className="text-xs text-emerald-400 font-medium">
                    {lang === 'si' ? 'විසඳුම: ' : 'Repair: '}
                    {issue.fixAction}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lyric / Pronunciation / Rhythm Flaws */}
        <div className="lg:col-span-5 bg-[#111722] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <h2 className="text-base font-semibold text-slate-100">
              {lang === 'si'
                ? 'පද රචනා සහ ගායන රිද්මයේ අඩුපාඩු'
                : 'Lyrics, Pronunciation & Flow Notes'}
            </h2>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {analysis.lyricIssues.length} {lang === 'si' ? 'තැන්' : 'notes'}
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {analysis.lyricIssues.map((item: LyricIssue, idx: number) => (
              <div key={`${item.timestampSec}-${idx}`} className="py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onJumpToTime(item.timestampSec)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 text-xs font-mono text-amber-300 tabular-nums shrink-0 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    {item.timestampLabel}
                  </button>
                  <span className="text-xs text-slate-400">
                    {lang === 'si' ? 'ගීතයේ ඇති පදය' : 'Audible line'}
                  </span>
                </div>

                <div className="text-sm text-rose-300/90 font-medium">“{item.originalLine}”</div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.issue}</p>
                <div className="bg-[#0B0F17] border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-300 leading-relaxed">
                  <span className="text-slate-400 block mb-0.5">
                    {lang === 'si' ? 'වඩාත් ගැළපෙන විදිහ:' : 'Suggested fix:'}
                  </span>
                  {item.improvedLine}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
