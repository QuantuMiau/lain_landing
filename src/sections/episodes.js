import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate, stagger, steps } from 'animejs';
import { typeText } from '../animations/boot.js';
import { env } from '../utils/reducedMotion.js';
import { click } from '../utils/audio.js';

const EPS = [
  ['weird', 'a message from a dead girl'],
  ['girls', 'a club called cyberia'],
  ['psyche', 'a chip arrives in the mail'],
  ['religion', 'a game that bleeds'],
  ['distortion', 'the prophecy repeats itself'],
  ['kids', 'a sky full of hands'],
  ['society', 'who sent the men in black'],
  ['rumors', 'lain said what about you?'],
  ['protocol', 'a brief history of ghosts'],
  ['love', 'god shows his face'],
  ['infornography', 'everything, all at once'],
  ['landscape', 'the world was never there'],
  ['ego', 'let\'s all love lain'],
];
const THUMBS = [
  '/assets/img/frames/lain_glitch_blue.webp', '/assets/img/wallpapers/wp-06-800.webp', '/assets/img/wallpapers/wp-01-800.webp',
  '/assets/img/frames/lain_on_pc.webp', '/assets/img/wallpapers/wp-03-800.webp', '/assets/img/wallpapers/wp-07-800.webp',
  '/assets/img/wallpapers/wp-09-800.webp', '/assets/img/frames/lain_art.webp', '/assets/img/wallpapers/wp-04-800.webp',
  '/assets/img/wallpapers/wp-05-800.webp', '/assets/img/frames/lain_glitch.webp', '/assets/img/wallpapers/wp-08-800.webp',
  '/assets/img/wallpapers/wp-02-800.webp',
];

export function initEpisodes() {
  const list = document.querySelector('.eps');
  list.innerHTML = EPS.map(([title, hint], i) => {
    const n = String(i + 1).padStart(2, '0');
    const size = (1200 + ((i * 7919) % 900)).toString();
    return `<li class="ep"><a href="#layer-05" data-i="${i}" aria-label="Layer ${n}: ${title}. ${hint}">
      <span class="perm" aria-hidden="true">-rw-r--r--</span>
      <span class="id">layer:${n}</span>
      <span class="title">${title}</span>
      <span class="hint">${hint}</span>
      <span class="size" aria-hidden="true">${size}k</span>
    </a></li>`;
  }).join('');
  list.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); });

  const rows = [...list.children];
  const cmd = document.querySelector('.js-cmd');
  rows.forEach((r) => { r.style.opacity = 0; });

  ScrollTrigger.create({
    trigger: '.terminal',
    start: 'top 75%',
    once: true,
    onEnter: () => {
      typeText(cmd, 'ls -la /layers', { duration: 700 }).then(() => {
        animate(rows, env.reduced
          ? { opacity: [0, 1], duration: 400 }
          : { opacity: [0, 1], translateX: [-12, 0], duration: 260, ease: steps(3), delay: stagger(55) });
      });
    },
  });

  // floating thumbnail that follows the cursor with lerp
  const thumb = document.querySelector('.eps__thumb');
  const img = thumb.querySelector('img');
  if (env.mobile) return;
  const qx = gsap.quickTo(thumb, 'x', { duration: env.reduced ? 0.01 : 0.55, ease: 'power3.out' });
  const qy = gsap.quickTo(thumb, 'y', { duration: env.reduced ? 0.01 : 0.55, ease: 'power3.out' });
  list.addEventListener('pointermove', (e) => { qx(e.clientX + 28); qy(e.clientY - 90); });
  list.addEventListener('pointerover', (e) => {
    const a = e.target.closest('a');
    if (!a || a.dataset.on) return;
    rows.forEach((r) => delete r.firstElementChild.dataset.on);
    a.dataset.on = '1';
    img.src = THUMBS[+a.dataset.i];
    click(2100);
    gsap.to(thumb, { autoAlpha: 1, scale: 1, duration: 0.2, overwrite: 'auto' });
    if (!env.reduced) gsap.fromTo(img, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.3, ease: 'steps(6)' });
  });
  list.addEventListener('pointerleave', () => {
    rows.forEach((r) => delete r.firstElementChild.dataset.on);
    gsap.to(thumb, { autoAlpha: 0, scale: 0.96, duration: 0.2 });
  });
}
