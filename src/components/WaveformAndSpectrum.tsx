import React, { useEffect, useRef } from 'react';
import { AudioIssue, LanguageMode, SongSection } from '../types/studio';

interface WaveformAndSpectrumProps {
  peaks: number[];
  durationSec: number;
  currentTimeSec: number;
  isPlaying: boolean;
  isBypassed: boolean;
  sections: SongSection[];
  audioIssues: AudioIssue[];
  analyserNode: AnalyserNode | null;
  gainReductionDb: number;
  lang: LanguageMode;
  onSeek: (timeSec: number) => void;
}

export function formatTimecode(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const WaveformAndSpectrum: React.FC<WaveformAndSpectrumProps> = ({
  peaks,
  durationSec,
  currentTimeSec,
  isPlaying,
  isBypassed,
  sections,
  audioIssues,
  analyserNode,
  gainReductionDb,
  lang,
  onSeek,
}) => {
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const bins = 48;
    const freqData = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Subtle dB grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      for (let g = 1; g < 4; g++) {
        const y = Math.round((height / 4) * g) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (analyserNode && freqData && isPlaying) {
        analyserNode.getByteFrequencyData(freqData);
        const barW = width / bins;
        const maxBin = Math.min(freqData.length - 1, Math.floor(freqData.length * 0.72));

        for (let i = 0; i < bins; i++) {
          // Logarithmic bin mapping for musical frequency distribution (20Hz -> 16kHz)
          const t0 = Math.pow(i / bins, 1.85);
          const t1 = Math.pow((i + 1) / bins, 1.85);
          const idxStart = Math.floor(t0 * maxBin);
          const idxEnd = Math.max(idxStart + 1, Math.floor(t1 * maxBin));
          let sum = 0;
          for (let j = idxStart; j < idxEnd; j++) {
            sum += freqData[j];
          }
          const avg = sum / (idxEnd - idxStart) / 255;
          const barH = Math.max(2, avg * (height - 10));
          const x = i * barW + 1;
          const y = height - barH;

          ctx.fillStyle = isBypassed ? 'rgba(148, 163, 184, 0.55)' : 'rgba(245, 158, 11, 0.85)';
          ctx.fillRect(x, y, Math.max(2, barW - 2), barH);
        }
      } else {
        // Resting baseline
        ctx.fillStyle = 'rgba(148, 163, 184, 0.18)';
        const barW = width / bins;
        for (let i = 0; i < bins; i++) {
          ctx.fillRect(i * barW + 1, height - 3, Math.max(2, barW - 2), 2);
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [analyserNode, isPlaying, isBypassed]);

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = waveformWrapRef.current;
    if (!el || durationSec <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * durationSec);
  };

  const progressPct = durationSec > 0 ? Math.min(100, (currentTimeSec / durationSec) * 100) : 0;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Main Waveform & Section Timeline */}
      <div className="lg:col-span-8 bg-[#111722] border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-200">
              {lang === 'si' ? 'ශබ්ද තරංග සිතියම (Waveform)' : 'Master Waveform'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {lang === 'si'
                ? 'අවශ්‍ය තැන click කර අසන්න'
                : 'Click anywhere to scrub or jump to flagged flaws'}
            </span>
          </div>
          <div className="font-mono text-xs text-slate-300 tabular-nums">
            {formatTimecode(currentTimeSec)} / {formatTimecode(durationSec)}
          </div>
        </div>

        {/* Waveform Bars */}
        <div
          ref={waveformWrapRef}
          onClick={handleWaveformClick}
          role="slider"
          aria-label="Audio scrub timeline"
          aria-valuemin={0}
          aria-valuemax={Math.round(durationSec)}
          aria-valuenow={Math.round(currentTimeSec)}
          tabIndex={0}
          className="relative h-28 flex items-center gap-[2px] cursor-pointer select-none group py-2"
        >
          {peaks.length > 0 ? (
            peaks.map((amp, idx) => {
              const barPct = (idx / peaks.length) * 100;
              const isPast = barPct <= progressPct;
              const heightPct = Math.max(8, Math.round(amp * 100));
              return (
                <div
                  key={idx}
                  className="flex-1 flex items-center justify-center h-full"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-[1px] transition-colors duration-100 ${
                      isPast
                        ? isBypassed
                          ? 'bg-slate-400'
                          : 'bg-amber-400'
                        : 'bg-slate-700/80 group-hover:bg-slate-600'
                    }`}
                  />
                </div>
              );
            })
          ) : (
            <div className="w-full h-1 bg-slate-800 rounded" />
          )}

          {/* Diagnostic Issue Markers */}
          {durationSec > 0 &&
            audioIssues.map((issue, idx) => {
              const leftPct = Math.min(98, Math.max(1, (issue.timestampSec / durationSec) * 100));
              return (
                <button
                  key={`${issue.timestampSec}-${idx}`}
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onSeek(issue.timestampSec);
                  }}
                  title={`${issue.timestampLabel} — ${issue.title}`}
                  style={{ left: `${leftPct}%` }}
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center group/pin focus:outline-none"
                >
                  <span
                    className={`w-2 h-2 rounded-xs rotate-45 border ${
                      issue.severity === 'high'
                        ? 'bg-rose-500 border-rose-200'
                        : 'bg-amber-500 border-amber-200'
                    }`}
                  />
                  <span className="h-24 w-px bg-rose-400/25 group-hover/pin:bg-rose-400/70" />
                </button>
              );
            })}

          {/* Playhead */}
          <div
            style={{ left: `${progressPct}%` }}
            className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
          />
        </div>

        {/* Section Markers Strip */}
        {sections.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {sections.map((sec, idx) => {
              const isActive = currentTimeSec >= sec.startSec && currentTimeSec < sec.endSec;
              return (
                <button
                  key={`${sec.label}-${idx}`}
                  type="button"
                  onClick={() => onSeek(sec.startSec)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors border ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="font-mono text-[11px] opacity-75 mr-1.5">
                    {formatTimecode(sec.startSec)}
                  </span>
                  {sec.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Spectrum Analyzer + Dynamics Readout */}
      <div className="lg:col-span-4 bg-[#111722] border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-200">
            {lang === 'si' ? 'සජීවී Spectrum විශ්ලේෂකය' : 'Live Spectrum Analyzer'}
          </span>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {isBypassed ? 'Original (A)' : 'Fixed (B)'}
          </span>
        </div>

        <div className="relative bg-[#0B0F17] border border-slate-800/90 rounded-lg p-2">
          <canvas
            ref={spectrumCanvasRef}
            width={360}
            height={116}
            className="w-full h-[116px] block"
          />
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-1 px-1">
            <span>40Hz</span>
            <span>250Hz</span>
            <span>1kHz</span>
            <span>3.2kHz</span>
            <span>12kHz</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
          <span className="text-slate-400">
            {lang === 'si' ? 'Compressor අඩු කිරීම (GR)' : 'Gain Reduction'}
          </span>
          <span className="font-mono text-amber-400 tabular-nums font-medium">
            {isBypassed ? '0.0 dB' : `${gainReductionDb.toFixed(1)} dB`}
          </span>
        </div>
      </div>
    </section>
  );
};
