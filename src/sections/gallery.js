import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate, steps } from 'animejs';
import { env } from '../utils/reducedMotion.js';
import { lenis } from '../animations/scroll.js';

gsap.registerPlugin(Flip);

const META = { 'wp-01': [2560, 1440], 'wp-02': [2000, 1435], 'wp-03': [3360, 1050], 'wp-04': [2400, 1800], 'wp-05': [3000, 2152], 'wp-06': [1920, 1080], 'wp-07': [4093, 2894], 'wp-08': [1920, 1200], 'wp-09': [1920, 1080] };
const ORDER = [['wp-02', 'wp-06', 'wp-03'], ['wp-05', 'wp-01', 'wp-09'], ['wp-08', 'wp-04', 'wp-07']];
const CAPTIONS = { 'wp-01': 'cables.bmp', 'wp-02': 'bridge.bmp', 'wp-03': 'grid.bmp', 'wp-04': 'machine.bmp', 'wp-05': 'overpass.bmp', 'wp-06': 'poles.bmp', 'wp-07': 'crows.bmp', 'wp-08': 'wired.bmp', 'wp-09': 'hood.bmp' };

function staticCanvas(canvas) {
  const g = canvas.getContext('2d');
  canvas.width = 160; canvas.height = 90;
  const img = g.createImageData(160, 90);
  let raf = 0, last = 0;
  const draw = (t) => {
    raf = requestAnimationFrame(draw);
    if (t - last < 80) return; // ~12 fps is enough for static
    last = t;
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  };
  return { start: () => { if (!raf) raf = requestAnimationFrame(draw); }, stop: () => { cancelAnimationFrame(raf); raf = 0; } };
}

export function initGallery() {
  const cols = document.querySelector('.gallery__cols');
  cols.innerHTML = ORDER.map((col) => `<div class="gallery__col">${col.map((id) => {
    const [w, h] = META[id];
    return `<button class="shot" type="button" data-id="${id}" aria-label="Open image ${CAPTIONS[id]}">
      <span class="shot__img"><picture>
        <source type="image/avif" srcset="/assets/img/wallpapers/${id}-800.avif 800w, /assets/img/wallpapers/${id}-1600.avif 1600w" sizes="(max-width: 760px) 50vw, 33vw" />
        <img src="/assets/img/wallpapers/${id}-800.webp" srcset="/assets/img/wallpapers/${id}-800.webp 800w, /assets/img/wallpapers/${id}-1600.webp 1600w" sizes="(max-width: 760px) 50vw, 33vw" width="${w}" height="${h}" alt="Lain artwork: ${CAPTIONS[id].replace('.bmp', '')}" loading="lazy" decoding="async" />
      </picture><span class="shot__cover" aria-hidden="true"></span></span>
      <span class="shot__cap"><span>${CAPTIONS[id]}</span><span>${Math.round((w * h) / 9000)}k</span></span>
    </button>`;
  }).join('')}</div>`).join('');

  // modem-style progressive reveal, line by line, once each image is loaded + in view
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const img = e.target.querySelector('img');
      const cover = e.target.querySelector('.shot__cover');
      // the black cover retreats downward in hard steps: an image arriving over a slow modem
      const go = () => animate(cover, env.reduced
        ? { opacity: [1, 0], duration: 400 }
        : { scaleY: [1, 0], duration: 1600, ease: steps(18) });
      img.complete ? go() : img.addEventListener('load', go, { once: true });
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  cols.querySelectorAll('.shot').forEach((s) => io.observe(s));

  // multi-speed column parallax
  if (!env.reduced) {
    const speeds = env.mobile ? [-4, 6, -4] : [-8, 14, -4];
    gsap.utils.toArray('.gallery__col').forEach((c, i) => {
      gsap.fromTo(c, { yPercent: -speeds[i] / 2 }, {
        yPercent: speeds[i], ease: 'none',
        scrollTrigger: { trigger: cols, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  // lightbox with FLIP
  const box = document.querySelector('.lightbox');
  const frame = box.querySelector('.lightbox__frame');
  const closeBtn = box.querySelector('.lightbox__close');
  const noise = staticCanvas(box.querySelector('.lightbox__static'));
  let open = null;

  const openShot = (btn) => {
    const pic = btn.querySelector('picture');
    const img = pic.querySelector('img');
    // srcset "w" descriptors derive intrinsic size from sizes, so widen every candidate
    pic.querySelectorAll('source, img').forEach((n) => { n.sizes = '100vw'; });
    const state = Flip.getState(img);
    box.hidden = false;
    noise.start();
    frame.appendChild(pic);
    lenis?.stop();
    open = { btn, pic };
    gsap.fromTo(box, { backgroundColor: 'rgba(5,5,5,0)' }, { backgroundColor: 'rgba(5,5,5,0.94)', duration: 0.3 });
    Flip.from(state, { duration: env.reduced ? 0 : 0.7, ease: 'expo.inOut', absolute: true, scale: true });
    closeBtn.focus();
  };
  const closeShot = () => {
    if (!open) return;
    const { btn, pic } = open;
    const img = pic.querySelector('img');
    const state = Flip.getState(img);
    btn.querySelector('.shot__img').appendChild(pic);
    pic.querySelectorAll('source, img').forEach((n) => { n.sizes = '(max-width: 760px) 50vw, 33vw'; });
    Flip.from(state, {
      duration: env.reduced ? 0 : 0.6, ease: 'expo.inOut', absolute: true, scale: true,
      onComplete: () => { box.hidden = true; noise.stop(); },
    });
    lenis?.start();
    btn.focus({ preventScroll: true });
    open = null;
  };
  cols.addEventListener('click', (e) => { const b = e.target.closest('.shot'); if (b) openShot(b); });
  closeBtn.addEventListener('click', closeShot);
  box.addEventListener('click', (e) => { if (e.target === box || e.target.classList.contains('lightbox__static')) closeShot(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeShot(); });
  ScrollTrigger.refresh();
}
