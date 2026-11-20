# serial experiments lain — fan landing

An immersive one-page tribute to *serial experiments lain* (1998). It boots like a NAVI, runs everything through a CRT, and lets you scroll from a suburban street into the Wired.

**Stack:** Vite · Three.js (custom GLSL + EffectComposer) · GSAP + ScrollTrigger / SplitText / ScrambleText / Flip · Lenis · anime.js v4

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the build
```

Requires Node 18+. `npm run assets` regenerates the optimized media (needs `ffmpeg` on your PATH).

## Sections

| # | Section | What happens |
|---|---|---|
| boot | loader | anime.js typed BIOS log; the bar shows the lower of real `LoadingManager` progress and typing progress; flash + CRT collapse |
| hero | present day, present time | Lain GIF as a `VideoTexture` on a CRT shader, katakana particles, swaying cables, random `GlitchPass` |
| layer:01 | what is lain? | ScrambleText "download", spec window, parallax wallpaper |
| layer:02 | the wired | 300vh pinned scroll: power-line street → wireframe Wired → into the retro PC screen |
| layer:03 | user files | OS-window cards, anime.js grid stagger, RGB glitch hover (Lain switches to "Wired Lain") |
| layer:04 | ideas | horizontal pinned scroll (vertical on mobile / reduced motion) |
| layer:05 | 13 layers | `ls -la /layers` terminal, inverted row hover, cursor-following thumbnail |
| layer:06 | received images | multi-speed column parallax, modem-style reveal, Flip lightbox over static |
| layer:07 | close the world, open the nExt | SVG border drawn by anime.js, the watcher, marquee footer |

Global: custom RGB-trail cursor, CRT overlay with a toggle (`[ crt: on ]`), procedural electric hum that fades in when the hero appears (silent during boot; if the browser blocks audio, boot ends with "press any key or click to connect" to unlock it; toggle with `[ sound ]`), section-change glitches, and a top bar with clock and "% downloaded". Type **lain** anywhere for an easter egg.

## Assets

The original files live in `assets-src/` (they're kept out of `public/` so the 31 MB of originals don't ship). `npm run assets` builds what the site serves:

| Source | Output | Script |
|---|---|---|
| `assets-src/wallpapers/wp-*.jpg/png` | `public/assets/img/wallpapers/wp-*-{800,1600}.{webp,avif}` | `scripts/optimize-images.mjs` (sharp) |
| `assets-src/gif/*.gif` | `public/assets/video/*.{mp4,webm}` + poster frames in `img/frames/` | `scripts/gif-to-video.sh` (ffmpeg) |
| `assets-src/model/scene.gltf` (+bin, textures) | `public/assets/models/retro-pc/` | `scripts/copy-model.sh` |

### What you can replace

- **Character portraits:** `public/assets/img/characters/{alice,chisa,eiri,yasuo,mika,knights,mib}.webp` (560×616, cropped from the originals in `assets-src/characters/`; sources listed in `assets-src/characters/SOURCES.md`). Replace any file to swap a portrait. If one is missing, a generated "no image" portrait is used.
- **Ambient audio:** the hum is synthesized with WebAudio. To use a recording instead, add `public/assets/audio/hum.mp3` and set `USE_FILE = true` in `src/utils/audio.js`.
- **Hero feed:** replace `assets-src/gif/lain_glitch.gif` and run `npm run assets`. Light figures on a black background work best, because the screen uses additive blending.
- **Monitor screen feed:** `lain_on_pc` → same process.

If any of these files is missing, the page falls back to a procedural placeholder (static or noise) and the build still succeeds. Search the code for `TODO(asset)`.

## Accessibility & performance

- `prefers-reduced-motion`: no glitches, flashes, parallax or smooth scroll. The themes section becomes a vertical stack, the boot sequence fades, and everything else uses plain fades.
- No more than about 1 flash per second anywhere. Glitch bursts happen every 4–9 s at most.
- Mobile / coarse pointer: fewer particles, no post-processing, no custom cursor, vertical themes.
- WebGL renders only while its canvas is on screen (IntersectionObserver). Pixel ratio is capped at 1.5.
- The Wired scene code, model and video load lazily as you approach that section.
- Semantic landmarks, a skip link, keyboard-focusable cards, rows and gallery items, Esc closes the lightbox, and a no-WebGL fallback.

## Project structure

```
src/
├── main.js                 orchestration (boot → sections → reveal)
├── styles/                 base.css · crt.css · sections.css
├── webgl/                  Scene.js (base + post) · HeroScene.js · WiredScene.js
│   └── shaders/            crt.frag · noise.frag · glitch.frag · screen.vert · common.glsl
├── animations/             scroll.js (Lenis+ST) · boot.js · text.js · cursor.js · transitions.js
├── sections/               hero · about · wired · characters · themes · episodes · gallery · cta · system
└── utils/                  loader.js · audio.js · reducedMotion.js · katakana.js
```

## Credits

Fan site with no affiliation. *serial experiments lain* © 1998 Triangle Staff / Pioneer LDC. All artwork belongs to its creators.
3D model "Computer – Serial Experiments Lain" by sharkie3D, used under the Sketchfab Standard license (`public/assets/models/retro-pc/license.txt`).
