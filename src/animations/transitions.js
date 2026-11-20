import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from '../utils/reducedMotion.js';

let busy = false;
const bars = document.querySelector('.glitch-bars');
const disp = document.querySelector('.gf-disp');
const offR = document.querySelector('.gf-off-r');
const offC = document.querySelector('.gf-off-c');

/** Short RGB split + horizontal strip shift applied to one element. */
export function glitchElement(el, { strength = 1, duration = 0.38 } = {}) {
  if (env.reduced || busy || !el) return;
  busy = true;
  // a few full-width difference bars
  bars.innerHTML = '';
  const n = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const b = document.createElement('i');
    b.style.top = `${Math.random() * 100}%`;
    b.style.height = `${2 + Math.random() * 26}px`;
    bars.appendChild(b);
  }
  el.style.filter = 'url(#glitch-filter)';
  const tl = gsap.timeline({
    onComplete: () => { el.style.filter = ''; bars.innerHTML = ''; busy = false; },
  });
  tl.fromTo(disp, { attr: { scale: 60 * strength } }, { attr: { scale: 0 }, duration, ease: 'steps(5)' }, 0)
    .fromTo(offR, { attr: { dx: 9 * strength } }, { attr: { dx: 0 }, duration, ease: 'power2.out' }, 0)
    .fromTo(offC, { attr: { dx: -9 * strength } }, { attr: { dx: 0 }, duration, ease: 'power2.out' }, 0)
    .fromTo(bars.children, { opacity: 0.9, x: () => gsap.utils.random(-60, 60) }, { opacity: 0, duration: duration * 0.8, ease: 'steps(3)' }, 0);
  return tl;
}

/**
 * Tracks the active layer for the top bar. Only the 3D section reacts to entering
 * (its own post-processing glitch); the rest scroll normally with no distortion.
 */
export function initSectionGlitches({ onLayer, webglFor } = {}) {
  document.querySelectorAll('[data-layer]').forEach((sec) => {
    const fire = () => {
      onLayer?.(sec);
      const scene = webglFor?.(sec);
      if (scene) {
        if (env.reduced) return;
        gsap.fromTo(scene, { glitch: 0.8 }, { glitch: 0, duration: 0.45, ease: 'power2.out' });
      }
      // plain scrolled sections no longer glitch on entry: only the teleports and the 3D scene do
    };
    ScrollTrigger.create({ trigger: sec, start: 'top 60%', end: 'bottom 40%', onEnter: fire, onEnterBack: fire });
  });
}
