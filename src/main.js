import './styles/base.css';
import './styles/crt.css';
import './styles/sections.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initScroll, lockScroll, initBlockSnap } from './animations/scroll.js';
import { runBoot } from './animations/boot.js';
import { initCursor } from './animations/cursor.js';
import { initScrambleLinks } from './animations/text.js';
import { initSectionGlitches } from './animations/transitions.js';
import { createHero, startHero } from './sections/hero.js';
import { initAbout, initThesis } from './sections/about.js';
import { initGate } from './sections/gate.js';
import { initWired } from './sections/wired.js';
import { initCharacters } from './sections/characters.js';
import { initThemes } from './sections/themes.js';
import { initEpisodes } from './sections/episodes.js';
import { initGallery } from './sections/gallery.js';
import { initCta } from './sections/cta.js';
import { initTopbar, initCrtNoise, initEasterEgg } from './sections/system.js';

gsap.registerPlugin(ScrollTrigger);
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// 1. scroll engine (stopped during boot)
initScroll();

// 2. hero WebGL first: its assets feed the boot progress bar
const hero = createHero();

// 3. build every section in page order (pins must be created top → bottom)
initAbout();
initGate({ scene: () => wired.scene });
const wired = initWired();
initThesis();
initThemes();
initCharacters();
initEpisodes();
initGallery();
initCta();

// 4. global system layer
const setActive = initTopbar();
initCrtNoise();
initCursor();
initEasterEgg();
initScrambleLinks();
initSectionGlitches({
  onLayer: setActive,
  webglFor: (sec) => (sec.id === 'layer-02' ? wired.scene : null),
});

// 5. boot sequence → reveal
runBoot().then(() => {
  lockScroll(false);
  gsap.to('.topbar', { opacity: 1, duration: 0.6, delay: 0.3 });
  startHero(hero);
  ScrollTrigger.refresh();
  initBlockSnap();
});

document.fonts?.ready.then(() => ScrollTrigger.refresh());

if (import.meta.env.DEV) window.__lain = { hero, get wired() { return wired.scene; }, gsap, ScrollTrigger };
