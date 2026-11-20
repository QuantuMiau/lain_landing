import gsap from 'gsap';
import { downloadText } from '../animations/text.js';
import { env } from '../utils/reducedMotion.js';

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
