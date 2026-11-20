import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setSound, isSoundOn } from '../utils/audio.js';
import { glitchElement } from '../animations/transitions.js';
import { env } from '../utils/reducedMotion.js';

/** Top OS bar: clock, % downloaded, sound + CRT toggles, active layer. */
export function initTopbar() {
  const clock = document.querySelector('.js-clock');
  const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-GB'); };
  tick();
  setInterval(tick, 1000);

  const pct = document.querySelector('.js-progress');
  const bar = document.querySelector('.js-progress-bar');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      pct.textContent = String(Math.round(self.progress * 100)).padStart(3, '0');
      bar.style.transform = `scaleX(${self.progress})`;
    },
  });

  const sound = document.querySelector('.js-sound');
  sound.addEventListener('click', () => setSound(!isSoundOn()));
  window.addEventListener('lain:sound', (e) => {
    sound.setAttribute('aria-pressed', String(e.detail));
    sound.textContent = `[ sound: ${e.detail ? 'on' : 'off'} ]`;
  });

  const crt = document.querySelector('.js-crt');
  let crtOn = true;
  try { crtOn = localStorage.getItem('lain-crt') !== 'off'; } catch { /* storage unavailable */ }
  const applyCrt = () => {
    document.documentElement.classList.toggle('crt-off', !crtOn);
    crt.setAttribute('aria-pressed', String(crtOn));
    crt.textContent = `[ crt: ${crtOn ? 'on' : 'off'} ]`;
  };
  applyCrt();
  crt.addEventListener('click', () => {
    crtOn = !crtOn;
    applyCrt();
    try { localStorage.setItem('lain-crt', crtOn ? 'on' : 'off'); } catch { /* ignore */ }
  });

  const links = [...document.querySelectorAll('.topbar__nav a')];
  return (section) => {
    const id = `#${section.id}`;
    links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
  };
}

/** Animated grain for the global CRT overlay (tiny canvas, ~12 fps). */
export function initCrtNoise() {
  const c = document.querySelector('.crt__noise');
  const g = c.getContext('2d');
  c.width = 384; c.height = 216;
  const img = g.createImageData(c.width, c.height);
  // pre-render a few noise frames once, then just cycle them (no per-frame pixel loop)
  const FRAMES = env.mobile ? 1 : 5;
  const frames = Array.from({ length: FRAMES }, () => {
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    return new ImageData(new Uint8ClampedArray(img.data), c.width, c.height);
  });
  let n = 0;
  g.putImageData(frames[0], 0, 0);
  if (env.reduced || env.mobile) return; // static grain on phones: no full-screen repaint
  let last = 0;
  gsap.ticker.add((t) => {
    if (t - last < 0.1 || document.hidden || document.documentElement.classList.contains('crt-off')) return;
    last = t;
    n = (n + 1 + Math.floor(Math.random() * (FRAMES - 1))) % FRAMES;
    g.putImageData(frames[n], 0, 0);
  });
}

/** Type "lain" anywhere: the page glitches for 2 s and asks who you are. */
export function initEasterEgg() {
  let buf = '';
  const who = document.querySelector('.who');
  window.addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-4);
    if (buf !== 'lain') return;
    buf = '';
    const html = document.documentElement;
    html.classList.add('is-who');
    gsap.timeline({ onComplete: () => html.classList.remove('is-who') })
      .to(who, { opacity: 1, duration: env.reduced ? 0.3 : 0.08 })
      .add(() => glitchElement(who.querySelector('p'), { strength: 1.4, duration: 0.6 }), 0)
      .to(who, { opacity: 0, duration: 0.4 }, 2);
  });
}
