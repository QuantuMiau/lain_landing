import { animate, stagger } from 'animejs';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from '../utils/reducedMotion.js';
import { click } from '../utils/audio.js';
import { loadImage } from '../utils/loader.js';

// Portraits live at /public/assets/img/characters/<id>.webp (sources in assets-src/characters).
// If one is missing, a procedural "signal lost" portrait is generated instead.
const USERS = [
  { id: 'lain', name: 'Lain Iwakura', kana: 'イワクラ・レイン', img: '/assets/img/characters/lain.webp', alt: '/assets/img/frames/lain_glitch_blue.webp', altVideo: '/assets/video/lain_glitch_blue',
    line: 'Fourteen, quiet, bear-eared pajamas. Online, someone else answers to her name.' },
  { id: 'alice', name: 'Alice Mizuki', kana: 'ミズキ・アリス',
    line: 'Lain\'s one real friend, and the one who keeps reminding her what a body is for.' },
  { id: 'chisa', name: 'Chisa Yomoda', kana: 'ヨモダ・チサ',
    line: 'She died on a Tuesday and wrote to everyone on Wednesday.' },
  { id: 'eiri', name: 'Masami Eiri', kana: 'エイリ・マサミ',
    line: 'An engineer who hid a piece of himself in Protocol 7 and started calling it god.' },
  { id: 'yasuo', name: 'Yasuo Iwakura', kana: 'イワクラ・ヤスオ',
    line: 'The father who speaks warmly to his machines and almost never at dinner.' },
  { id: 'mika', name: 'Mika Iwakura', kana: 'イワクラ・ミカ',
    line: 'The older sister who saw something on the way home and never fully came back.' },
  { id: 'knights', name: 'The Knights', kana: 'ナイツ', mark: 'ナイツ',
    line: 'An anonymous hacker sect clearing the road for a messiah made of data.' },
  { id: 'mib', name: 'Men in Black', kana: 'メン・イン・ブラック', mark: 'クロ',
    line: 'Karl and Lin. Dark glasses, a black car, orders from someone who does not exist.' },
];

function portrait(u, i) {
  const c = document.createElement('canvas');
  c.width = 240; c.height = 264;
  const g = c.getContext('2d');
  g.fillStyle = '#050505';
  g.fillRect(0, 0, c.width, c.height);
  // dithered silhouette (head + shoulders) out of static
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      const dx = (x - 120) / 120, dyH = (y - 100) / 70, dyB = (y - 270) / 120;
      const inHead = dx * dx * 2.2 + dyH * dyH < 1;
      const inBody = dx * dx * 0.9 + dyB * dyB < 1;
      const base = inHead || inBody ? 0.08 : 0.3;
      if (Math.random() < base) {
        g.fillStyle = Math.random() < 0.05 ? '#e07a96' : `rgba(216,210,196,${0.15 + Math.random() * 0.35})`;
        g.fillRect(x, y, 2, 2);
      }
    }
  }
  g.font = '64px "DotGothic16", monospace';
  g.fillStyle = 'rgba(224,122,150,0.85)';
  g.textAlign = 'center';
  g.fillText(u.mark || u.kana.replace(/.*・/, '').slice(0, 2), 120, 150);
  g.font = '18px "VT323", monospace';
  g.fillStyle = 'rgba(216,210,196,0.55)';
  g.textAlign = 'left';
  g.fillText(`no image // user_${String(i + 1).padStart(2, '0')}`, 10, 252);
  return c.toDataURL('image/png');
}

export function initCharacters() {
  const grid = document.querySelector('.users__grid');
  grid.innerHTML = USERS.map((u, i) => `
    <li class="user${u.alt ? ' has-alt' : ''}" tabindex="0" data-id="${u.id}">
      <article class="window" aria-labelledby="u-${u.id}">
        <div class="window__bar"><span>user_${String(i + 1).padStart(2, '0')}.dat</span><span class="window__btns" aria-hidden="true"><i></i><i></i><i></i></span></div>
        <div class="user__media">
          <img class="base" alt="Portrait of ${u.name}" loading="lazy" decoding="async" />
          ${u.altVideo ? `<video class="alt" muted loop playsinline preload="none" poster="${u.alt}" aria-hidden="true">
            <source src="${u.altVideo}.webm" type="video/webm" /><source src="${u.altVideo}.mp4" type="video/mp4" />
          </video>` : ''}
          <div class="g g-r"></div><div class="g g-c"></div>
          <span class="user__kana" lang="ja">${u.kana}</span>
        </div>
        <div class="user__body">
          <span class="user__id">uid 0x${(0x3a2f + i * 97).toString(16)}</span>
          <h3 class="user__name" id="u-${u.id}">${u.name}</h3>
          <p class="user__line">${u.line}</p>
        </div>
      </article>
    </li>`).join('');

  const cards = [...grid.children];
  cards.forEach(async (li, i) => {
    const u = USERS[i];
    const img = li.querySelector('.base');
    let src = u.img;
    if (!src) {
      const custom = await loadImage(`/assets/img/characters/${u.id}.webp`);
      if (custom) src = custom.src;
      else { src = portrait(u, i); img.alt = ''; }
    }
    img.src = src;
    const setGlitchSrc = (s) => li.querySelectorAll('.g').forEach((g) => { g.style.backgroundImage = `url("${s}")`; });
    setGlitchSrc(src);

    const enter = () => {
      li.classList.add('is-hot');
      if (u.alt) setGlitchSrc(u.alt);
      li.querySelector('video.alt')?.play().catch(() => {});
      click(1400 + i * 90);
      if (!env.reduced) {
        animate(li.querySelector('.window'), {
          translateX: [0, -4, 5, -3, 2, 0],
          translateY: [0, 2, -1, 1, 0],
          duration: 320,
          ease: 'linear',
        });
      }
    };
    const leave = () => {
      li.classList.remove('is-hot');
      if (u.alt) setGlitchSrc(src);
      li.querySelector('video.alt')?.pause();
    };
    li.addEventListener('mouseenter', enter);
    li.addEventListener('mouseleave', leave);
    li.addEventListener('focus', enter);
    li.addEventListener('blur', leave);
  });

  // grid entrance from the centre (anime.js), triggered once by ScrollTrigger
  const cols = () => getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  cards.forEach((c) => { c.style.opacity = 0; });
  ScrollTrigger.create({
    trigger: grid,
    start: 'top 80%',
    once: true,
    onEnter: () => {
      const n = cols();
      animate(cards, env.reduced
        ? { opacity: [0, 1], duration: 600, delay: stagger(60) }
        : {
          opacity: [0, 1],
          scale: [0.86, 1],
          translateY: [30, 0],
          duration: 700,
          ease: 'outExpo',
          delay: stagger(80, { grid: [n, Math.ceil(cards.length / n)], from: 'center' }),
        });
    },
  });
}
