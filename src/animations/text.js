import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from '../utils/reducedMotion.js';
import { GLITCH_CHARS } from '../utils/katakana.js';

gsap.registerPlugin(SplitText, ScrambleTextPlugin, ScrollTrigger);

const RGB_ON = '0.14em 0 #ff0040, -0.14em 0 #00ffd5';
const RGB_OFF = '0em 0 rgba(255,0,64,0), 0em 0 rgba(0,255,213,0)';

/** Hero title: each letter glitches in with a staggered RGB split. */
export function heroTitleIntro(el) {
  const split = SplitText.create(el, { type: 'words,chars', charsClass: 'char', aria: 'auto' });
  if (env.reduced) {
    gsap.from(el, { autoAlpha: 0, duration: 1 });
    return { split, tl: null };
  }
  const tl = gsap.timeline();
  tl.from(split.chars, {
    autoAlpha: 0,
    x: () => gsap.utils.random(-40, 40),
    textShadow: RGB_ON,
    duration: 0.7,
    ease: 'expo.out',
    stagger: { each: 0.035, from: 'random' },
  }).to(split.chars, { textShadow: RGB_OFF, duration: 0.5, stagger: { each: 0.02, from: 'random' } }, '-=0.5');
  return { split, tl };
}

/** Brief RGB jitter on a few random chars, fired with the hero glitch spikes. */
export function jitterChars(chars, count = 3) {
  if (env.reduced || !chars?.length) return;
  for (let i = 0; i < count; i++) {
    const c = chars[Math.floor(Math.random() * chars.length)];
    gsap.fromTo(c,
      { x: gsap.utils.random(-12, 12), textShadow: RGB_ON },
      { x: 0, textShadow: RGB_OFF, duration: 0.35, ease: 'steps(4)', overwrite: true });
  }
}

/** Text "downloads": random chars resolve into the final copy when scrolled in. */
export function downloadText(els) {
  els.forEach((el) => {
    const text = el.textContent;
    if (env.reduced) {
      gsap.from(el, { autoAlpha: 0, duration: 0.8, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      return;
    }
    // reserve the final height so layout doesn't jump while scrambling
    el.style.minHeight = `${el.offsetHeight}px`;
    gsap.set(el, { autoAlpha: 0 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.set(el, { autoAlpha: 1 });
        gsap.to(el, {
          duration: Math.min(2.4, 0.5 + text.length * 0.006),
          scrambleText: { text, chars: GLITCH_CHARS, revealDelay: 0.15, speed: 0.6, newClass: 'dl-in', oldClass: 'dl-old' },
          ease: 'none',
          onComplete: () => { el.style.minHeight = ''; },
        });
      },
    });
  });
}

/** Scramble label on hover/focus for links & buttons with [data-scramble]. */
export function initScrambleLinks(root = document) {
  root.querySelectorAll('[data-scramble]').forEach((el) => {
    const text = el.textContent;
    const run = () => {
      if (env.reduced) return;
      gsap.to(el, { duration: 0.5, scrambleText: { text, chars: 'lowerCase', speed: 0.8 }, overwrite: true });
    };
    const host = el.closest('a, button') || el;
    host.addEventListener('mouseenter', run);
    host.addEventListener('focus', run);
  });
}
