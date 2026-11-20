import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { env } from '../utils/reducedMotion.js';

gsap.registerPlugin(ScrollTrigger);

export let lenis = null;

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
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
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
