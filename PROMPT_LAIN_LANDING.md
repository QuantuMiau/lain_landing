# PROMPT PARA CLAUDE CODE — Landing "serial experiments lain"

> Copia todo lo que está debajo de la línea y pégalo en Claude Code (o guarda este archivo en la raíz del proyecto y dile: "Lee PROMPT_LAIN_LANDING.md y ejecútalo").

---

## ROL Y OBJETIVO

Eres un creative developer senior especializado en WebGL, motion design y experiencias "awwwards". Vas a construir una **landing page promocional de la serie de anime _serial experiments lain_ (1998)**. La prioridad #1 es el **impacto visual y la atmósfera**: tiene que sentirse como entrar a **The Wired** desde una NAVI de finales de los 90. No es una web corporativa; es una experiencia inmersiva, inquietante, glitcheada y hermosa.

Antes de escribir código, usa las skills instaladas (frontend-design, gsap, threejs, animejs) y propón en 10–15 líneas la dirección de arte y la arquitectura. Luego construye sin pedirme confirmación en cada paso.

## STACK TÉCNICO (obligatorio)

- **Vite + JavaScript vanilla (ES modules)**. Nada de React, mantenlo ligero.
- **Three.js** (última versión) + `three/examples/jsm` → `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `GlitchPass`, `ShaderPass`, `GLTFLoader`.
- **GSAP + ScrollTrigger** para toda la coreografía ligada al scroll (pin, scrub, parallax, transiciones entre secciones). GSAP es 100% gratis incluyendo plugins: usa también `SplitText` y `ScrambleTextPlugin`.
- **Lenis** para smooth scroll, sincronizado con ScrollTrigger (`lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker`).
- **anime.js v4** (sintaxis v4: `animate()`, `createTimeline()`, `stagger()`; NUNCA `anime({targets})` de v3) para micro-animaciones: tipeo de terminal, parpadeo de cursores, staggers de grids, SVG line drawing de cables.
- Regla: **ScrollTrigger manda en el scroll**, anime.js solo para animaciones autónomas/hover. No uses `onScroll` de anime.js para no duplicar sistemas.
- Shaders GLSL propios para: CRT (scanlines + curvatura + vignette + aberración cromática), ruido/estática de TV, y RGB-split glitch.

## DIRECCIÓN DE ARTE

**Mood:** psicológico, solitario, tecnológico-analógico, onírico. Ciberpunk de suburbio japonés de los 90, no neón de Blade Runner.

**Paleta:**
- Fondo: `#050505` / `#0a0a0f` (negro casi puro)
- Texto principal: `#d8d2c4` (blanco hueso, como el de la imagen de referencia)
- Acento 1: `#e07a96` (rosa/magenta apagado — los bordes del GIF de Lain)
- Acento 2: `#ff2a2a` (rojo sangre, usar MUY poco: sombras de Lain, alertas)
- Acento 3: `#7fd8ff` / `#3cff9e` (cian y verde fósforo de terminal, para UI y código)
- Glitch: separación RGB pura (`#ff0040`, `#00ffd5`)

**Tipografía (Google Fonts, gratis):**
- Display: `"Major Mono Display"` o `"Syne Mono"` para títulos gigantes
- Terminal/UI: `"VT323"` y `"Share Tech Mono"`
- Japonés: `"DotGothic16"` o `"Noto Sans JP"` para katakana decorativo (レイン, ワイヤード)
- Todo en **minúsculas** para títulos (el logo oficial de la serie está en minúsculas).

**Texturas y motivos recurrentes (úsalos en toda la web):**
- Scanlines horizontales (como la imagen de referencia: Lain dibujada con líneas horizontales)
- Cables y postes de luz con el zumbido eléctrico (motivo visual clave de la serie)
- Estática de TV, ruido, interferencia, frames que se "saltan"
- Ventanas tipo OS retro (barra de título, botones, bordes de 1px), cursores parpadeantes, prompts `>`
- Texto repetido / corrupto, katakana flotando, hex dumps, direcciones IP falsas
- Sombras con manchas rojas (las sombras de la ciudad en la serie tienen puntos rojos)
- Frases recurrentes cortas: "present day, present time", "let's all love lain", "close the world, open the nExt", "no matter where you go, everyone's connected"

**Cursor custom:** cuadrito/cruz de 1px que deja un trail RGB-split. En hover sobre links: texto scrambleado.

## ASSETS (ya descargados por mí en `/public/assets/`)

```
public/assets/
├── gif/
│   ├── lain-glitch.gif        ← GIF principal (Lain con scanlines, fondo negro). Úsalo en el HERO.
│   └── lain-*.gif             ← otros GIFs extra
├── img/wallpapers/
│   ├── wp-01.jpg ... wp-15.jpg  ← wallpapers de alta resolución
├── models/
│   └── retro-pc.glb           ← PC/monitor CRT low-poly para la escena 3D
├── textures/                  ← (opcional) noise, static
└── audio/
    └── hum.mp3                ← (opcional) zumbido eléctrico ambiental
```

- Si algún archivo no existe, crea un **placeholder procedural** (canvas/shader) y deja un `TODO` claro; nunca rompas el build.
- Convierte los JPG a **WebP/AVIF** con `vite-imagetools` o un script de `sharp`, con `srcset`.
- Para el GIF: además de `<img>`, conviértelo a **MP4/WebM** con ffmpeg (`-preset veryfast`) para usarlo como `VideoTexture` en Three.js (los GIF no sirven como textura animada directa).

## ESTRUCTURA DE SECCIONES

Cada sección es un "Layer" (así se llaman los episodios). Usa numeración `layer:01`, `layer:02`…

### 0. BOOT / LOADER
- Pantalla negra → secuencia de arranque de terminal tipo BIOS de la NAVI (texto tipeado con anime.js, líneas que suben rápido: `copland os enterprise`, chequeo de memoria, `connecting to the wired...`).
- Barra de progreso real (LoadingManager de Three.js).
- Al terminar: flash blanco + glitch fuerte + apagón tipo CRT (la imagen colapsa a una línea horizontal y luego se expande) para revelar el hero.

### 1. HERO — "present day, present time"
- Escena Three.js a pantalla completa: el **GIF de Lain** como `VideoTexture` en un plano con el **shader CRT** (scanlines animadas, aberración cromática que aumenta con el movimiento del mouse, curvatura de pantalla).
- Detrás: partículas/katakana flotando en profundidad + cables (líneas con `TubeGeometry` o `Line2`) que oscilan suavemente.
- Título enorme `serial experiments lain` con SplitText: cada letra entra con glitch RGB escalonado.
- Mouse-parallax en 3 capas (cámara, partículas, título).
- `GlitchPass` disparado aleatoriamente cada 4–9 s, muy breve.
- Indicador de scroll: `> scroll to connect_` con cursor parpadeante.

### 2. LAYER:01 — ¿QUÉ ES LAIN?
- Sinopsis corta (escríbela tú, original, 2 párrafos): Lain Iwakura, una chica de 14 años, introvertida, recibe un correo de una compañera de clase que se suicidó días antes, diciendo que no está muerta, solo abandonó su cuerpo y vive en The Wired. Lain empieza a explorar la red y la frontera entre lo real y lo virtual se disuelve.
- Datos en formato ficha técnica / ventana de OS: 1998 · 13 episodios ("layers") · dirección Ryūtarō Nakamura · guion Chiaki J. Konaka · diseño de personajes Yoshitoshi ABe · estudio Triangle Staff · opening "Duvet" de Bôa.
- Transición: el texto aparece como si se "descargara" (ScrambleText de caracteres random → texto final).
- Wallpaper de fondo con parallax lento y máscara de scanlines.

### 3. LAYER:02 — THE WIRED (sección 3D principal)
- Sección **pineada** (~300vh de scroll) con ScrollTrigger + scrub.
- La cámara de Three.js viaja a través de un túnel/red de cables, postes eléctricos low-poly y nodos de datos luminosos. Conforme avanza el scroll: realidad (ciudad, cables) → transición → The Wired (wireframe, todo se vuelve malla y partículas).
- Cargar `retro-pc.glb`: el monitor CRT aparece en el centro, la cámara se acerca y "entra" en la pantalla (el monitor muestra otra textura de Lain/estática) → transición a la siguiente sección.
- Textos cortos superpuestos que aparecen en puntos del scroll ("no matter where you go, everyone's connected").

### 4. LAYER:03 — PERSONAJES
- Grid de "archivos de usuario" estilo ventanas de OS: Lain Iwakura, Alice Mizuki, Chisa Yomoda, Masami Eiri, Yasuo Iwakura (el padre), Mika Iwakura, los Knights, los Men in Black. Escribe una línea original para cada uno.
- Hover: la ventana tiembla, la imagen se glitchea (shader en canvas o CSS `clip-path` + capas RGB desplazadas) y aparece el nombre en katakana.
- Lain tiene 2 versiones: al hover sobre su tarjeta cambia de "Lain tímida" a "Lain de The Wired" (sonrisa, mirada fija).
- Entrada con stagger de anime.js en grid (desde el centro).

### 5. LAYER:04 — TEMAS / IDEAS
- Scroll horizontal pineado con 4–5 paneles: identidad · comunicación y aislamiento · la red como inconsciente colectivo · Dios y tecnología · memoria y realidad.
- Cada panel: palabra gigante de fondo (outline, movimiento parallax opuesto) + texto corto + imagen con efecto de distorsión al entrar (displacement shader o `clip-path` animado).

### 6. LAYER:05 — LOS 13 LAYERS (episodios)
- Lista tipo terminal / file explorer: `layer:01 weird`, `layer:02 girls`, `layer:03 psyche`, `layer:04 religion`, `layer:05 distortion`, `layer:06 kids`, `layer:07 society`, `layer:08 rumors`, `layer:09 protocol`, `layer:10 love`, `layer:11 infornography`, `layer:12 landscape`, `layer:13 ego`.
- Al hover cada fila se "selecciona" (fondo invertido), sonido de clic opcional, y aparece un thumbnail flotante que sigue al cursor con lerp.
- Las filas se revelan con stagger mientras se escribe el comando `> ls /layers`.

### 7. LAYER:06 — GALERÍA
- Galería de wallpapers con **parallax multi-velocidad** (columnas que se mueven a distinta velocidad con scrub).
- Click → lightbox con transición FLIP (GSAP Flip) y fondo con estática.
- Imágenes con efecto de "carga progresiva" línea por línea, como imagen en módem lento.

### 8. CTA FINAL — "close the world, open the nExt"
- Fondo negro, la frase gigante con la "x" en rojo y la "E" en mayúscula como en el original.
- Botón principal "conectarse a the wired" (dónde ver la serie) con borde que se dibuja (SVG stroke + anime.js) y glitch al hover.
- Lain (GIF) pequeña en una esquina que "te mira".
- Footer: "let's all love lain" en loop tipo marquee, créditos, aviso de fan site.

## INTERACCIONES GLOBALES

- **Transiciones entre secciones**: cada cambio de sección dispara un glitch breve (RGB split + desplazamiento de franjas horizontales) usando un overlay `<canvas>` o un pass de postprocesado.
- **Overlay CRT global**: scanlines + vignette + leve ruido animado encima de todo (CSS `pointer-events:none` o pass final), con toggle para desactivarlo.
- **Audio** (opcional, apagado por defecto): botón `[ sound: off ]` → zumbido eléctrico ambiental. Nunca autoplay.
- **Easter egg**: si el usuario escribe "lain" en el teclado, toda la web se glitchea 2 s y aparece "who are you?" .
- **Barra superior** fija tipo OS: hora real, `user: guest`, `node: 0x3A2F`, y progreso de scroll como "% downloaded".

## RENDIMIENTO Y ACCESIBILIDAD (no negociable)

- 60 fps en laptop media. `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`.
- Pausar el render de Three.js cuando el canvas no está en viewport (IntersectionObserver).
- Lazy-load de modelos y wallpapers de secciones inferiores.
- `prefers-reduced-motion`: desactiva glitches, flashes y parallax; deja fades simples. **Nada de flashes rápidos de más de 3 por segundo** (riesgo de fotosensibilidad).
- Mobile: versión simplificada (menos partículas, sin postprocesado pesado, sin scroll horizontal pineado → vertical).
- HTML semántico, `alt` en imágenes, contraste AA en el texto de lectura, navegable con teclado.
- Lighthouse ≥ 85 en performance desktop.

## ESTRUCTURA DEL PROYECTO

```
src/
├── main.js
├── styles/ (base.css, crt.css, sections.css)
├── webgl/ (Scene.js, HeroScene.js, WiredScene.js, shaders/crt.frag, glitch.frag, noise.frag)
├── animations/ (scroll.js [GSAP+Lenis], boot.js [anime.js], text.js [SplitText/Scramble], cursor.js)
├── sections/ (un módulo por sección)
└── utils/ (loader.js, audio.js, reducedMotion.js)
```

## PROCESO DE TRABAJO

1. Inicializa con `npm create vite@latest`, instala dependencias (`three gsap lenis animejs`).
2. Construye primero: estructura HTML + estilos base + overlay CRT + Lenis/ScrollTrigger.
3. Luego: Boot → Hero (Three.js + shader CRT con el GIF) → The Wired → resto de secciones.
4. Después de cada sección grande, levanta `npm run dev`, revisa visualmente (con Playwright/screenshot si está disponible) y corrige.
5. Al final: pasada de pulido (timings, easings, coherencia de paleta), test de reduced-motion y mobile, `npm run build` sin errores.
6. Entrégame un README con cómo correrlo y qué assets reemplazar.

## LO QUE NO QUIERO

- Nada que parezca template genérico de IA (gradientes morados, cards redondeadas con sombra suave, emojis, Inter/Roboto).
- Nada de colores saturados tipo neón cyberpunk genérico: esto es oscuro, silencioso y perturbador.
- No copies textos de Wikipedia: escribe copy original, breve y poético.
- No uses sintaxis de anime.js v3.
