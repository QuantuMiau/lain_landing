import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { lenis } from './scroll.js';
import { glitchBurst, click } from '../utils/audio.js';
import { env } from '../utils/reducedMotion.js';

let overlay = null;
let warping = false;

export const isWarping = () => warping;

/** Jump the page to the top of `target` with no visible scroll. */
function jump(target) {
  const y = target.getBoundingClientRect().top + window.scrollY;
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
  ScrollTrigger.update();
}

/**
 * Glitch teleport: bars tear the screen, a black flash covers the jump, the new place dissolves in.
 * `scene` (optional) is a WebGL scene to pulse with its own glitch on arrival.
 */
export function warpTo(target, { scene } = {}) {
  if (warping || !target) return;
  if (env.reduced) { jump(target); return; }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'warp';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.append(overlay);
  }
  warping = true;
  lenis?.stop();
  glitchBurst(1.5);
  click(2600);

  const bars = Array.from({ length: 16 }, () => {
    const b = document.createElement('i');
    b.style.height = `${3 + Math.random() * 60}px`;
    overlay.append(b);
    return b;
  });
  const scatter = () => gsap.set(bars, {
    x: () => gsap.utils.random(-140, 140),
    scaleX: () => gsap.utils.random(0.3, 1),
    top: () => `${Math.random() * 100}%`,
    opacity: () => (Math.random() > 0.35 ? 0.9 : 0),
  });

  gsap.timeline({
    onComplete: () => {
      overlay.innerHTML = '';
      gsap.set(overlay, { opacity: 0, backgroundColor: 'transparent' });
      lenis?.start();
      warping = false;
    },
  })
    .set(overlay, { opacity: 1, backgroundColor: 'transparent' })
    .add(scatter, 0).add(scatter, 0.07).add(scatter, 0.14).add(scatter, 0.21) // the page tears
    .to(overlay, { backgroundColor: '#050505', duration: 0.12, ease: 'none' }, 0.26)
    .add(() => { // under cover of black: teleport
      jump(target);
      scatter();
      const s = scene?.();
      if (s) gsap.fromTo(s, { glitch: 1 }, { glitch: 0, duration: 0.7, ease: 'power2.out' });
    }, 0.4)
    .add(scatter, 0.48).add(scatter, 0.55)
    .to(overlay, { backgroundColor: 'rgba(5,5,5,0)', duration: 0.3, ease: 'none' }, 0.42)
    .to(bars, { opacity: 0, duration: 0.25, ease: 'steps(3)' }, 0.62);
}
