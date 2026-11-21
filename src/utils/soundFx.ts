let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playTone(
  freq: number,
  durationSec: number,
  opts: { type?: OscillatorType; gain?: number; delaySec?: number; endFreq?: number } = {},
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + (opts.delaySec ?? 0);
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = opts.type ?? 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  if (opts.endFreq) {
    osc.frequency.exponentialRampToValueAtTime(opts.endFreq, now + durationSec);
  }
  const peak = opts.gain ?? 0.08;
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(peak, now + 0.012);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export function playRollTick(stepRatio: number, enabled: boolean): void {
  if (!enabled) return;
  const freq = 340 + stepRatio * 420;
  playTone(freq, 0.045, { type: 'sine', gain: 0.035 });
}

export function playRankFanfare(rank: 'SS' | 'S' | 'A' | 'B' | 'C' | 'D', enabled: boolean): void {
  if (!enabled) return;
  if (rank === 'SS' || rank === 'S') {
    // Sparkling major-9th arcade victory arpeggio
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    notes.forEach((f, idx) => {
      playTone(f, 0.34, { type: 'triangle', gain: 0.08, delaySec: idx * 0.055 });
    });
    playTone(130.81, 0.55, { type: 'sine', gain: 0.11, delaySec: 0 });
  } else if (rank === 'A' || rank === 'B') {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, idx) => {
      playTone(f, 0.28, { type: 'triangle', gain: 0.075, delaySec: idx * 0.06 });
    });
  } else {
    // Dramatic cyber bass thud + tension chime
    playTone(146.83, 0.42, { type: 'sawtooth', gain: 0.055, endFreq: 73.42 });
    playTone(293.66, 0.28, { type: 'triangle', gain: 0.05, delaySec: 0.12 });
  }
}

export function playFixSuccess(enabled: boolean): void {
  if (!enabled) return;
  playTone(587.33, 0.16, { type: 'sine', gain: 0.065 });
  playTone(880, 0.24, { type: 'triangle', gain: 0.07, delaySec: 0.08 });
}

export function playDisasterSound(
  kind: 'earthquake' | 'typhoon' | 'shield',
  enabled: boolean,
): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (kind === 'shield') {
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((f, idx) => {
      playTone(f, 0.55, { type: 'sine', gain: 0.06, delaySec: idx * 0.04 });
    });
    return;
  }

  // Create filtered white-noise buffer for seismic rumble or typhoon wind
  const durationSec = kind === 'earthquake' ? 2.1 : 2.4;
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(sampleRate * durationSec), sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  if (kind === 'earthquake') {
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);
    filter.frequency.exponentialRampToValueAtTime(55, now + durationSec);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    // Sub-bass quake throb + structural crack
    playTone(68, 1.4, { type: 'sawtooth', gain: 0.09, endFreq: 32 });
    playTone(190, 0.24, { type: 'square', gain: 0.055, delaySec: 0.35, endFreq: 72 });
    playTone(150, 0.28, { type: 'square', gain: 0.05, delaySec: 0.78, endFreq: 55 });
  } else {
    // Typhoon howling wind sweep + thunderclap
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.2, now);
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.exponentialRampToValueAtTime(980, now + 0.9);
    filter.frequency.exponentialRampToValueAtTime(320, now + durationSec);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    playTone(92, 0.7, { type: 'sawtooth', gain: 0.075, delaySec: 0.2, endFreq: 42 });
  }

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + durationSec + 0.05);
}
