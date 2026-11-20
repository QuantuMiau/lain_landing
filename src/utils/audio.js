// Procedural electrical hum (no audio file needed) + UI click blips.
// Never autoplays: only starts from an explicit user toggle.
// TODO(asset): drop a real recording at /public/assets/audio/hum.mp3 and set USE_FILE = true.
const USE_FILE = false;

let ctx = null;
let master = null;
let fileEl = null;
let on = false;

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  if (USE_FILE) {
    fileEl = new Audio('/assets/audio/hum.mp3');
    fileEl.loop = true;
    ctx.createMediaElementSource(fileEl).connect(master);
    return;
  }

  // mains hum: 50 Hz fundamental + odd/even harmonics through a lowpass
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  lp.connect(master);
  [[50, 0.5, 'sine'], [100, 0.32, 'sawtooth'], [150, 0.12, 'sawtooth'], [250, 0.05, 'square']].forEach(([f, g, type]) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const og = ctx.createGain();
    og.gain.value = g * 0.18;
    o.connect(og).connect(lp);
    o.start();
  });

  // high, airy line noise with a slow wobble
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3200;
  bp.Q.value = 0.8;
  const ng = ctx.createGain();
  ng.gain.value = 0.012;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.13;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.008;
  lfo.connect(lfoG).connect(ng.gain);
  noise.connect(bp).connect(ng).connect(master);
  noise.start();
  lfo.start();
}

export function isSoundOn() { return on; }

/**
 * Must run inside a user gesture (keydown / pointerdown): creates and resumes
 * the AudioContext silently so sound can fade in later without another click.
 */
export function primeAudio() {
  if (!ctx) build();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

/** Try to start audio without a gesture (allowed on some browsers / sites). */
export async function canAutoplay() {
  if (!ctx) build();
  if (ctx.state === 'running') return true;
  await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 250))]);
  return ctx.state === 'running';
}

export async function setSound(next) {
  if (!ctx) build();
  on = next;
  if (ctx.state === 'suspended') await ctx.resume();
  if (fileEl) on ? fileEl.play().catch(() => {}) : fileEl.pause();
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, on ? 0.9 : 0.35);
  window.dispatchEvent(new CustomEvent('lain:sound', { detail: on }));
}

/** Tiny terminal click. Only audible when sound is on. */
export function click(freq = 1900) {
  if (!on || !ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.025, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.04);
}
