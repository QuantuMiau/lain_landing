// Procedural electrical hum (no audio file needed) + UI click blips.
// Never autoplays: only starts from an explicit user toggle.
// TODO(asset): drop a real recording at /public/assets/audio/hum.mp3 and set USE_FILE = true.
const USE_FILE = false;

let ctx = null;
let master = null;
let fileEl = null;
let on = false;

// reactive "wired" layer: nodes are filled in build(), driven by setWiredDepth()
const W = {};
let wiredP = 0;
let wiredActive = false;
let lastApply = 0;
let trailing = 0;
let wiredCalm = false; // scrolled past the section: keep the Wired sound, drop the closing static

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
  const humGain = ctx.createGain();
  lp.connect(humGain).connect(master);
  W.lp = lp;
  W.humGain = humGain;
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
  W.lfoG = lfoG;
  noise.connect(bp).connect(ng).connect(master);
  noise.start();
  lfo.start();
  W.bp = bp;
  W.ng = ng;
  W.noiseBuf = buf;

  buildWired();
  applyWired(true);
}

/** Layers that only exist "inside the Wired": drone pad, sub, shimmer and a crossing riser. */
function buildWired() {
  // pad: detuned saws (open fifth stack) through a slowly breathing lowpass
  const padLp = ctx.createBiquadFilter();
  padLp.type = 'lowpass';
  padLp.frequency.value = 300;
  padLp.Q.value = 6;
  const padG = ctx.createGain();
  padG.gain.value = 0;
  padLp.connect(padG).connect(master);
  [[110, -7], [110, 6], [164.8, -5], [220, 4], [329.6, -9]].forEach(([f, det]) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = det;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    o.connect(g).connect(padLp);
    o.start();
  });
  const breathe = ctx.createOscillator();
  breathe.frequency.value = 0.07;
  const breatheG = ctx.createGain();
  breatheG.gain.value = 180;
  breathe.connect(breatheG).connect(padLp.frequency);
  breathe.start();
  W.padLp = padLp;
  W.padG = padG;

  // sub: felt more than heard
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 41;
  const subG = ctx.createGain();
  subG.gain.value = 0;
  sub.connect(subG).connect(master);
  sub.start();
  W.subG = subG;

  // shimmer: glassy high partials with tremolo, like data crystallising
  const shG = ctx.createGain();
  shG.gain.value = 0;
  const trem = ctx.createGain();
  trem.gain.value = 0.5;
  shG.connect(master);
  [1760, 2349.3, 3136].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0.02;
    const t = ctx.createOscillator();
    t.frequency.value = 0.21 + i * 0.17;
    const tg = ctx.createGain();
    tg.gain.value = 0.02;
    t.connect(tg).connect(g.gain);
    o.connect(g).connect(shG);
    o.start();
    t.start();
  });
  W.shG = shG;
}

const ss = (x, a, b) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function applyWired(immediate = false) {
  if (!ctx || !W.padG) return;
  const p = wiredActive ? wiredP : 0;
  const t = ctx.currentTime;
  const k = immediate ? 0.01 : 0.18; // smoothing time constant
  // clear the old automation first: stacking ~12 setTargetAtTime events per frame slows the audio thread
  const set = (param, v, tc = k) => {
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.setTargetAtTime(v, t, tc);
  };

  const cross = ss(p, 0.24, 0.3) * (1 - ss(p, 0.3, 0.45)); // bell around the crossing
  const wired = ss(p, 0.27, 0.45); // reality fades out as the drone takes over
  const enter = ss(p, 0.25, 0.34); // the drone comes in at the change, just before "everyone's connected"
  const grow = 0.3 + 0.7 * ss(p, 0.3, 1); // from there it only gets louder, never higher
  const deep = ss(p, 0.82, 1) * (wiredCalm ? 0.2 : 1); // closing in on the screen
  const out = wiredActive ? 1 : 0;
  const late = 1 - 0.2 * ss(p, 0.82, 1); // 20% quieter once you are through the computer

  // reality hum gets muffled and is gone before the drone arrives
  set(W.humGain.gain, 1 - wired, 0.25);
  set(W.lp.frequency, 520 - 330 * ss(p, 0.2, 0.5));

  set(W.padG.gain, 0.9 * enter * grow * late * out, wiredActive ? 0.6 : 1.2);
  set(W.padLp.frequency, 300 + 500 * ss(p, 0.3, 1)); // timbre stays dark and steady
  set(W.subG.gain, 0.22 * enter * grow * late * out, 0.5);
  set(W.shG.gain, 0.7 * ss(p, 0.45, 0.7) * grow * late * out, 0.5);

  set(W.lfoG.gain, 0.008 * (1 - wired), 0.25);
  set(W.ng.gain, 0.012 * (1 - wired) + 0.014 * cross + 0.026 * deep * late * out, 0.15);
  set(W.bp.frequency, 3200, 0.2); // no sweep: nothing rises in pitch
}

/**
 * Scroll-driven soundscape for the Wired section.
 * p = 0..1 scroll progress, active = whether the section is on screen.
 */
export function setWiredDepth(p, active = true, calm = false) {
  const same = active === wiredActive && calm === wiredCalm;
  if (same && Math.abs(p - wiredP) < 0.004) return; // ignore tiny scroll steps
  wiredP = p;
  wiredActive = active;
  wiredCalm = calm;
  const now = performance.now();
  if (same && now - lastApply < 50) { // at most ~20 updates per second; make sure the last one still lands
    clearTimeout(trailing);
    trailing = setTimeout(() => { lastApply = performance.now(); applyWired(); }, 60);
    return;
  }
  clearTimeout(trailing);
  lastApply = now;
  applyWired();
}

/** Short digital tear: filtered noise burst + falling blip. Used on state changes. */
export function glitchBurst(intensity = 1) {
  if (!on || !ctx || !W.noiseBuf) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = W.noiseBuf;
  src.loopStart = Math.random();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(800 + Math.random() * 5000, t);
  bp.frequency.exponentialRampToValueAtTime(300 + Math.random() * 1500, t + 0.3);
  bp.Q.value = 2.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.05 * intensity, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  src.connect(bp).connect(g).connect(ctx.destination);
  src.start(t, Math.random());
  src.stop(t + 0.4);

  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.setValueAtTime(1400, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.25);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.02 * intensity, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(og).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.3);
}

export function isSoundOn() { return on; }

// Mobile browsers only count touchend / click / pointerup as an audio-unlocking gesture
// (pointerdown and touchstart are not enough, and scrolling never is), so keep trying to
// resume the context on every such event until it is running.
// A tiny looping silent <audio> also moves iOS to the "playback" session so the ringer switch doesn't mute us.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
let silentEl = null;
function unlock() {
  if (!ctx) build();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  if (!silentEl) {
    silentEl = new Audio(SILENT_WAV);
    silentEl.loop = true;
    silentEl.setAttribute('playsinline', '');
  }
  silentEl.play().catch(() => {});
  if (ctx.state === 'running') {
    ['pointerup', 'touchend', 'click', 'keydown'].forEach((t) => window.removeEventListener(t, unlock, true));
  }
}
['pointerup', 'touchend', 'click', 'keydown'].forEach((t) => window.addEventListener(t, unlock, { capture: true, passive: true }));

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
  master.gain.setTargetAtTime(on ? 0.65 : 0, ctx.currentTime, on ? 0.9 : 0.35);
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
  g.gain.setValueAtTime(0.078, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.06);
}

/** Rising modem-like sweep + data chirps while the CTA "connects". Only audible when sound is on. */
export function connectSweep(seconds = 2.6) {
  if (!on || !ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(1800, t + seconds);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(400, t);
  lp.frequency.exponentialRampToValueAtTime(4000, t + seconds);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + seconds * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.1);
  o.connect(lp).connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + seconds + 0.15);
  // chirps on every progress step
  for (let i = 0; i < 12; i++) {
    const at = (seconds * i) / 12;
    setTimeout(() => click(900 + i * 140), at * 1000);
  }
}
