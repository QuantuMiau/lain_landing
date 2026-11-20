import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MQ } from '../utils/reducedMotion.js';

const THEMES = [
  { word: 'identity', title: 'identity', q: 'who are you?', img: 'lain-identity',
    body: 'There is the Lain at home, the Lain at school, and the Lain the Wired talks about. <strong>None of them asked permission to exist.</strong>' },
  { word: 'isolation', title: 'communication & isolation', q: 'connected, alone.', img: 'wp-06',
    body: 'Every room has a screen and every screen has a voice. <strong>In the Iwakura house, nobody actually speaks.</strong>' },
  { word: 'collective', title: 'the network as unconscious', q: 'if no one remembers you, were you there?', img: 'wp-08',
    body: 'The Wired doesn\'t store memories. <strong>It is made of them,</strong> a dream that everyone is having at the same time.' },
  { word: 'deus', title: 'god & technology', q: 'somebody wanted to be god.', img: 'wp-04',
    body: 'A programmer leaves his body, hides inside a protocol, and waits for the faithful <strong>to log in.</strong>' },
  { word: 'memory', title: 'memory & reality', q: 'present day, present time.', img: 'wp-07',
    body: 'Erase one memory and the past quietly rearranges itself around the gap. <strong>Nobody notices. That is the point.</strong>' },
];

export function initThemes() {
  const track = document.querySelector('.themes__track');
  track.innerHTML = THEMES.map((t, i) => `
    <article class="theme" aria-labelledby="th-${i}">
      <span class="theme__word" aria-hidden="true">${t.word}</span>
      <div class="theme__media red-shadow">
        <div class="frame">
          <picture>
            <source type="image/avif" srcset="/assets/img/wallpapers/${t.img}-800.avif 800w, /assets/img/wallpapers/${t.img}-1600.avif 1600w" sizes="(max-width: 820px) 100vw, 50vw" />
            <img src="/assets/img/wallpapers/${t.img}-1600.webp" srcset="/assets/img/wallpapers/${t.img}-800.webp 800w, /assets/img/wallpapers/${t.img}-1600.webp 1600w" sizes="(max-width: 820px) 100vw, 50vw" alt="" loading="lazy" decoding="async" />
          </picture>
        </div>
      </div>
      <div class="theme__text">
        <p class="theme__num">0${i + 1} / 0${THEMES.length}</p>
        <h3 class="theme__title" id="th-${i}">${t.title}</h3>
        <p class="theme__q">&gt; ${t.q}</p>
        <p class="theme__body">${t.body}</p>
      </div>
    </article>`).join('');

  const panels = gsap.utils.toArray('.theme', track);
  const mm = gsap.matchMedia();

  mm.add({ horiz: `${MQ.desktop} and ${MQ.motion}`, any: 'all' }, (ctx) => {
    if (!ctx.conditions.horiz) return vertical();
    // desktop + motion OK: horizontal pinned scroll
    document.documentElement.classList.remove('themes-vertical');
    const distance = () => track.scrollWidth - window.innerWidth;
    const horiz = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.themes__pin',
        pin: true,
        start: 'top top',
        end: () => `+=${distance()}`,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    const disp = document.querySelector('.df-disp');

    panels.forEach((panel, i) => {
      // giant outline word moves against the scroll
      gsap.fromTo(panel.querySelector('.theme__word'), { xPercent: 18 }, {
        xPercent: -28, ease: 'none',
        scrollTrigger: { trigger: panel, containerAnimation: horiz, start: 'left right', end: 'right left', scrub: true },
      });
      // image enters through a displacement + clip reveal
      const frame = panel.querySelector('.frame');
      gsap.timeline({
        // first panel is already in view when the pin starts, so key it off the section itself
        scrollTrigger: i === 0
          ? { trigger: '.themes__pin', start: 'top 55%', toggleActions: 'play none none reverse' }
          : { trigger: panel, containerAnimation: horiz, start: 'left 75%', toggleActions: 'play none none reverse' },
      })
        .set(frame, { filter: 'url(#displace-filter)' })
        .fromTo(frame, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'steps(9)' }, 0)
        .fromTo(disp, { attr: { scale: 90 } }, { attr: { scale: 0 }, duration: 1.1, ease: 'power2.out' }, 0)
        .set(frame, { filter: 'none' })
        .from(panel.querySelectorAll('.theme__text > *'), { autoAlpha: 0, y: 24, stagger: 0.07, duration: 0.6, ease: 'power3.out' }, 0.2);
    });
    return () => gsap.set(track, { clearProps: 'x' });
  });

  // mobile / reduced motion: plain vertical stack with simple fades
  function vertical() {
    document.documentElement.classList.add('themes-vertical');
    panels.forEach((panel) => {
      gsap.from(panel.querySelectorAll('.theme__media, .theme__text'), {
        autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.1,
        scrollTrigger: { trigger: panel, start: 'top 80%', once: true },
      });
    });
  }
  ScrollTrigger.refresh();
}
