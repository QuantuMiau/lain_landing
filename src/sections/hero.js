import gsap from 'gsap';
import { HeroScene } from '../webgl/HeroScene.js';
import { heroTitleIntro, jitterChars } from '../animations/text.js';
import { env, hasWebGL } from '../utils/reducedMotion.js';
import { hexDump } from '../utils/katakana.js';

/** Builds the WebGL hero early (so its assets feed the boot bar). */
export function createHero() {
  const canvas = document.querySelector('.hero__canvas');
  let scene = null;
  if (hasWebGL()) {
    try { scene = new HeroScene(canvas); } catch (e) { console.warn('[hero] webgl failed', e); }
  }
  if (!scene) document.documentElement.classList.add('no-webgl');
  document.querySelector('.hero__hex').textContent = hexDump(14);
  return scene;
}

/** Runs after boot: title intro, DOM parallax, random glitch spikes. */
export function startHero(scene) {
  const title = document.querySelector('.hero__title');
  const { split } = heroTitleIntro(title);
  gsap.from('.hero__kicker, .hero__aside, .hero__scroll', {
    autoAlpha: 0, y: 12, duration: 0.8, stagger: 0.12, delay: 0.4, ease: 'power3.out',
  });

  if (env.reduced) return;

  // DOM layer of the 3-layer mouse parallax (camera + particles are in WebGL)
  if (!env.mobile) {
    const qx = gsap.quickTo(title, 'x', { duration: 1.2, ease: 'power3.out' });
    const qy = gsap.quickTo(title, 'y', { duration: 1.2, ease: 'power3.out' });
    window.addEventListener('pointermove', (e) => {
      qx((e.clientX / innerWidth - 0.5) * -18);
      qy((e.clientY / innerHeight - 0.5) * -10);
    }, { passive: true });
  }

  // GlitchPass fired randomly every 4–9 s, only while the hero is on screen
  const loop = () => {
    gsap.delayedCall(gsap.utils.random(4, 9), () => {
      if (scene?.running) {
        scene.spike(gsap.utils.random(0.35, 0.7));
        jitterChars(split.chars, 3);
      }
      loop();
    });
  };
  loop();

  // hero content drifts and dims as you scroll away
  gsap.to('.hero__ui', {
    yPercent: -12, autoAlpha: 0.2, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
}
