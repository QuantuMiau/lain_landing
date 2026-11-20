import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isNavigating } from '../animations/scroll.js';
import { warpTo } from '../animations/warp.js';
import { click } from '../utils/audio.js';
import { env } from '../utils/reducedMotion.js';

/**
 * End of layer 01: the section pins, "what is lain" fades away as you keep scrolling and
 * "ready to enter the wired?" fades in over it. Clicking [ enter ] (or scrolling to the end)
 * tears the screen with a glitch and drops you straight into layer 02, with no visible scroll.
 */
export function initGate({ scene } = {}) {
  const about = document.getElementById('layer-01');
  const gate = about.querySelector('.gate');
  const content = about.querySelector('.about__grid');
  const btn = gate.querySelector('.gate__btn');
  const items = gate.querySelectorAll('.gate__tag, .gate__title, .gate__btn, .gate__hint');
  const target = document.getElementById('layer-02');

  let fired = false; // scroll trigger armed again only after scrolling back up
  const enterWired = () => warpTo(target, { scene });

  if (env.reduced) {
    gate.classList.add('gate--static'); // no pin or fade: just a block after the copy
  } else {
    gsap.set(gate, { autoAlpha: 0 });
    gsap.set(items, { y: 24, autoAlpha: 0, filter: 'blur(6px)' });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: about,
        start: 'bottom bottom', // pin once the whole section is on screen
        end: '+=110%',
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        // reaching the end of the pin drops you into layer 02
        onUpdate: (self) => {
          if (self.progress > 0.97 && self.direction === 1 && !fired && !isNavigating()) { fired = true; enterWired(); }
          else if (self.progress < 0.7) fired = false;
        },
      },
    });
    tl.to(content, { autoAlpha: 0, y: -40, filter: 'blur(8px)', duration: 0.4 }, 0)
      .to(gate, { autoAlpha: 1, duration: 0.01 }, 0.4)
      .to(items, { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.18, stagger: 0.1 }, 0.42)
      .to({}, { duration: 0.2 }, 0.9); // hold the question on screen a moment before the jump
  }

  btn.addEventListener('mouseenter', () => click(2200));
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation(); // keep the global anchor handler from also scrolling
    fired = true; // the scroll trigger must not fire a second time
    enterWired();
  });
}
