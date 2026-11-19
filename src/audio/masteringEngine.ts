import { AudioFileStats, MasteringParams } from '../types/studio';

export function computeAudioStats(buffer: AudioBuffer): AudioFileStats {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  let peak = 0;
  let sumSq = 0;
  let totalSamples = 0;

  // Stride by 2 for fast accurate scanning on long tracks
  const step = length > 1_000_000 ? 2 : 1;

  for (let ch = 0; ch < numChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i += step) {
      const s = data[i];
      const abs = Math.abs(s);
      if (abs > peak) peak = abs;
      sumSq += s * s;
      totalSamples++;
    }
  }

  const rms = Math.sqrt(sumSq / Math.max(1, totalSamples));
  const peakDbfs = peak > 1e-6 ? 20 * Math.log10(peak) : -96;
  const rmsDbfs = rms > 1e-6 ? 20 * Math.log10(rms) : -96;
  const crestFactorDb = Math.max(0, peakDbfs - rmsDbfs);

  return {
    durationSec: buffer.duration,
    sampleRate: buffer.sampleRate,
    channels: numChannels,
    peakDbfs: Number(peakDbfs.toFixed(1)),
    rmsDbfs: Number(rmsDbfs.toFixed(1)),
    crestFactorDb: Number(crestFactorDb.toFixed(1)),
  };
}

export function extractWaveformPeaks(buffer: AudioBuffer, bars = 180): number[] {
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
  const blockSize = Math.max(1, Math.floor(ch0.length / bars));
  const peaks: number[] = [];

  for (let i = 0; i < bars; i++) {
    const start = i * blockSize;
    const end = Math.min(ch0.length, start + blockSize);
    let maxVal = 0;
    const stride = Math.max(1, Math.floor((end - start) / 64));
    for (let j = start; j < end; j += stride) {
      const sample = (Math.abs(ch0[j]) + Math.abs(ch1[j])) * 0.5;
      if (sample > maxVal) maxVal = sample;
    }
    peaks.push(Math.min(1, maxVal));
  }
  return peaks;
}

export interface MasteringGraphNodes {
  input: AudioNode;
  output: AudioNode;
  highPass: BiquadFilterNode;
  lowShelf: BiquadFilterNode;
  mudCut: BiquadFilterNode;
  presence: BiquadFilterNode;
  deEss: BiquadFilterNode;
  airShelf: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  midGain?: GainNode;
  sideGain?: GainNode;
  limiter: DynamicsCompressorNode;
  makeupGain: GainNode;
  updateParams: (params: MasteringParams, immediate?: boolean) => void;
}

export function buildMasteringChain(
  ctx: BaseAudioContext,
  params: MasteringParams,
  channels: number
): MasteringGraphNodes {
  const highPass = ctx.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.Q.value = 0.707;

  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 90;

  const mudCut = ctx.createBiquadFilter();
  mudCut.type = 'peaking';
  mudCut.Q.value = 1.4;

  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.Q.value = 1.2;

  const deEss = ctx.createBiquadFilter();
  deEss.type = 'peaking';
  deEss.frequency.value = 6800;
  deEss.Q.value = 2.2;

  const airShelf = ctx.createBiquadFilter();
  airShelf.type = 'highshelf';
  airShelf.frequency.value = 11000;

  const compressor = ctx.createDynamicsCompressor();
  compressor.knee.value = 6;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.16;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -0.6;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.06;

  const makeupGain = ctx.createGain();

  // Connect serial EQ + Dynamics chain
  highPass.connect(lowShelf);
  lowShelf.connect(mudCut);
  mudCut.connect(presence);
  presence.connect(deEss);
  deEss.connect(airShelf);
  airShelf.connect(compressor);

  let midGain: GainNode | undefined;
  let sideGain: GainNode | undefined;

  if (channels >= 2) {
    // True Mid-Side matrix:
    // M = 0.5*(L+R), S = 0.5*(L-R) -> L_out = M + w*S, R_out = M - w*S
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);

    const lToM = ctx.createGain();
    const rToM = ctx.createGain();
    lToM.gain.value = 0.5;
    rToM.gain.value = 0.5;

    const lToS = ctx.createGain();
    const rToS = ctx.createGain();
    lToS.gain.value = 0.5;
    rToS.gain.value = -0.5;

    midGain = ctx.createGain();
    sideGain = ctx.createGain();
    const sideInvert = ctx.createGain();
    sideInvert.gain.value = -1;

    compressor.connect(splitter);
    splitter.connect(lToM, 0);
    splitter.connect(rToM, 1);
    lToM.connect(midGain);
    rToM.connect(midGain);

    splitter.connect(lToS, 0);
    splitter.connect(rToS, 1);
    lToS.connect(sideGain);
    rToS.connect(sideGain);

    // Recombine to L (channel 0) and R (channel 1)
    midGain.connect(merger, 0, 0);
    midGain.connect(merger, 0, 1);
    sideGain.connect(merger, 0, 0);
    sideGain.connect(sideInvert);
    sideInvert.connect(merger, 0, 1);

    merger.connect(makeupGain);
  } else {
    compressor.connect(makeupGain);
  }

  makeupGain.connect(limiter);

  const updateParams = (next: MasteringParams, immediate = false) => {
    const now = ctx.currentTime;
    const setVal = (param: AudioParam, val: number) => {
      if (immediate) {
        param.value = val;
      } else {
        param.setTargetAtTime(val, now, 0.02);
      }
    };

    setVal(highPass.frequency, Math.max(20, Math.min(120, next.highPassHz)));
    setVal(lowShelf.gain, next.lowGainDb);
    setVal(mudCut.frequency, next.mudFreqHz);
    setVal(mudCut.gain, next.mudCutDb);
    setVal(presence.frequency, next.presenceFreqHz);
    setVal(presence.gain, next.presenceGainDb);
    setVal(deEss.gain, next.deEssDb);
    setVal(airShelf.gain, next.airGainDb);
    setVal(compressor.threshold, next.compThresholdDb);
    setVal(compressor.ratio, next.compRatio);

    if (midGain && sideGain) {
      setVal(midGain.gain, 1.0);
      setVal(sideGain.gain, next.stereoWidth);
    }

    const linearGain = Math.pow(10, next.makeupGainDb / 20);
    setVal(makeupGain.gain, linearGain);
  };

  updateParams(params, true);

  return {
    input: highPass,
    output: limiter,
    highPass,
    lowShelf,
    mudCut,
    presence,
    deEss,
    airShelf,
    compressor,
    midGain,
    sideGain,
    limiter,
    makeupGain,
    updateParams,
  };
}

function encodeWav16Bit(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export async function exportMasteredWav(
  sourceBuffer: AudioBuffer,
  params: MasteringParams,
  isBypassed: boolean
): Promise<Blob> {
  const offlineCtx = new OfflineAudioContext(
    sourceBuffer.numberOfChannels,
    sourceBuffer.length,
    sourceBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = sourceBuffer;

  if (isBypassed) {
    source.connect(offlineCtx.destination);
  } else {
    const chain = buildMasteringChain(offlineCtx, params, sourceBuffer.numberOfChannels);
    source.connect(chain.input);
    chain.output.connect(offlineCtx.destination);
  }

  source.start(0);
  const rendered = await offlineCtx.startRendering();
  return encodeWav16Bit(rendered);
}
