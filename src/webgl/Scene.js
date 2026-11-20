import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import commonGlsl from './shaders/common.glsl?raw';
import screenVert from './shaders/screen.vert?raw';
import glitchFrag from './shaders/glitch.frag?raw';
import { env } from '../utils/reducedMotion.js';

THREE.ShaderChunk.crt_common = commonGlsl;

/**
 * Base WebGL scene: renderer, resize, optional post chain, and an
 * IntersectionObserver that stops rendering while the canvas is off-screen.
 */
export class Scene {
  constructor(canvas, { post = true, bloom = { strength: 0.7, radius: 0.5, threshold: 0.15 } } = {}) {
    this.canvas = canvas;
    this.container = canvas.parentElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, env.mobile ? 1.25 : 1.5));
    this.renderer.setClearColor(0x050505, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
    this.timer = new THREE.Timer();
    this.time = 0;
    this.visible = false;
    this.running = false;

    // mobile + reduced-motion get a plain render (no heavy post)
    this.usePost = post && !env.mobile;
    if (this.usePost) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), bloom.strength, bloom.radius, bloom.threshold);
      this.composer.addPass(this.bloomPass);
      this.glitchPass = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          uAmount: { value: 0 },
          uBase: { value: 0.0008 },
          uTime: { value: 0 },
          uSeed: { value: 0 },
        },
        vertexShader: screenVert,
        fragmentShader: glitchFrag,
      });
      this.composer.addPass(this.glitchPass);
      this.composer.addPass(new OutputPass());
    }

    this._loop = this._loop.bind(this);
    this.resize = this.resize.bind(this);
    new ResizeObserver(this.resize).observe(this.container);
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.visible ? this.start() : this.stop();
    }, { rootMargin: '80px' });
    this.io.observe(this.canvas);
    // subclasses call this.resize() once their objects exist
  }

  /** Glitch strength 0..1 (no-op on mobile / reduced motion). */
  set glitch(v) {
    if (this.glitchPass && !env.reduced) {
      this.glitchPass.uniforms.uAmount.value = v;
      if (v > 0) this.glitchPass.uniforms.uSeed.value = Math.random() * 100;
    }
  }
  get glitch() { return this.glitchPass ? this.glitchPass.uniforms.uAmount.value : 0; }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
    this.onResize?.(w, h);
  }

  start() {
    if (this.running || !this.ready) return;
    this.running = true;
    this.timer.update();
    this.renderer.setAnimationLoop(this._loop);
  }

  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  /** Call once assets are in place; starts rendering if on screen. */
  markReady() {
    this.ready = true;
    if (this.visible) this.start();
  }

  _loop() {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    this.time += env.reduced ? dt * 0.25 : dt;
    this.update?.(dt, this.time);
    if (this.composer) {
      this.glitchPass.uniforms.uTime.value = this.time;
      this.composer.render(dt);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

/** Catenary-ish sagging cable between two points (cheap parabola). */
export function cablePoints(a, b, sag, segments = 40, out = []) {
  out.length = 0;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t);
    out.push(p);
  }
  return out;
}
