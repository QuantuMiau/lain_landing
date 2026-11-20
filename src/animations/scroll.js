import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { env } from '../utils/reducedMotion.js';

gsap.registerPlugin(ScrollTrigger);

export let lenis = null;
let navigating = false;
/** True while a menu/anchor jump is gliding: the teleports must not hijack it on the way past. */
export const isNavigating = () => navigating;

/** Lenis drives the scroll position, ScrollTrigger listens to it. */
export function initScroll() {
  if (!env.reduced) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  // in-page anchors go through Lenis
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lenis) {
      navigating = true;
      lenis.scrollTo(target, { duration: 1.6, onComplete: () => { navigating = false; } });
      setTimeout(() => { navigating = false; }, 2200); // safety: an interrupted glide must not leave the flag stuck
    }
    else target.scrollIntoView();
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
  return lenis;
}

export function lockScroll(lock) {
  document.body.classList.toggle('is-booting', lock);
  if (lenis) lock ? lenis.stop() : lenis.start();
}

/**
 * Magnetic "block" scrolling: when the visitor stops near the top of a section, glide it
 * exactly to the top of the screen. Tall sections stay free to read (the pull only works
 * within a quarter screen above a section start, or a hair below it), and pinned ranges are never touched.
 */
export function initBlockSnap() {
  if (!lenis || env.reduced) return;
  const topOf = (el) => { let y = 0; for (let e = el; e; e = e.offsetParent) y += e.offsetTop; return y; };
  let timer = 0;

  lenis.on('scroll', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (lenis.isStopped || document.body.classList.contains('is-booting')) return;
      const y = lenis.scroll;
      const above = innerHeight * 0.25; // section still ahead: pull it in
      const below = innerHeight * 0.08; // already inside it: barely nudge, so reading is never undone
      const pins = ScrollTrigger.getAll().filter((t) => t.pin).map((t) => [t.start, t.end]);
      if (pins.some(([a, b]) => y > a + 2 && y < b - 2)) return; // inside a pinned scene: free scrubbing

      const starts = [...document.querySelectorAll('main > section, main > .pin-spacer')].map(topOf);
      let best = null;
      for (const t of starts) {
        const d = Math.abs(t - y);
        const reach = t > y ? above : below;
        if (d > 2 && d < reach && (best === null || d < Math.abs(best - y))) best = t;
      }
      if (best !== null) lenis.scrollTo(best, { duration: 0.7, easing: (t) => 1 - Math.pow(1 - t, 3) });
    }, 140);
  });
}
