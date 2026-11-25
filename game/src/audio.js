// Ember Pass Kitchen — every sound is synthesized with WebAudio, no files.
// One job: short named blips (chop, sizzle, ding, alarm) behind one mute flag.

let context = null;
let muted = false;

function audioContext() {
  if (context) return context;
  try {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    context = new AudioContext();
  } catch {
    context = null;
  }
  return context;
}

function tone(freq, seconds, type = 'sine', volume = 0.12, when = 0) {
  if (muted) return;
  const ctx = audioContext();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.02);
}

function noise(seconds, volume = 0.08, when = 0, lowpass = 1200) {
  if (muted) return;
  const ctx = audioContext();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
}

export const sounds = {
  click() { tone(660, 0.06, 'triangle', 0.08); },
  grab() { tone(520, 0.07, 'triangle', 0.1); tone(780, 0.07, 'triangle', 0.08, 0.05); },
  chop() { noise(0.09, 0.16, 0, 2400); },
  chopped() { tone(880, 0.09, 'triangle', 0.1); tone(1174, 0.12, 'triangle', 0.1, 0.07); },
  cook() { noise(0.5, 0.05, 0, 3000); },
  ready() { tone(1046, 0.12, 'sine', 0.12); tone(1318, 0.16, 'sine', 0.12, 0.1); },
  serve() { tone(784, 0.1, 'triangle', 0.12); tone(1046, 0.1, 'triangle', 0.12, 0.08); tone(1318, 0.18, 'triangle', 0.12, 0.16); },
  burnt() { tone(220, 0.25, 'sawtooth', 0.1); tone(165, 0.3, 'sawtooth', 0.1, 0.15); },
  missed() { tone(330, 0.2, 'square', 0.06); tone(247, 0.25, 'square', 0.06, 0.15); },
  alarm() { tone(988, 0.12, 'square', 0.07); },
  win() { [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.2, 'triangle', 0.12, i * 0.12)); },
  lose() { [392, 330, 262].forEach((freq, i) => tone(freq, 0.25, 'triangle', 0.1, i * 0.15)); },
  tick() { tone(1200, 0.04, 'square', 0.05); },
};

/** Flip the mute flag; returns the new state. */
export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}
