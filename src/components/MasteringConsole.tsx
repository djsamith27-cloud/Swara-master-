import React, { useMemo } from 'react';
import { RotateCcw, Sliders, Wand2 } from 'lucide-react';
import { LanguageMode, MasteringParams, MasteringPreset } from '../types/studio';
import { MASTERING_PRESETS } from '../data/defaultTrackData';

interface MasteringConsoleProps {
  params: MasteringParams;
  activePresetId: string;
  isBypassed: boolean;
  lang: LanguageMode;
  onChangeParams: (next: MasteringParams) => void;
  onSelectPreset: (preset: MasteringPreset) => void;
  onApplyRecommended: () => void;
  onResetFlat: () => void;
}

interface SliderRowProps {
  label: string;
  hint: string;
  valueDisplay: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  hint,
  valueDisplay,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}) => (
  <div className="py-2.5 flex flex-col gap-1.5">
    <div className="flex items-baseline justify-between gap-4">
      <div className="min-w-0">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <span className="ml-2 text-xs text-slate-500">{hint}</span>
      </div>
      <span className="font-mono text-xs font-medium text-amber-400 tabular-nums shrink-0">
        {valueDisplay}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="studio-slider w-full disabled:opacity-40"
    />
  </div>
);

export const MasteringConsole: React.FC<MasteringConsoleProps> = ({
  params,
  activePresetId,
  isBypassed,
  lang,
  onChangeParams,
  onSelectPreset,
  onApplyRecommended,
  onResetFlat,
}) => {
  const updateField = <K extends keyof MasteringParams>(key: K, value: MasteringParams[K]) => {
    onChangeParams({ ...params, [key]: value });
  };

  // Compute an approximate EQ frequency response curve (20Hz -> 20kHz) for visual clarity
  const eqPath = useMemo(() => {
    const width = 560;
    const height = 100;
    const midY = height / 2;
    const points: string[] = [];
    const numPoints = 72;

    const bellResponse = (freq: number, center: number, gainDb: number, q: number) => {
      const octaves = Math.log2(freq / center);
      const sigma = 0.65 / q;
      return gainDb * Math.exp(-(octaves * octaves) / (2 * sigma * sigma));
    };

    const shelfResponse = (freq: number, cutoff: number, gainDb: number, isHigh: boolean) => {
      const ratio = isHigh ? freq / cutoff : cutoff / freq;
      const t = 1 / (1 + Math.pow(Math.max(0.01, ratio), -2.2));
      return gainDb * t;
    };

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const freq = 20 * Math.pow(1000, t); // 20Hz to 20kHz log scale
      let totalDb = 0;

      // High-pass rolloff
      if (freq < params.highPassHz * 1.4) {
        const ratio = freq / Math.max(20, params.highPassHz);
        if (ratio < 1) {
          totalDb -= Math.min(12, 12 * Math.pow(1 - ratio, 1.5));
        }
      }

      totalDb += shelfResponse(freq, 90, params.lowGainDb, false);
      totalDb += bellResponse(freq, params.mudFreqHz, params.mudCutDb, 1.4);
      totalDb += bellResponse(freq, params.presenceFreqHz, params.presenceGainDb, 1.2);
      totalDb += bellResponse(freq, 6800, params.deEssDb, 2.2);
      totalDb += shelfResponse(freq, 11000, params.airGainDb, true);

      const clampedDb = Math.max(-9, Math.min(9, totalDb));
      const x = (t * width).toFixed(1);
      const y = (midY - (clampedDb / 9) * (midY - 8)).toFixed(1);
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }

    return points.join(' ');
  }, [params]);

  return (
    <div className="space-y-6">
      {/* Preset Bar */}
      <div className="bg-[#111722] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {MASTERING_PRESETS.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors border ${
                  active
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                {lang === 'si' ? preset.nameSi : preset.nameEn}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onApplyRecommended}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {lang === 'si' ? 'නිර්දේශිත Fix යොදන්න' : 'Apply Recommended Fix'}
          </button>
          <button
            type="button"
            onClick={onResetFlat}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {lang === 'si' ? 'Reset' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Main 2-Column Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Parametric Repair EQ */}
        <div className="lg:col-span-7 bg-[#111722] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {lang === 'si'
                    ? 'Parametric EQ සහ ශබ්ද පැහැදිලි කිරීම'
                    : 'Parametric Repair EQ'}
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                {isBypassed
                  ? lang === 'si'
                    ? 'Bypass කර ඇත (Original)'
                    : 'Bypassed (Original A)'
                  : lang === 'si'
                    ? 'සක්‍රීයයි (Fixed)'
                    : 'Active (Fixed B)'}
              </span>
            </div>

            {/* Visual EQ Curve */}
            <div className="my-4 bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3">
              <svg viewBox="0 0 560 100" className="w-full h-24 overflow-visible">
                <line x1="0" y1="50" x2="560" y2="50" stroke="rgba(148,163,184,0.2)" strokeDasharray="4 4" />
                <line x1="186" y1="0" x2="186" y2="100" stroke="rgba(148,163,184,0.08)" />
                <line x1="372" y1="0" x2="372" y2="100" stroke="rgba(148,163,184,0.08)" />
                <path
                  d={eqPath}
                  fill="none"
                  stroke={isBypassed ? '#64748b' : '#f59e0b'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1">
                <span>20 Hz</span>
                <span>250 Hz (Mud)</span>
                <span>3.2 kHz (Vocal)</span>
                <span>6.8 kHz (De-Ess)</span>
                <span>20 kHz</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/70">
              <SliderRow
                label={lang === 'si' ? 'Sub-Tight High-Pass' : 'Sub-Tight High-Pass'}
                hint={lang === 'si' ? 'අනවශ්‍ය Sub රවුම් ගතිය ඉවත් කරයි' : 'Clears sub-sonic rumble'}
                valueDisplay={`${params.highPassHz} Hz`}
                value={params.highPassHz}
                min={20}
                max={90}
                step={2}
                onChange={(v) => updateField('highPassHz', v)}
              />
              <SliderRow
                label={lang === 'si' ? '808 / Bass මට්ටම (90 Hz)' : 'Sub / 808 Warmth (90 Hz)'}
                hint={lang === 'si' ? 'Kick සහ Bass බර පාලනය' : 'Controls low-end weight'}
                valueDisplay={`${params.lowGainDb >= 0 ? '+' : ''}${params.lowGainDb.toFixed(1)} dB`}
                value={params.lowGainDb}
                min={-6}
                max={6}
                step={0.2}
                onChange={(v) => updateField('lowGainDb', v)}
              />
              <SliderRow
                label={lang === 'si' ? `Mud Cut (${params.mudFreqHz} Hz)` : `Mud Cut (${params.mudFreqHz} Hz)`}
                hint={lang === 'si' ? 'Rap හඬ බොඳ කරන මඩ ගතිය අඩු කරයි' : 'Separates vocal from 808 mud'}
                valueDisplay={`${params.mudCutDb >= 0 ? '+' : ''}${params.mudCutDb.toFixed(1)} dB`}
                value={params.mudCutDb}
                min={-6}
                max={4}
                step={0.2}
                onChange={(v) => updateField('mudCutDb', v)}
              />
              <SliderRow
                label={
                  lang === 'si'
                    ? `Vocal Clarity (${(params.presenceFreqHz / 1000).toFixed(1)} kHz)`
                    : `Vocal Presence (${(params.presenceFreqHz / 1000).toFixed(1)} kHz)`
                }
                hint={lang === 'si' ? 'කාන්තා හා පිරිමි හඬ ඉදිරියට ගනී' : 'Brings vocals forward over synth pads'}
                valueDisplay={`${params.presenceGainDb >= 0 ? '+' : ''}${params.presenceGainDb.toFixed(1)} dB`}
                value={params.presenceGainDb}
                min={-4}
                max={6}
                step={0.2}
                onChange={(v) => updateField('presenceGainDb', v)}
              />
              <SliderRow
                label={lang === 'si' ? 'De-Esser / Hi-Hat මෘදු කිරීම (6.8 kHz)' : 'De-Esser / Hi-Hat Control (6.8 kHz)'}
                hint={lang === 'si' ? '"ස/ශ" සහ Hi-hat තියුණු ගතිය අඩු කරයි' : 'Smooths harsh sibilance & trap hats'}
                valueDisplay={`${params.deEssDb >= 0 ? '+' : ''}${params.deEssDb.toFixed(1)} dB`}
                value={params.deEssDb}
                min={-6}
                max={3}
                step={0.2}
                onChange={(v) => updateField('deEssDb', v)}
              />
              <SliderRow
                label={lang === 'si' ? 'Studio Air & Sheen (11 kHz)' : 'Studio Air & Sheen (11 kHz)'}
                hint={lang === 'si' ? 'පැහැදිලි Studio නිමාවක් එක් කරයි' : 'Adds crisp high-frequency openness'}
                valueDisplay={`${params.airGainDb >= 0 ? '+' : ''}${params.airGainDb.toFixed(1)} dB`}
                value={params.airGainDb}
                min={-4}
                max={6}
                step={0.2}
                onChange={(v) => updateField('airGainDb', v)}
              />
            </div>
          </div>
        </div>

        {/* Right: Dynamics, Stereo Width & Output Limiter */}
        <div className="lg:col-span-5 bg-[#111722] border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-6">
          <div>
            <div className="pb-3 border-b border-slate-800/80">
              <h2 className="text-base font-semibold text-slate-100">
                {lang === 'si'
                  ? 'Dynamics, Stereo සහ Loudness පාලනය'
                  : 'Dynamics, Stereo & Limiter'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'si'
                  ? 'Intro සහ Beat Drop අතර ශබ්ද වෙනස සමබර කර Clipping වළක්වයි.'
                  : 'Balances quiet intros with heavy drops while holding a -0.6 dBFS ceiling.'}
              </p>
            </div>

            <div className="divide-y divide-slate-800/70 mt-2">
              <SliderRow
                label={lang === 'si' ? 'Compressor Threshold' : 'Compressor Threshold'}
                hint={lang === 'si' ? 'ශබ්ද මට්ටම සමබර කරන සීමාව' : 'Catch peaks on beat drops'}
                valueDisplay={`${params.compThresholdDb.toFixed(0)} dB`}
                value={params.compThresholdDb}
                min={-30}
                max={0}
                step={1}
                onChange={(v) => updateField('compThresholdDb', v)}
              />
              <SliderRow
                label={lang === 'si' ? 'Compression Ratio' : 'Compression Ratio'}
                hint={lang === 'si' ? 'සංකෝචන අනුපාතය' : 'Glue & transient control'}
                valueDisplay={`${params.compRatio.toFixed(1)} : 1`}
                value={params.compRatio}
                min={1.0}
                max={8.0}
                step={0.1}
                onChange={(v) => updateField('compRatio', v)}
              />
              <SliderRow
                label={lang === 'si' ? 'Stereo පළල (Mid-Side Width)' : 'Stereo Width (Mid-Side)'}
                hint={lang === 'si' ? 'පසුබිම් සංගීතයේ පළල පාලනය' : '1.00x = original stereo image'}
                valueDisplay={`${params.stereoWidth.toFixed(2)} x`}
                value={params.stereoWidth}
                min={0.6}
                max={1.45}
                step={0.02}
                onChange={(v) => updateField('stereoWidth', v)}
              />
              <SliderRow
                label={lang === 'si' ? 'Output Gain (Limiter ඉදිරියෙන්)' : 'Output Makeup Gain'}
                hint={lang === 'si' ? 'අවසන් ශබ්ද මට්ටම' : 'Feeds -0.6 dBFS safety limiter'}
                valueDisplay={`${params.makeupGainDb >= 0 ? '+' : ''}${params.makeupGainDb.toFixed(1)} dB`}
                value={params.makeupGainDb}
                min={-6}
                max={6}
                step={0.2}
                onChange={(v) => updateField('makeupGainDb', v)}
              />
            </div>
          </div>

          {/* Active Preset Summary */}
          <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {lang === 'si' ? 'Output Ceiling (Limiter)' : 'Safety Limiter Ceiling'}
              </span>
              <span className="font-mono text-emerald-400 tabular-nums">-0.6 dBFS</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {(() => {
                const found = MASTERING_PRESETS.find((p) => p.id === activePresetId);
                if (!found) {
                  return lang === 'si'
                    ? 'ඔබේ අභිරුචි (Custom) EQ සහ Compressor සැකසුම් දැන් සක්‍රීයයි.'
                    : 'Custom manual EQ and dynamics settings are active.';
                }
                return lang === 'si' ? found.descriptionSi : found.descriptionEn;
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
