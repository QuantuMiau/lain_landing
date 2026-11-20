import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { animate, createDrawable } from 'animejs';
import { env } from '../utils/reducedMotion.js';

export function initCta() {
  const rect = document.querySelector('.cta__border rect');
  const [drawable] = createDrawable(rect);
  drawable.setAttribute('draw', '0 0');

  ScrollTrigger.create({
    trigger: '.cta',
    start: 'top 55%',
    once: true,
    onEnter: () => {
      const head = document.querySelector('.cta__title');
      if (env.reduced) {
        gsap.from(head, { autoAlpha: 0, duration: 1 });
        drawable.setAttribute('draw', '0 1');
        return;
      }
      const split = SplitText.create(head, { type: 'words,chars', aria: 'none', ignore: '.sr-only' });
      gsap.from(split.chars, {
        autoAlpha: 0, yPercent: 40, duration: 0.6, ease: 'expo.out',
        stagger: { each: 0.03, from: 'random' },
      });
      animate(drawable, { draw: ['0 0', '0 1'], duration: 1400, delay: 600, ease: 'inOutQuad' });
    },
  });

  // hover: border re-draws from a random point + jitter
  const btn = document.querySelector('.cta__btn');
  btn.addEventListener('mouseenter', () => {
    if (env.reduced) return;
    const s = Math.random() * 0.5;
    animate(drawable, { draw: [`${s} ${s}`, '0 1'], duration: 500, ease: 'outExpo' });
    animate(btn, { translateX: [0, -3, 4, -2, 0], duration: 240, ease: 'linear' });
  });

  // the watcher drifts toward the pointer, slowly
  if (!env.reduced && !env.mobile) {
    const w = document.querySelector('.cta__watcher');
    const qx = gsap.quickTo(w, 'x', { duration: 2, ease: 'power2.out' });
    const qy = gsap.quickTo(w, 'y', { duration: 2, ease: 'power2.out' });
    document.querySelector('.cta').addEventListener('pointermove', (e) => {
      qx((e.clientX / innerWidth - 0.8) * 24);
      qy((e.clientY / innerHeight - 0.8) * 16);
    });
  }

  // footer marquee
  const track = document.querySelector('.marquee__track');
  const unit = Array.from({ length: 6 }, () => '<span>let\'s all love lain</span>').join('');
  track.innerHTML = unit + unit;
  if (!env.reduced) {
    gsap.to(track, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
  }
}
