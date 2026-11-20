import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { animate, createDrawable } from 'animejs';
import { env } from '../utils/reducedMotion.js';
import { connectSweep, glitchBurst, click } from '../utils/audio.js';

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

  // click: fake a handshake with the Wired, then open the link
  const label = btn.querySelector('[data-scramble]');
  const sub = btn.querySelector('.cta__btn-sub');
  const href = btn.href;
  const idleLabel = label.textContent;
  const idleSub = sub.textContent;
  let busy = false;

  btn.addEventListener('click', (e) => {
    // let ctrl/cmd/middle-click behave like a normal link
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (busy) return;
    busy = true;

    // the tab opens only once the handshake ends (user activation lasts ~5s, longer than the sequence)
    const go = () => {
      const tab = window.open(href, '_blank', 'noopener,noreferrer');
      if (!tab) window.location.assign(href); // blocked: fall back to this tab
      setTimeout(reset, 900);
    };

    btn.classList.add('is-connecting');
    btn.setAttribute('aria-busy', 'true');
    const total = env.reduced ? 700 : 2600;
    connectSweep(total / 1000);

    const steps = [
      [0.00, 'dialing the wired'],
      [0.28, 'handshake...'],
      [0.55, 'syncing layers'],
      [0.82, 'authenticating'],
    ];
    const state = { p: 0 };
    let k = 0;
    const render = () => {
      const pct = Math.round(state.p * 100);
      const filled = Math.round(state.p * 16);
      label.textContent = `[${'█'.repeat(filled)}${'░'.repeat(16 - filled)}]`;
      while (k < steps.length && state.p >= steps[k][0]) sub.textContent = `> ${steps[k++][1]} ${String(pct).padStart(3, '0')}%`;
      if (k > 0) sub.textContent = sub.textContent.replace(/\d{3}%$/, `${String(pct).padStart(3, '0')}%`);
    };
    render();

    animate(drawable, { draw: ['0 0', '0 1'], duration: total, ease: 'inOutQuad' });
    gsap.to(state, {
      p: 1, duration: total / 1000, ease: 'steps(18)', onUpdate: render,
      onUpdateParams: [],
      onComplete: () => {
        label.textContent = 'connected';
        sub.textContent = '> you are now in the wired';
        btn.classList.add('is-connected');
        glitchBurst(1.2);
        click(2600);
        if (!env.reduced) {
          gsap.fromTo(btn, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
          gsap.fromTo('.crt-flash, body', { filter: 'none' }, { filter: 'brightness(1.5) contrast(1.2)', duration: 0.08, yoyo: true, repeat: 3, clearProps: 'filter' });
        }
        gsap.delayedCall(env.reduced ? 0.2 : 0.8, go);
      },
    });
  });

  function reset() {
    busy = false;
    btn.classList.remove('is-connecting', 'is-connected');
    btn.removeAttribute('aria-busy');
    label.textContent = idleLabel;
    sub.textContent = idleSub;
  }

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
