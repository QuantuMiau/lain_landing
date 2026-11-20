import { createAnimatable } from 'animejs';
import { env } from '../utils/reducedMotion.js';

/** 1px cross cursor with a red/cyan RGB trail (anime.js animatables). */
export function initCursor() {
  if (!env.finePointer || env.mobile) return;
  document.documentElement.classList.add('has-cursor');
  const lag = env.reduced ? 0 : 1;
  const x = createAnimatable('.cursor__x', { x: 0, y: 0, ease: 'out(4)', duration: 60 });
  const r = createAnimatable('.cursor__r', { x: 0, y: 0, ease: 'out(3)', duration: 220 * lag });
  const c = createAnimatable('.cursor__c', { x: 0, y: 0, ease: 'out(3)', duration: 380 * lag });
  window.addEventListener('pointermove', (e) => {
    x.x(e.clientX); x.y(e.clientY);
    r.x(e.clientX + 2); r.y(e.clientY);
    c.x(e.clientX - 2); c.y(e.clientY);
  }, { passive: true });
  const hoverSel = 'a, button, [role="button"], .user, .shot';
  document.addEventListener('pointerover', (e) => {
    document.documentElement.classList.toggle('cursor-hover', !!e.target.closest(hoverSel));
  });
}
