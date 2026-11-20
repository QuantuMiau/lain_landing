import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { animate, createDrawable } from 'animejs';
import { downloadText } from '../animations/text.js';
import { env } from '../utils/reducedMotion.js';

/** The thesis: headline lands letter by letter, the god → wired → you loop draws itself and keeps pulsing. */
export function initThesis() {
  const section = document.querySelector('.thesis');
  downloadText(section.querySelectorAll('[data-download]'));
  const title = section.querySelector('.about__big');
  const map = section.querySelector('.about__map');
  const edges = [...map.querySelectorAll('.edge')];
  const pulses = [...map.querySelectorAll('.pulse')];
  const nodes = map.querySelectorAll('.node, .elabel');

  if (env.reduced) { pulses.forEach((p) => p.remove()); return; }

  // start hidden; everything plays once when the section arrives
  const split = SplitText.create(title.querySelectorAll('.about__line'), { type: 'chars', aria: 'none' });
  gsap.set(split.chars, { autoAlpha: 0 });
  gsap.set(nodes, { autoAlpha: 0 });
  gsap.set('.about__lede', { autoAlpha: 0, y: 16 });
  const drawables = edges.map((e) => { const [d] = createDrawable(e); d.setAttribute('draw', '0 0'); return d; });
  pulses.forEach((p) => p.setAttribute('opacity', '0'));

  const endpoints = edges.map((e) => e.getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number)); // [x1, y1, x2, y2]
  const loops = [];
  const startPulses = () => pulses.forEach((p, i) => {
    const [x1, y1, x2, y2] = endpoints[i];
    const o = { t: 0 };
    p.setAttribute('opacity', '1');
    loops.push(animate(o, {
      t: 1, duration: 2600, delay: i * 870, loop: true, ease: 'inOutSine',
      onUpdate: () => { p.setAttribute('cx', x1 + (x2 - x1) * o.t); p.setAttribute('cy', y1 + (y2 - y1) * o.t); },
    }));
  });

  ScrollTrigger.create({
    trigger: section,
    start: 'top 55%',
    once: true,
    onEnter: () => {
      const tl = gsap.timeline();
      tl.to(split.chars, { autoAlpha: 1, duration: 0.05, stagger: { each: 0.045, from: 'random' } }, 0)
        .to('.about__lede', { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.7)
        .to(nodes, { autoAlpha: 1, duration: 0.5, stagger: 0.18 }, 0.6);
      drawables.forEach((d, i) => animate(d, { draw: ['0 0', '0 1'], duration: 1100, delay: 900 + i * 450, ease: 'inOutQuad' }));
      setTimeout(startPulses, 2600);
    },
  });

  // keep the loop quiet while the section is off screen
  ScrollTrigger.create({
    trigger: section, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => loops.forEach((l) => (self.isActive ? l.resume() : l.pause())),
  });
}

export function initAbout() {
  downloadText(document.querySelectorAll('#layer-01 [data-download]'));

  gsap.from('.about__spec', {
    autoAlpha: 0, y: 30, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.about__spec', start: 'top 85%', once: true },
  });
  document.querySelector('.about__spec').classList.add('red-shadow');

  if (!env.reduced) {
    gsap.fromTo('.about__bg', { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '#layer-01', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }
}
