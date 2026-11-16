// Neon Swarm — synthesized sound.
// Every effect is built with the Web Audio API at runtime: no audio files, no
// network. The context is created lazily on the first user gesture, as browsers
// require, and a tiny step sequencer plays a bass + arpeggio loop while playing.

let ctx = null;
let master = null;
let musicGain = null;
let muted = false;
let musicTimer = null;
let stepIndex = 0;

function ensureContext() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  ctx = new AudioContextClass();
  master = ctx.createGain();
  master.gain.value = 0.4;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.16;
  musicGain.connect(master);
  return ctx;
}

export function unlockAudio() {
  ensureContext();
}

export function setMuted(value) {
  muted = value;
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.4, ctx.currentTime, 0.02);
}

export function isMuted() {
  return muted;
}

// A short oscillator blip with a pitch slide and an exponential decay.
function blip({ type = 'sine', from = 440, to = null, duration = 0.12, volume = 0.5, delay = 0 }) {
  if (muted) return;
  const ac = ensureContext();
  if (!ac || !master) return;
  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

// Filtered noise burst, for explosions and impacts.
function noise({ duration = 0.25, volume = 0.5, frequency = 1200, delay = 0 }) {
  if (muted) return;
  const ac = ensureContext();
  if (!ac || !master) return;
  const start = ac.currentTime + delay;
  const length = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(frequency, start);
  filter.frequency.exponentialRampToValueAtTime(120, start + duration);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(start);
}

export const sfx = {
  shoot() {
    blip({ type: 'square', from: 880, to: 520, duration: 0.06, volume: 0.08 });
  },
  hit() {
    blip({ type: 'triangle', from: 300, to: 180, duration: 0.05, volume: 0.12 });
  },
  explosion(big = false) {
    noise({ duration: big ? 0.5 : 0.22, volume: big ? 0.6 : 0.3, frequency: big ? 900 : 1600 });
    blip({ type: 'sine', from: big ? 160 : 220, to: 40, duration: big ? 0.4 : 0.18, volume: 0.4 });
  },
  pickup() {
    blip({ type: 'sine', from: 660, to: 990, duration: 0.09, volume: 0.16 });
  },
  levelUp() {
    blip({ type: 'triangle', from: 523, duration: 0.12, volume: 0.25 });
    blip({ type: 'triangle', from: 659, duration: 0.12, volume: 0.25, delay: 0.09 });
    blip({ type: 'triangle', from: 784, duration: 0.2, volume: 0.28, delay: 0.18 });
  },
  dash() {
    noise({ duration: 0.14, volume: 0.18, frequency: 3200 });
  },
  hurt() {
    blip({ type: 'sawtooth', from: 220, to: 90, duration: 0.22, volume: 0.35 });
  },
  boss() {
    blip({ type: 'sawtooth', from: 110, to: 55, duration: 0.7, volume: 0.4 });
    blip({ type: 'sawtooth', from: 165, to: 82, duration: 0.7, volume: 0.25, delay: 0.1 });
  },
  waveClear() {
    blip({ type: 'triangle', from: 392, duration: 0.1, volume: 0.2 });
    blip({ type: 'triangle', from: 523, duration: 0.16, volume: 0.22, delay: 0.08 });
  },
  gameOver() {
    blip({ type: 'triangle', from: 392, to: 370, duration: 0.3, volume: 0.3 });
    blip({ type: 'triangle', from: 311, to: 294, duration: 0.3, volume: 0.3, delay: 0.28 });
    blip({ type: 'triangle', from: 233, to: 220, duration: 0.5, volume: 0.3, delay: 0.56 });
  },
  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((note, i) => blip({ type: 'triangle', from: note, duration: 0.22, volume: 0.26, delay: i * 0.13 }));
  },
  click() {
    blip({ type: 'sine', from: 740, to: 660, duration: 0.05, volume: 0.14 });
  },
};

// --- Music: a 16-step loop, A minor, bass on the beat and a sparse arp. ---

const BASS_LINE = [110, 0, 110, 0, 130.81, 0, 130.81, 0, 98, 0, 98, 0, 146.83, 0, 146.83, 0];
const ARP_NOTES = [440, 523.25, 659.25, 880, 659.25, 523.25, 587.33, 698.46];

function musicStep() {
  if (muted || !ctx || !musicGain) return;
  const now = ctx.currentTime;
  const bass = BASS_LINE[stepIndex % 16];
  if (bass > 0) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = bass;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }
  if (stepIndex % 2 === 0) {
    const note = ARP_NOTES[(stepIndex / 2) % ARP_NOTES.length];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note;
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }
  stepIndex++;
}

export function startMusic() {
  if (musicTimer !== null) return;
  if (!ensureContext()) return;
  stepIndex = 0;
  musicTimer = window.setInterval(musicStep, 150);
}

export function stopMusic() {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}
