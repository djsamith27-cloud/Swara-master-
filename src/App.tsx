import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  Globe,
  Loader2,
  Pause,
  Play,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import {
  buildMasteringChain,
  computeAudioStats,
  exportMasteredWav,
  extractWaveformPeaks,
  MasteringGraphNodes,
} from './audio/masteringEngine';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { LyricsStudio } from './components/LyricsStudio';
import { MasteringConsole } from './components/MasteringConsole';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { formatTimecode, WaveformAndSpectrum } from './components/WaveformAndSpectrum';
import {
  DEFAULT_TRACK_FILENAME,
  DEFAULT_TRACK_URL,
  FLAT_PARAMS,
  getInitialAnalysis,
  MASTERING_PRESETS,
  RECOMMENDED_REMIX_PARAMS,
} from './data/defaultTrackData';
import {
  AudioFileStats,
  LanguageMode,
  MasteringParams,
  MasteringPreset,
  OnlineCheckResult,
  TrackAnalysis,
  WorkspaceTab,
} from './types/studio';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read audio file.'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [lang, setLang] = useState<LanguageMode>('si');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');

  // Track & Audio State
  const [trackName, setTrackName] = useState<string>(DEFAULT_TRACK_FILENAME);
  const [isDefaultTrack, setIsDefaultTrack] = useState<boolean>(true);
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string>('audio/mpeg');

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioStats, setAudioStats] = useState<AudioFileStats | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(true);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Transport State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isBypassed, setIsBypassed] = useState<boolean>(false);
  const [gainReductionDb, setGainReductionDb] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // DSP Parameters
  const [params, setParams] = useState<MasteringParams>(RECOMMENDED_REMIX_PARAMS);
  const [activePresetId, setActivePresetId] = useState<string>('recommended-fix');
  const [appliedFixes, setAppliedFixes] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true,
  });

  // AI Diagnostics & Online Benchmark State
  const [analysis, setAnalysis] = useState<TrackAnalysis>(() => getInitialAnalysis('si'));
  const [hasCustomAiAnalysis, setHasCustomAiAnalysis] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [onlineCheck, setOnlineCheck] = useState<OnlineCheckResult | null>(null);
  const [isCheckingOnline, setIsCheckingOnline] = useState<boolean>(false);
  const [onlineCheckError, setOnlineCheckError] = useState<string | null>(null);
  const initialAutoCheckedRef = useRef<boolean>(false);

  // Web Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const chainRef = useRef<MasteringGraphNodes | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startCtxTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);
  const playGenRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const stopPlaybackNodes = useCallback(() => {
    playGenRef.current += 1;
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // Already stopped
      }
      sourceNodeRef.current = null;
    }
  }, []);

  // Load default track on initial mount
  useEffect(() => {
    let cancelled = false;

    async function loadDefault() {
      setIsLoadingAudio(true);
      setAudioError(null);
      try {
        const res = await fetch(DEFAULT_TRACK_URL);
        if (!res.ok) {
          throw new Error(`Could not load default track (${res.status}).`);
        }
        const arrayBuf = await res.arrayBuffer();
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const tempCtx = new AudioCtx();
        const decoded = await tempCtx.decodeAudioData(arrayBuf);
        await tempCtx.close();

        if (cancelled) return;
        setAudioBuffer(decoded);
        setAudioStats(computeAudioStats(decoded));
        setWaveformPeaks(extractWaveformPeaks(decoded, 168));
      } catch (err: unknown) {
        if (!cancelled) {
          setAudioError(err instanceof Error ? err.message : 'Unable to decode audio track.');
        }
      } finally {
        if (!cancelled) setIsLoadingAudio(false);
      }
    }

    void loadDefault();

    return () => {
      cancelled = true;
      stopPlaybackNodes();
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [stopPlaybackNodes]);

  // Keep built-in default analysis synced with UI language toggle unless replaced by custom AI audit
  useEffect(() => {
    if (isDefaultTrack && !hasCustomAiAnalysis) {
      setAnalysis(getInitialAnalysis(lang));
    }
  }, [lang, isDefaultTrack, hasCustomAiAnalysis]);

  // Update live Web Audio parameters smoothly whenever sliders change
  useEffect(() => {
    if (chainRef.current) {
      chainRef.current.updateParams(params, false);
    }
  }, [params]);

  // Update A/B bypass crossfade smoothly
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !dryGainRef.current || !wetGainRef.current) return;
    const now = ctx.currentTime;
    dryGainRef.current.gain.setTargetAtTime(isBypassed ? 1 : 0, now, 0.015);
    wetGainRef.current.gain.setTargetAtTime(isBypassed ? 0 : 1, now, 0.015);
  }, [isBypassed]);

  // Animation loop for playhead & compressor gain reduction meter
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;

    const tick = () => {
      const ctx = audioCtxRef.current;
      if (ctx && audioBuffer) {
        const elapsed = ctx.currentTime - startCtxTimeRef.current;
        const clamped = Math.min(audioBuffer.duration, Math.max(0, elapsed));
        setCurrentTimeSec(clamped);
        if (chainRef.current) {
          setGainReductionDb(chainRef.current.compressor.reduction || 0);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, audioBuffer]);

  const startPlaybackAt = useCallback(
    (offsetSec: number) => {
      if (!audioBuffer) return;
      const ctx = ensureAudioContext();
      stopPlaybackNodes();

      const safeOffset = Math.max(0, Math.min(audioBuffer.duration - 0.05, offsetSec));
      const gen = ++playGenRef.current;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.78;
      analyserRef.current = analyser;

      const dryGain = ctx.createGain();
      dryGain.gain.value = isBypassed ? 1 : 0;
      dryGainRef.current = dryGain;

      const wetGain = ctx.createGain();
      wetGain.gain.value = isBypassed ? 0 : 1;
      wetGainRef.current = wetGain;

      const chain = buildMasteringChain(ctx, params, audioBuffer.numberOfChannels);
      chainRef.current = chain;

      // Parallel Dry (Original) and Wet (Fixed) into Analyser -> Output
      source.connect(dryGain);
      dryGain.connect(analyser);

      source.connect(chain.input);
      chain.output.connect(wetGain);
      wetGain.connect(analyser);

      analyser.connect(ctx.destination);

      source.onended = () => {
        if (playGenRef.current === gen) {
          setIsPlaying(false);
          pauseOffsetRef.current = 0;
          setCurrentTimeSec(0);
          setGainReductionDb(0);
        }
      };

      startCtxTimeRef.current = ctx.currentTime - safeOffset;
      pauseOffsetRef.current = safeOffset;
      setCurrentTimeSec(safeOffset);
      sourceNodeRef.current = source;
      source.start(0, safeOffset);
      setIsPlaying(true);
    },
    [audioBuffer, ensureAudioContext, isBypassed, params, stopPlaybackNodes]
  );

  const togglePlayPause = () => {
    if (!audioBuffer) return;
    if (isPlaying) {
      const ctx = audioCtxRef.current;
      const current = ctx ? ctx.currentTime - startCtxTimeRef.current : currentTimeSec;
      pauseOffsetRef.current = Math.max(0, Math.min(audioBuffer.duration, current));
      stopPlaybackNodes();
      setIsPlaying(false);
      setGainReductionDb(0);
    } else {
      startPlaybackAt(pauseOffsetRef.current);
    }
  };

  const handleSeek = (timeSec: number) => {
    if (!audioBuffer) return;
    const clamped = Math.max(0, Math.min(audioBuffer.duration, timeSec));
    pauseOffsetRef.current = clamped;
    setCurrentTimeSec(clamped);
    if (isPlaying) {
      startPlaybackAt(clamped);
    }
  };

  const handleJumpAndPlay = (timeSec: number) => {
    if (!audioBuffer) return;
    const clamped = Math.max(0, Math.min(audioBuffer.duration, timeSec));
    pauseOffsetRef.current = clamped;
    setCurrentTimeSec(clamped);
    startPlaybackAt(clamped);
  };

  const runOnlineCheck = useCallback(
    async (
      overrideStats?: AudioFileStats,
      overrideTitle?: string,
      overrideGenre?: string
    ) => {
      const targetStats = overrideStats || audioStats;
      setIsCheckingOnline(true);
      setOnlineCheckError(null);
      try {
        const res = await fetch('/api/online-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: overrideTitle || analysis.title || trackName,
            genre: overrideGenre || analysis.genre,
            bpmEstimate: analysis.bpmEstimate,
            peakDbfs: targetStats?.peakDbfs,
            rmsDbfs: targetStats?.rmsDbfs,
            crestFactorDb: targetStats?.crestFactorDb,
            params,
            language: lang,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Online AI check failed.');
        }
        setOnlineCheck(data as OnlineCheckResult);
      } catch (err: unknown) {
        setOnlineCheckError(
          err instanceof Error ? err.message : 'Unable to run online AI check.'
        );
      } finally {
        setIsCheckingOnline(false);
      }
    },
    [analysis.bpmEstimate, analysis.genre, analysis.title, audioStats, lang, params, trackName]
  );

  const runAiAudit = useCallback(
    async (
      overrideBase64?: string,
      overrideMime?: string,
      overrideName?: string,
      useDefaultPath = false,
      overrideStats?: AudioFileStats
    ) => {
      setIsAnalyzing(true);
      setAnalyzeError(null);

      // Run online web benchmark check in parallel
      void runOnlineCheck(
        overrideStats,
        overrideName || (useDefaultPath ? DEFAULT_TRACK_FILENAME : trackName),
        overrideName ? 'Uploaded Audio Track' : undefined
      );

      try {
        const bodyPayload = useDefaultPath
          ? {
              filePath: DEFAULT_TRACK_URL,
              fileName: DEFAULT_TRACK_FILENAME,
              language: lang,
            }
          : {
              audioBase64: overrideBase64 || uploadedFileBase64,
              mimeType: overrideMime || uploadedMimeType,
              fileName: overrideName || trackName,
              language: lang,
            };

        const res = await fetch('/api/analyze-song', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Song analysis failed.');
        }
        const nextAnalysis = data as TrackAnalysis;
        setAnalysis(nextAnalysis);
        setHasCustomAiAnalysis(true);

        if (nextAnalysis.recommendedEq) {
          setParams(nextAnalysis.recommendedEq);
          setActivePresetId('custom-ai');
          setIsBypassed(false);
          const allMap: Record<number, boolean> = {};
          nextAnalysis.audioIssues.forEach((_, idx) => {
            allMap[idx] = true;
          });
          setAppliedFixes(allMap);
        }
      } catch (err: unknown) {
        setAnalyzeError(err instanceof Error ? err.message : 'Unable to analyze song.');
      } finally {
        setIsAnalyzing(false);
      }
    },
    [lang, runOnlineCheck, trackName, uploadedFileBase64, uploadedMimeType]
  );

  // Automatically run Online AI Check once the pre-loaded song finishes decoding
  useEffect(() => {
    if (audioStats && isDefaultTrack && !initialAutoCheckedRef.current) {
      initialAutoCheckedRef.current = true;
      void runAiAudit(undefined, undefined, undefined, true, audioStats);
    }
  }, [audioStats, isDefaultTrack, runAiAudit]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopPlaybackNodes();
    setIsPlaying(false);
    setCurrentTimeSec(0);
    pauseOffsetRef.current = 0;
    setIsLoadingAudio(true);
    setAudioError(null);
    setAnalyzeError(null);

    try {
      const arrayBuf = await file.arrayBuffer();
      const ctx = ensureAudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));

      const stats = computeAudioStats(decoded);
      setTrackName(file.name);
      setIsDefaultTrack(false);
      setHasCustomAiAnalysis(false);
      setOnlineCheck(null);
      setAudioBuffer(decoded);
      setAudioStats(stats);
      setWaveformPeaks(extractWaveformPeaks(decoded, 168));
      setIsLoadingAudio(false);

      // Run Gemini AI audit + online check if file <= 24MB
      if (file.size <= 24 * 1024 * 1024) {
        const base64 = await fileToBase64(file);
        const mime = file.type || 'audio/mpeg';
        setUploadedFileBase64(base64);
        setUploadedMimeType(mime);
        setActiveTab('diagnostics');
        await runAiAudit(base64, mime, file.name, false, stats);
      } else {
        setUploadedFileBase64(null);
        void runOnlineCheck(stats);
        setAnalyzeError(
          lang === 'si'
            ? 'ගොනුව 24MB ට වඩා විශාල නිසා Audio Mastering සහ Online Loudness පරීක්ෂාව සක්‍රීය විය (සම්පූර්ණ Audio AI විශ්ලේෂණය සඳහා 24MB ට අඩු MP3/WAV දමන්න).'
            : 'File exceeds 24MB upload limit; real-time EQ/Mastering, WAV export, and online loudness check remain active.'
        );
      }
    } catch (err: unknown) {
      setAudioError(err instanceof Error ? err.message : 'Could not decode uploaded audio file.');
      setIsLoadingAudio(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportWav = async () => {
    if (!audioBuffer || isExporting) return;
    setIsExporting(true);
    try {
      const blob = await exportMasteredWav(audioBuffer, params, isBypassed);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cleanBase = trackName.replace(/\.[^.]+$/, '');
      a.href = url;
      a.download = `${cleanBase}_${isBypassed ? 'original' : 'fixed_master'}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectPreset = (preset: MasteringPreset) => {
    setParams({ ...preset.params });
    setActivePresetId(preset.id);
    if (preset.id === 'flat-bypass') {
      setAppliedFixes({});
    } else {
      setIsBypassed(false);
    }
  };

  const handleApplyRecommended = () => {
    const target = analysis.recommendedEq || RECOMMENDED_REMIX_PARAMS;
    setParams({ ...target });
    setActivePresetId(isDefaultTrack && !hasCustomAiAnalysis ? 'recommended-fix' : 'custom-ai');
    setIsBypassed(false);
    const map: Record<number, boolean> = {};
    analysis.audioIssues.forEach((_, idx) => {
      map[idx] = true;
    });
    setAppliedFixes(map);
  };

  const handleResetFlat = () => {
    setParams({ ...FLAT_PARAMS });
    setActivePresetId('flat-bypass');
    setAppliedFixes({});
  };

  const handleApplyIssueFix = (idx: number, patch?: Partial<MasteringParams>) => {
    setIsBypassed(false);
    setAppliedFixes((prev) => ({ ...prev, [idx]: true }));
    if (patch && Object.keys(patch).length > 0) {
      setParams((prev) => ({ ...prev, ...patch }));
      setActivePresetId('custom-manual');
    } else {
      handleApplyRecommended();
    }
  };

  const navItems: Array<{ id: WorkspaceTab; labelSi: string; labelEn: string }> = [
    { id: 'studio', labelSi: 'Mastering Studio', labelEn: 'Mastering Studio' },
    { id: 'diagnostics', labelSi: 'අඩුපාඩු විශ්ලේෂණය', labelEn: 'Diagnostics' },
    { id: 'lyrics', labelSi: 'පද රචනා (Lyrics)', labelEn: 'Lyrics & Flow' },
    { id: 'presets', labelSi: 'Presets', labelEn: 'Presets' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Hidden File Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Navigation Bar — Strictly 3 Zones */}
      <header className="border-b border-slate-800 bg-[#0B0F17]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('studio');
            }}
            className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
          >
            Swara Studio
          </a>

          {/* Zone 2: 4 single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    isActive
                      ? 'text-amber-400 border-amber-400'
                      : 'text-slate-400 border-transparent hover:text-slate-100'
                  }`}
                >
                  {lang === 'si' ? item.labelSi : item.labelEn}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              {lang === 'si' ? 'වෙනත් ගීතයක් දාන්න' : 'Upload Song'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center gap-1 p-1 bg-[#111722] border border-slate-800 rounded-lg overflow-x-auto">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'si' ? item.labelSi : item.labelEn}
              </button>
            );
          })}
        </div>

        {/* Workspace Transport & A/B Toolbar */}
        <section className="bg-[#111722] border border-slate-800 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Track Title & Unboxed Measured Audio Telemetry */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-base sm:text-lg font-semibold text-slate-100 truncate">
                {trackName}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 font-mono tabular-nums">
              <span>
                {audioStats ? formatTimecode(audioStats.durationSec) : '--:--'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {audioStats ? `${(audioStats.sampleRate / 1000).toFixed(1)} kHz` : '-- kHz'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {audioStats ? (audioStats.channels >= 2 ? 'Stereo' : 'Mono') : '--'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Peak {audioStats ? `${audioStats.peakDbfs} dBFS` : '--'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                RMS {audioStats ? `${audioStats.rmsDbfs} dBFS` : '--'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Crest {audioStats ? `${audioStats.crestFactorDb} dB` : '--'}
              </span>
            </div>
          </div>

          {/* Transport, A/B Switch, Language Toggle & Export WAV */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={togglePlayPause}
              disabled={!audioBuffer || isLoadingAudio}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-white text-slate-950 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {isLoadingAudio ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              {isLoadingAudio
                ? lang === 'si'
                  ? 'පූරණය වෙමින්...'
                  : 'Loading...'
                : isPlaying
                  ? lang === 'si'
                    ? 'නවතන්න'
                    : 'Pause'
                  : lang === 'si'
                    ? 'අසන්න (Play)'
                    : 'Play Track'}
            </button>

            {/* Instant A/B Comparison Segmented Switch */}
            <div className="flex items-center p-1 bg-[#0B0F17] border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setIsBypassed(true)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isBypassed
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'si' ? 'A: මුල් ගීතය' : 'A: Original'}
              </button>
              <button
                type="button"
                onClick={() => setIsBypassed(false)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  !isBypassed
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'si' ? 'B: හැදූ ගීතය (Fixed)' : 'B: Fixed Master'}
              </button>
            </div>

            {/* Language Switch */}
            <div className="flex items-center p-1 bg-[#0B0F17] border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setLang('si')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  lang === 'si' ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                සිංහල
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  lang === 'en' ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
            </div>

            {/* Online AI Check Button */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('diagnostics');
                void runAiAudit(undefined, undefined, undefined, isDefaultTrack);
              }}
              disabled={!audioBuffer || isAnalyzing || isCheckingOnline}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700 hover:border-amber-500 text-slate-200 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {isAnalyzing || isCheckingOnline ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-amber-400" />
              )}
              {isAnalyzing || isCheckingOnline
                ? lang === 'si'
                  ? 'Online Check වෙමින්...'
                  : 'Checking Online...'
                : lang === 'si'
                  ? 'Online AI Check'
                  : 'Online AI Check'}
            </button>

            {/* Export Mastered WAV */}
            <button
              type="button"
              onClick={handleExportWav}
              disabled={!audioBuffer || isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isExporting
                ? lang === 'si'
                  ? 'සකසමින්...'
                  : 'Rendering...'
                : lang === 'si'
                  ? 'හැදූ WAV ගන්න'
                  : 'Export WAV'}
            </button>

            <PWAInstallButton lang={lang} />
          </div>
        </section>

        {audioError && (
          <div className="bg-rose-950/40 border border-rose-800/70 rounded-xl p-4 text-sm text-rose-200">
            {audioError}
          </div>
        )}

        {/* Waveform & Live Spectrum Analyzer */}
        <WaveformAndSpectrum
          peaks={waveformPeaks}
          durationSec={audioStats?.durationSec || 0}
          currentTimeSec={currentTimeSec}
          isPlaying={isPlaying}
          isBypassed={isBypassed}
          sections={analysis.sections}
          audioIssues={analysis.audioIssues}
          analyserNode={analyserRef.current}
          gainReductionDb={gainReductionDb}
          lang={lang}
          onSeek={handleSeek}
        />

        {/* Active Tab Workspace */}
        {activeTab === 'studio' && (
          <div className="space-y-6">
            <MasteringConsole
              params={params}
              activePresetId={activePresetId}
              isBypassed={isBypassed}
              lang={lang}
              onChangeParams={(next) => {
                setParams(next);
                setActivePresetId('custom-manual');
              }}
              onSelectPreset={handleSelectPreset}
              onApplyRecommended={handleApplyRecommended}
              onResetFlat={handleResetFlat}
            />

            {/* Quick Diagnostics Strip right below Console */}
            <DiagnosticsPanel
              analysis={analysis}
              lang={lang}
              isAnalyzing={isAnalyzing}
              analyzeError={analyzeError}
              onlineCheck={onlineCheck}
              isCheckingOnline={isCheckingOnline}
              onlineCheckError={onlineCheckError}
              appliedFixes={appliedFixes}
              onJumpToTime={handleJumpAndPlay}
              onApplyIssueFix={handleApplyIssueFix}
              onApplyAllFixes={handleApplyRecommended}
              onRunAiAnalysis={() => runAiAudit(undefined, undefined, undefined, isDefaultTrack)}
            />
          </div>
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticsPanel
            analysis={analysis}
            lang={lang}
            isAnalyzing={isAnalyzing}
            analyzeError={analyzeError}
            onlineCheck={onlineCheck}
            isCheckingOnline={isCheckingOnline}
            onlineCheckError={onlineCheckError}
            appliedFixes={appliedFixes}
            onJumpToTime={handleJumpAndPlay}
            onApplyIssueFix={handleApplyIssueFix}
            onApplyAllFixes={handleApplyRecommended}
            onRunAiAnalysis={() => runAiAudit(undefined, undefined, undefined, isDefaultTrack)}
          />
        )}

        {activeTab === 'lyrics' && <LyricsStudio lang={lang} />}

        {activeTab === 'presets' && (
          <section className="bg-[#111722] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {lang === 'si' ? 'Mastering Presets සැසඳුම' : 'Mastering Presets Matrix'}
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                {lang === 'si'
                  ? 'ගීතයේ ස්වභාවයට ගැළපෙන Preset එක තෝරා A/B වෙනස අසන්න'
                  : 'Select a target curve and compare against Original (A)'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 pr-4 font-medium">Preset</th>
                    <th className="py-2.5 px-3 font-medium text-right">HPF</th>
                    <th className="py-2.5 px-3 font-medium text-right">Mud Cut</th>
                    <th className="py-2.5 px-3 font-medium text-right">Vocal Lift</th>
                    <th className="py-2.5 px-3 font-medium text-right">De-Ess</th>
                    <th className="py-2.5 px-3 font-medium text-right">Comp</th>
                    <th className="py-2.5 px-3 font-medium text-right">Width</th>
                    <th className="py-2.5 pl-4 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {MASTERING_PRESETS.map((preset) => {
                    const isActive = activePresetId === preset.id;
                    return (
                      <tr key={preset.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-slate-100">
                            {lang === 'si' ? preset.nameSi : preset.nameEn}
                          </div>
                          <div className="text-slate-400 mt-0.5 max-w-md">
                            {lang === 'si' ? preset.descriptionSi : preset.descriptionEn}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                          {preset.params.highPassHz} Hz
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                          {preset.params.mudCutDb.toFixed(1)} dB
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                          +{preset.params.presenceGainDb.toFixed(1)} dB
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                          {preset.params.deEssDb.toFixed(1)} dB
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                          {preset.params.compRatio.toFixed(1)}:1
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                          {preset.params.stereoWidth.toFixed(2)}x
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectPreset(preset);
                              setActiveTab('studio');
                            }}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                              isActive
                                ? 'bg-amber-500 text-slate-950 font-semibold'
                                : 'bg-slate-900 border border-slate-700 text-slate-200 hover:border-amber-500'
                            }`}
                          >
                            {isActive
                              ? lang === 'si'
                                ? 'සක්‍රීයයි'
                                : 'Active'
                              : lang === 'si'
                                ? 'යොදන්න'
                                : 'Load'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
      <OfflineIndicator lang={lang} />
    </div>
  );
}
