import gsap from 'gsap';
import { env, hasWebGL } from '../utils/reducedMotion.js';

/** Pinned 300vh section; scroll progress drives the WebGL camera. */
export function initWired() {
  const section = document.getElementById('layer-02');
  const stage = section.querySelector('.wired__stage');
  let scene = null;
  const api = { get scene() { return scene; } };

  // the whole 3D section (scene code, model, video) is fetched only as the visitor approaches
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    if (!hasWebGL()) return;
    try {
      const { WiredScene } = await import('../webgl/WiredScene.js');
      scene = new WiredScene(section.querySelector('.wired__canvas'));
      scene.setProgress(st.p);
      scene.load();
    } catch (err) {
      console.warn('[wired] webgl unavailable', err);
    }
  }, { rootMargin: '150% 0px' });
  io.observe(section);

  const depth = section.querySelector('.js-depth');
  const signal = section.querySelector('.js-signal');
  const state = section.querySelector('.js-state');
  const lines = gsap.utils.toArray('.wired__line', section);
  let lastState = '';
  const st = { p: 0 };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      pin: stage,
      start: 'top top',
      end: '+=300%',
      scrub: env.reduced ? true : 0.8,
      anticipatePin: 1,
    },
    onUpdate: () => {
      const p = st.p;
      scene?.setProgress(p);
      depth.textContent = String(Math.round(p * 1620)).padStart(4, '0');
      const bars = Math.min(5, 1 + Math.floor(p * 5));
      signal.textContent = '▮'.repeat(bars) + '▯'.repeat(5 - bars);
      const s = p < 0.3 ? 'reality' : p < 0.52 ? 'crossing' : p < 0.85 ? 'the wired' : 'inside';
      if (s !== lastState) {
        lastState = s;
        state.textContent = s;
        if (s === 'crossing' || s === 'inside') pulse();
      }
    },
  });
  tl.to(st, { p: 1, duration: 1 }, 0);

  // overlay copy at fixed points along the scroll
  const at = [0.06, 0.32, 0.58, 0.82];
  lines.forEach((el, i) => {
    tl.fromTo(el, { autoAlpha: 0, y: 20, filter: 'blur(6px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.05 }, at[i])
      .to(el, { autoAlpha: 0, y: -20, filter: 'blur(6px)', duration: 0.05 }, at[i] + 0.13);
  });
  tl.to('.wired__head', { autoAlpha: 0, duration: 0.06 }, 0.1);
  tl.to(section.querySelector('.wired__static'), { opacity: 1, duration: 0.035 }, 0.965);

  function pulse() {
    if (env.reduced || !scene) return;
    gsap.fromTo(scene, { glitch: 0.9 }, { glitch: 0, duration: 0.5, ease: 'power2.out' });
  }

  return api;
}
