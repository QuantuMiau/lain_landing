import { animate, createTimeline } from 'animejs';
import gsap from 'gsap';
import { bootManager } from '../utils/loader.js';
import { primeAudio, canAutoplay, setSound } from '../utils/audio.js';
import { env } from '../utils/reducedMotion.js';

const LINES = [
  ['copland os enterprise  v.9.7.1', 'w'],
  ['(c) tachibana general laboratories', ''],
  ['', ''],
  ['bios date 07/06/98  navi-gate rev.4', ''],
  ['memory test: @MEM', ''],
  ['detecting psyche processor ......... ok', ''],
  ['loading protocol 7 .................. ok', ''],
  ['mounting /usr/lain/layers ........... 13 found', ''],
  ['user: guest   node: 0x3A2F   line: 28.8 kbps', ''],
  ['', ''],
  ['connecting to the wired...', 'p'],
];

/**
 * Typewriter boot log (anime.js). The bar shows the lower of two numbers:
 * real asset progress (three.js LoadingManager) and how far the log has typed,
 * so it fills steadily instead of jumping to 100% when assets are cached.
 * Ends with a "press any key" gate when needed so audio may start on reveal.
 */
export function runBoot() {
  const root = document.getElementById('boot');
  const log = root.querySelector('.boot__log');
  const bar = root.querySelector('.boot__bar i');
  const pct = root.querySelector('.boot__pct');
  const hint = root.querySelector('.boot__hint');
  const screen = root.querySelector('.boot__screen');
  const flash = root.querySelector('.boot__flash');

  // --- user gesture: lets the AudioContext start silently during boot ---
  let gestured = false;
  const onGesture = () => { gestured = true; primeAudio(); };
  const GESTURES = ['keydown', 'pointerup', 'touchend', 'click']; // touchend/click: the ones mobile counts for audio
  GESTURES.forEach((t) => window.addEventListener(t, onGesture, { once: true }));

  // --- progress = min(real loading, typed log) ---
  let real = 0;
  let typed = 0;
  const shown = { v: 0 };
  const render = () => {
    gsap.to(shown, {
      v: Math.min(real, typed), duration: 0.35, ease: 'power2.out', overwrite: true,
      onUpdate: () => {
        bar.style.transform = `scaleX(${shown.v})`;
        pct.textContent = `${String(Math.round(shown.v * 100)).padStart(3, '0')}%`;
      },
    });
  };
  const loadedP = new Promise((resolve) => {
    bootManager.onProgress = (_u, l, t) => { real = t ? l / t : 1; render(); };
    bootManager.onLoad = () => { real = 1; render(); resolve(); };
    bootManager.onError = (u) => console.warn('[boot] failed:', u);
    // safety: never trap the visitor on the boot screen
    setTimeout(() => { real = 1; render(); resolve(); }, 9000);
  });

  // --- typed log ---
  const tl = createTimeline({ autoplay: true, onUpdate: (self) => { typed = self.progress; render(); } });
  const speed = env.reduced ? 0.2 : 0.48;
  LINES.forEach(([text, cls]) => {
    const row = document.createElement('span');
    row.className = cls;
    row.textContent = '';
    log.append(row, '\n');
    if (text.includes('@MEM')) {
      const mem = { k: 0 };
      tl.add(mem, {
        k: 65536,
        duration: 900 * speed + 1,
        ease: 'linear',
        modifier: Math.round,
        onUpdate: () => { row.textContent = text.replace('@MEM', `${String(mem.k).padStart(6, '0')}k`) + (mem.k >= 65536 ? ' ok' : ''); },
      });
      return;
    }
    const o = { n: 0 };
    tl.add(o, {
      n: text.length,
      duration: Math.max(1, text.length * 18 * speed),
      ease: 'linear',
      modifier: Math.round,
      onUpdate: () => { row.textContent = text.slice(0, o.n); },
    }, '+=42');
  });
  const typedP = tl.then(() => { typed = 1; render(); });

  // skip typing on any key / click
  const skip = () => tl.complete();
  window.addEventListener('keydown', skip, { once: true });
  root.addEventListener('pointerdown', skip, { once: true });

  // if the browser still blocks audio, wait for one key/click to "connect"
  const gateP = () => new Promise((resolve) => {
    if (gestured) return resolve();
    canAutoplay().then((ok) => {
      if (ok || gestured) return resolve();
      hint.innerHTML = `&gt; ${env.mobile ? 'tap' : 'press any key or click'} to connect<span class="cursor-block">_</span>`;
      hint.classList.add('is-gate');
      const go = () => { onGesture(); resolve(); };
      GESTURES.forEach((t) => window.addEventListener(t, go, { once: true }));
    });
  });

  return Promise.all([loadedP, typedP]).then(gateP).then(() => new Promise((resolve) => {
    window.removeEventListener('keydown', skip);
    GESTURES.forEach((t) => window.removeEventListener(t, onGesture));
    setSound(true); // fades in as the hero appears
    if (env.reduced) {
      gsap.to(root, { autoAlpha: 0, duration: 0.6, onComplete: () => { root.remove(); resolve(); } });
      return;
    }
    // single flash + CRT power-off collapse revealing the hero
    const out = gsap.timeline({ delay: 0.1, onComplete: () => { root.remove(); resolve(); } });
    out
      .to(flash, { opacity: 0.85, duration: 0.06, ease: 'none' })
      .to(screen, { x: () => gsap.utils.random(-14, 14), skewX: 8, duration: 0.05, repeat: 3, yoyo: true, ease: 'steps(1)' }, '<')
      .to(flash, { opacity: 0, duration: 0.25 })
      .to([screen, flash], { scaleY: 0.004, duration: 0.22, ease: 'power3.in' }, '-=0.1')
      .set(root, { background: 'transparent' })
      .to([screen, flash], { scaleX: 0, duration: 0.18, ease: 'power2.in' })
      .set(flash, { opacity: 1, scaleY: 0.004, scaleX: 1 }, '<')
      .to(flash, { scaleY: 1, opacity: 0, duration: 0.5, ease: 'expo.out' });
  }));
}

/** Small reusable typewriter used by the episode terminal. */
export function typeText(el, text, { duration = 900 } = {}) {
  const o = { n: 0 };
  return animate(o, {
    n: text.length,
    duration: env.reduced ? 1 : duration,
    ease: 'linear',
    modifier: Math.round,
    onUpdate: () => { el.textContent = text.slice(0, o.n); },
  });
}
