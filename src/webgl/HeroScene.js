import * as THREE from 'three';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { Scene, cablePoints } from './Scene.js';
import screenVert from './shaders/screen.vert?raw';
import crtFrag from './shaders/crt.frag?raw';
import { bootManager, track, loadVideo } from '../utils/loader.js';
import { makeKanaAtlas } from '../utils/katakana.js';
import { env } from '../utils/reducedMotion.js';

const kanaVert = /* glsl */ `
  attribute float aGlyph;
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vGlyph;
  varying float vFade;
  varying float vPhase;
  void main() {
    vec3 p = position;
    // slow upward drift, wrapping vertically
    p.y = mod(p.y + uTime * (0.12 + aPhase * 0.25) + 9.0, 18.0) - 9.0;
    p.x += sin(uTime * 0.3 + aPhase * 6.28) * 0.15;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (24.0 / -mv.z);
    vGlyph = aGlyph;
    vPhase = aPhase;
    vFade = smoothstep(34.0, 6.0, -mv.z) * smoothstep(0.5, 3.0, -mv.z);
  }
`;
const kanaFrag = /* glsl */ `
  #include <crt_common>
  uniform sampler2D uAtlas;
  uniform float uCols;
  uniform float uTime;
  varying float vGlyph;
  varying float vFade;
  varying float vPhase;
  void main() {
    // glyph swaps every so often, like a corrupted feed
    float g = mod(vGlyph + floor(uTime * (0.4 + vPhase)), uCols * uCols);
    vec2 cell = vec2(mod(g, uCols), floor(g / uCols));
    vec2 uv = (cell + vec2(gl_PointCoord.x, gl_PointCoord.y)) / uCols;
    float a = texture2D(uAtlas, uv).r;
    vec3 bone = vec3(0.85, 0.82, 0.77);
    vec3 pink = vec3(0.88, 0.48, 0.59);
    vec3 col = mix(bone, pink, step(0.78, vPhase));
    float flicker = 0.75 + 0.25 * sin(uTime * 3.0 + vPhase * 40.0);
    gl_FragColor = toOutput(col * a * vFade * flicker * 0.55, 1.0);
  }
`;

export class HeroScene extends Scene {
  constructor(canvas) {
    super(canvas, { bloom: { strength: 0.55, radius: 0.5, threshold: 0.22 } });
    this.camera.position.set(0, 0, 7);
    this.mouse = new THREE.Vector2();
    this.mouseTarget = new THREE.Vector2();
    this.velocity = 0;
    this.cables = [];

    if (this.composer) {
      this.glitchPassStock = new GlitchPass(64);
      this.glitchPassStock.enabled = false;
      this.composer.insertPass(this.glitchPassStock, this.composer.passes.length - 1);
    }

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.scene.fog = new THREE.Fog(0x050505, 10, 40);

    this._buildScreen();
    this._buildCables();
    this._load();
    this.resize();

    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -((e.clientY / window.innerHeight) * 2 - 1);
      this.velocity += Math.hypot(nx - this.mouseTarget.x, ny - this.mouseTarget.y);
      this.mouseTarget.set(nx, ny);
    }, { passive: true });
  }

  async _load() {
    const fontReady = track(bootManager, 'fonts', Promise.race([
      document.fonts.load('48px "DotGothic16"').then(() => document.fonts.ready),
      new Promise((r) => setTimeout(r, 4000)),
    ]));
    const video = track(bootManager, 'hero-video', loadVideo('/assets/video/lain_glitch'));

    await fontReady;
    this._buildKana();
    const v = await video;
    if (v) {
      const tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.NoColorSpace; // raw sRGB values, converted in-shader
      this.screen.material.uniforms.uMap.value = tex;
      this.screen.material.uniforms.uHasMap.value = 1;
      this.video = v;
    }
    this.markReady();
  }

  _buildScreen() {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null },
        uHasMap: { value: 0 },
        uTime: { value: 0 },
        uAberration: { value: 0 },
        uDistort: { value: 0.4 },
        uOpacity: { value: 1 },
      },
      vertexShader: screenVert,
      fragmentShader: crtFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    // source GIF is 846 x 800
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(4.6 * (846 / 800), 4.6, 1, 1), mat);
    this.world.add(this.screen);
  }

  _buildKana() {
    const { texture, cols } = makeKanaAtlas();
    const n = env.mobile ? 420 : 1300;
    const pos = new Float32Array(n * 3);
    const glyph = new Float32Array(n);
    const size = new Float32Array(n);
    const phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * 16;
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * 9;
      pos[i * 3 + 2] = -Math.random() * 30 + 1.5;
      glyph[i] = Math.floor(Math.random() * cols * cols);
      size[i] = 3 + Math.random() * 7;
      phase[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aGlyph', new THREE.BufferAttribute(glyph, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    this.kanaMat = new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: texture },
        uCols: { value: cols },
        uTime: { value: 0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
      },
      vertexShader: kanaVert,
      fragmentShader: kanaFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.kana = new THREE.Points(geo, this.kanaMat);
    this.kanaGroup = new THREE.Group();
    this.kanaGroup.add(this.kana);
    this.world.add(this.kanaGroup);
  }

  _buildCables() {
    // two power poles at the edges of the frame, wires sagging between them
    const poleMat = new THREE.MeshBasicMaterial({ color: 0x0d0d10, fog: true });
    const mkPole = (x, z) => {
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 30, 0.28), poleMat);
      g.add(post);
      [4.2, 5.4].forEach((y) => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.14), poleMat);
        bar.position.y = y;
        g.add(bar);
      });
      g.position.set(x, -9, z);
      this.world.add(g);
      return g;
    };
    const L = mkPole(-11, -12);
    const R = mkPole(13, -20);

    const lineMat = (o) => new THREE.LineBasicMaterial({ color: 0xd8d2c4, transparent: true, opacity: o, fog: true });
    const specs = [];
    [-1.6, -0.5, 0.6, 1.6].forEach((dx, i) => {
      specs.push({ a: new THREE.Vector3(L.position.x + dx, L.position.y + 5.4, L.position.z), b: new THREE.Vector3(R.position.x + dx, R.position.y + 5.4, R.position.z), sag: 2.2 + i * 0.3, o: 0.42 });
    });
    [-1.2, 0.2, 1.4].forEach((dx, i) => {
      specs.push({ a: new THREE.Vector3(L.position.x + dx, L.position.y + 4.2, L.position.z), b: new THREE.Vector3(R.position.x + dx, R.position.y + 4.2, R.position.z), sag: 3 + i * 0.4, o: 0.3 });
    });
    // wires leaving the frame
    specs.push({ a: new THREE.Vector3(-11, -3.6, -12), b: new THREE.Vector3(-30, 2, 4), sag: 3, o: 0.35 });
    specs.push({ a: new THREE.Vector3(13, -3.6, -20), b: new THREE.Vector3(34, 4, -2), sag: 3.5, o: 0.3 });
    specs.push({ a: new THREE.Vector3(-11, -4.8, -12), b: new THREE.Vector3(-8, 9, -40), sag: 1.5, o: 0.22 });

    specs.forEach((s, i) => {
      const pts = cablePoints(s.a, s.b, s.sag, 48);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, lineMat(s.o));
      this.world.add(line);
      this.cables.push({ line, ...s, phase: i * 1.7, pts });
    });
  }

  /** Short burst: stock GlitchPass + our RGB pass. */
  spike(strength = 0.6) {
    if (env.reduced || !this.composer) return;
    const gp = this.glitchPassStock;
    gp.curF = 0;
    gp.enabled = true;
    this.glitch = strength;
    clearTimeout(this._spikeT);
    this._spikeT = setTimeout(() => { gp.enabled = false; this.glitch = 0; }, 180);
  }

  onResize(w) {
    const mobile = w < 820;
    this.screen.position.set(mobile ? 0 : 1.9, mobile ? 0.55 : 0.2, 0);
    // on narrow screens fit the tube to the visible width at z = 0
    const visW = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect;
    const planeW = this.screen.geometry.parameters.width;
    this.screen.scale.setScalar(mobile ? Math.min(0.9, (visW * 1.05) / planeW) : 1);
    if (this.kanaMat) this.kanaMat.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
  }

  update(dt, t) {
    const k = env.reduced ? 0 : 1;
    this.mouse.lerp(this.mouseTarget, 1 - Math.pow(0.0015, dt));
    this.velocity *= Math.pow(0.02, dt);

    // three-layer parallax: camera, particles, screen (title is DOM-side)
    this.camera.position.x = this.mouse.x * 0.45 * k;
    this.camera.position.y = this.mouse.y * 0.3 * k;
    this.camera.lookAt(0, 0, -4);
    if (this.kanaGroup) {
      this.kanaGroup.rotation.y = this.mouse.x * 0.08 * k;
      this.kanaGroup.rotation.x = -this.mouse.y * 0.05 * k;
      this.kanaMat.uniforms.uTime.value = t;
    }
    this.screen.rotation.y = -this.mouse.x * 0.12 * k;
    this.screen.rotation.x = this.mouse.y * 0.08 * k;

    const u = this.screen.material.uniforms;
    u.uTime.value = t;
    const vel = Math.min(this.velocity, 1.5) * k;
    u.uAberration.value = vel * 0.012;
    u.uDistort.value = 0.35 + vel * 1.2;
    if (this.glitchPass) this.glitchPass.uniforms.uBase.value = 0.0006 + vel * 0.004;

    // cables sway in the wind
    for (const c of this.cables) {
      const sag = c.sag + Math.sin(t * 0.7 + c.phase) * 0.25 * k;
      const drift = Math.sin(t * 0.5 + c.phase) * 0.6 * k;
      const { a, b } = c;
      const arr = c.line.geometry.attributes.position.array;
      const n = c.pts.length - 1;
      for (let i = 0; i <= n; i++) {
        const tt = i / n;
        const bell = 4 * tt * (1 - tt);
        arr[i * 3] = a.x + (b.x - a.x) * tt;
        arr[i * 3 + 1] = a.y + (b.y - a.y) * tt - sag * bell;
        arr[i * 3 + 2] = a.z + (b.z - a.z) * tt + drift * bell;
      }
      c.line.geometry.attributes.position.needsUpdate = true;
    }
  }
}
