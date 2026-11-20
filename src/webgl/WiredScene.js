import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Scene } from './Scene.js';
import screenVert from './shaders/screen.vert?raw';
import noiseFrag from './shaders/noise.frag?raw';
import { lazyManager, track, loadVideo } from '../utils/loader.js';
import { env } from '../utils/reducedMotion.js';

const SPACING = 14;
const POLES = 11;
const END_Z = -150; // monitor position
const RUN_END = 0.78; // progress at which the corridor run ends

const ss = THREE.MathUtils.smoothstep;
const lerp = THREE.MathUtils.lerp;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const C_SKY_REAL = new THREE.Color(0x15151a);
const C_SKY_WIRED = new THREE.Color(0x050508);
const C_CABLE_REAL = new THREE.Color(0x3a3a40);
const C_CABLE_WIRED = new THREE.Color(0x7fd8ff);

// cable shader: sways in the "wind", fades with depth (manual fog)
const cableVert = /* glsl */ `
  attribute float aBell;
  uniform float uTime;
  uniform float uSway;
  varying float vFog;
  void main() {
    vec3 p = position;
    float w = sin(uTime * 0.8 + p.z * 0.07 + p.x * 0.2);
    p.y -= w * 0.35 * aBell * uSway;
    p.x += cos(uTime * 0.6 + p.z * 0.05) * 0.2 * aBell * uSway;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vFog = smoothstep(90.0, 8.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const cableFrag = /* glsl */ `
  #include <crt_common>
  uniform vec3 uColor;
  uniform vec3 uFogColor;
  uniform float uOpacity;
  varying float vFog;
  void main() {
    gl_FragColor = vec4(mix(uFogColor, uColor, vFog), uOpacity);
    #include <colorspace_fragment>
  }
`;

const flowVert = /* glsl */ `
  attribute float aSpeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vA;
  void main() {
    vec3 p = position;
    p.z = mod(p.z + uTime * aSpeed * 6.0 + 160.0, 160.0) - 155.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.5 + aSpeed * 2.0) * uPixelRatio * (30.0 / -mv.z);
    vA = smoothstep(80.0, 4.0, -mv.z);
  }
`;
const flowFrag = /* glsl */ `
  #include <crt_common>
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vA;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (max(abs(c.x), abs(c.y)) > 0.5) discard;
    gl_FragColor = vec4(uColor * vA * uOpacity, 1.0);
    #include <colorspace_fragment>
  }
`;

export class WiredScene extends Scene {
  constructor(canvas) {
    super(canvas, { bloom: { strength: 0.6, radius: 0.5, threshold: 0.25 } });
    this.camera.fov = 55;
    this.camera.far = 220;
    this.camera.updateProjectionMatrix();
    this.progress = 0;
    this.wired = 0;
    this.screenCenter = new THREE.Vector3(0, 6.4, END_Z + 2.3);
    this.lookTarget = new THREE.Vector3();
    this.mouse = new THREE.Vector2();
    this.mouseTarget = new THREE.Vector2();

    this.scene.background = C_SKY_REAL.clone();
    this.scene.fog = new THREE.Fog(C_SKY_REAL.clone(), 6, 80);

    this._buildGround();
    this._buildPoles();
    this._buildCity();
    this._buildCables();
    this._buildNodes();
    this._buildFlow();
    this._buildMonitorPlaceholder();

    window.addEventListener('pointermove', (e) => {
      this.mouseTarget.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    }, { passive: true });

    this.resize();
    this.setProgress(0);
    this.markReady();
  }

  /* ---------------- builders ---------------- */
  _buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 220),
      new THREE.MeshBasicMaterial({ color: 0x0a0a0c, transparent: true })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -80;
    this.ground = ground;
    this.scene.add(ground);

    this.grid = new THREE.GridHelper(220, 110, 0xe07a96, 0x3cff9e);
    this.grid.position.set(0, 0.02, -80);
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0;
    this.grid.material.depthWrite = false;
    this.scene.add(this.grid);

    // shadows with red specks, a recurring image from the series
    const n = env.mobile ? 500 : 1400;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      p[i * 3] = side * (2 + Math.random() * 9);
      p[i * 3 + 1] = 0.05;
      p[i * 3 + 2] = -Math.random() * 150 + 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.redDots = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xff2a2a, size: 0.09, transparent: true, opacity: 0.85 }));
    this.scene.add(this.redDots);
  }

  _poleGeometry() {
    const parts = [];
    const post = new THREE.BoxGeometry(0.34, 16, 0.34);
    post.translate(0, 8, 0);
    parts.push(post);
    [[13.4, 4.4], [11.8, 3.2]].forEach(([y, w]) => {
      const bar = new THREE.BoxGeometry(w, 0.18, 0.2);
      bar.translate(0, y, 0);
      parts.push(bar);
      [-1, -0.33, 0.33, 1].forEach((s) => {
        const ins = new THREE.CylinderGeometry(0.08, 0.1, 0.36, 6);
        ins.translate((s * w) / 2.2, y + 0.26, 0);
        parts.push(ins);
      });
    });
    const tr = new THREE.BoxGeometry(0.9, 1.1, 0.9); // transformer box
    tr.translate(0.55, 9.4, 0);
    parts.push(tr);
    return mergeGeometries(parts.map((g) => g.toNonIndexed()));
  }

  _buildPoles() {
    const geo = this._poleGeometry();
    const count = POLES * 2;
    this.poleSolid = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x08080a, transparent: true }), count);
    this.poleWire = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x7fd8ff, wireframe: true, transparent: true, opacity: 0 }), count);
    this.poleTops = []; // crossbar anchor points for cables
    const m = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < POLES; i++) {
      for (const side of [-1, 1]) {
        const x = side * (7 + (i % 3) * 0.4);
        const z = 4 - i * SPACING - (side > 0 ? SPACING * 0.5 : 0);
        m.makeTranslation(x, 0, z);
        this.poleSolid.setMatrixAt(k, m);
        this.poleWire.setMatrixAt(k, m);
        this.poleTops.push({ x, z, side, i });
        k++;
      }
    }
    this.scene.add(this.poleSolid, this.poleWire);
  }

  _buildCity() {
    // low houses / blocks behind the poles: the suburb
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const n = 46;
    this.citySolid = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0x0c0c0f, transparent: true }), n);
    this.cityWire = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xe07a96, wireframe: true, transparent: true, opacity: 0 }), n);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const pos = new THREE.Vector3(side * (12 + Math.random() * 10), 0, 6 - (i / 2) * 7 - Math.random() * 4);
      const scl = new THREE.Vector3(4 + Math.random() * 5, 3 + Math.random() * 8, 4 + Math.random() * 5);
      m.compose(pos, q, scl);
      this.citySolid.setMatrixAt(i, m);
      this.cityWire.setMatrixAt(i, m);
    }
    this.scene.add(this.citySolid, this.cityWire);
  }

  _buildCables() {
    const pos = [];
    const bell = [];
    const SEG = 24;
    const addCable = (a, b, sag) => {
      for (let s = 0; s < SEG; s++) {
        for (const t of [s / SEG, (s + 1) / SEG]) {
          const k = 4 * t * (1 - t);
          pos.push(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - sag * k, a.z + (b.z - a.z) * t);
          bell.push(k);
        }
      }
    };
    const left = this.poleTops.filter((p) => p.side < 0);
    const right = this.poleTops.filter((p) => p.side > 0);
    const offs = [[13.6, -1.95], [13.6, -0.65], [13.6, 0.65], [13.6, 1.95], [12.05, -1.4], [12.05, 1.4]];
    for (const line of [left, right]) {
      for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i + 1];
        offs.forEach(([y, dx], j) => {
          addCable(new THREE.Vector3(a.x + dx, y, a.z), new THREE.Vector3(b.x + dx, y, b.z), 1.1 + j * 0.15);
        });
      }
    }
    // wires crossing the street
    for (let i = 0; i < POLES; i++) {
      const a = left[i], b = right[i];
      if (!a || !b) continue;
      addCable(new THREE.Vector3(a.x + 1.9, 13.6, a.z), new THREE.Vector3(b.x - 1.9, 13.6, b.z), 1.6);
      if (i % 2 === 0) addCable(new THREE.Vector3(a.x, 9.4, a.z), new THREE.Vector3(b.x, 11.8, b.z), 2.4);
    }
    // service drops into the houses
    for (const p of this.poleTops) {
      addCable(new THREE.Vector3(p.x, 9.4, p.z), new THREE.Vector3(p.side * 14, 6, p.z + 3), 0.8);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aBell', new THREE.Float32BufferAttribute(bell, 1));
    this.cableMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSway: { value: env.reduced ? 0 : 1 },
        uColor: { value: C_CABLE_REAL.clone() },
        uFogColor: { value: C_SKY_REAL.clone() },
        uOpacity: { value: 1 },
      },
      vertexShader: cableVert,
      fragmentShader: cableFrag,
      transparent: true,
    });
    this.cables = new THREE.LineSegments(g, this.cableMat);
    this.cables.frustumCulled = false;
    this.scene.add(this.cables);
  }

  _buildNodes() {
    const n = env.mobile ? 40 : 80;
    this.nodes = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.35, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0 }),
      n
    );
    this.nodeData = [];
    const palette = [new THREE.Color(0xe07a96), new THREE.Color(0x7fd8ff), new THREE.Color(0x3cff9e)];
    for (let i = 0; i < n; i++) {
      this.nodeData.push({
        p: new THREE.Vector3((Math.random() * 2 - 1) * 9, 1 + Math.random() * 14, -Math.random() * 110 + 2),
        s: 0.5 + Math.random() * 1.4,
        r: Math.random() * Math.PI,
        v: 0.3 + Math.random(),
      });
      this.nodes.setColorAt(i, palette[i % 3]);
    }
    this.scene.add(this.nodes);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3();
  }

  _buildFlow() {
    const n = env.mobile ? 700 : 2400;
    const p = new Float32Array(n * 3);
    const sp = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 14;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = 6 + Math.sin(a) * r * 0.7;
      p[i * 3 + 2] = -Math.random() * 160 + 5;
      sp[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(sp, 1));
    this.flowMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x3cff9e) },
        uOpacity: { value: 0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
      },
      vertexShader: flowVert,
      fragmentShader: flowFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.flow = new THREE.Points(g, this.flowMat);
    this.flow.frustumCulled = false;
    this.scene.add(this.flow);
  }

  _buildMonitorPlaceholder() {
    this.monitor = new THREE.Group();
    this.monitor.position.set(0, 0, END_Z);
    this.scene.add(this.monitor);

    this.screenMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null },
        uHasMap: { value: 0 },
        uTime: { value: 0 },
        uStatic: { value: 0.3 },
        uBright: { value: 1.25 },
      },
      vertexShader: screenVert,
      fragmentShader: noiseFrag,
      fog: false,
    });
    // TODO(asset): until retro-pc loads, this bare static screen stands in for it
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.screenMat);
    this.screen.scale.set(6.9, 5.1, 1);
    this.screen.position.copy(this.screenCenter).sub(this.monitor.position);
    this.monitor.add(this.screen);

    const key = new THREE.PointLight(0xe07a96, 35, 30, 1.6);
    key.position.set(0, 9, 6);
    const fill = new THREE.PointLight(0x7fd8ff, 40, 30, 1.6);
    fill.position.set(-6, 4, 8);
    this.monitor.add(key, fill, new THREE.AmbientLight(0xffffff, 0.35));
  }

  /** Lazy-load the GLB/GLTF monitor and the screen feed. Safe to call repeatedly. */
  load() {
    if (this._loading) return;
    this._loading = true;

    track(lazyManager, 'screen-video', loadVideo('/assets/video/lain_on_pc')).then((v) => {
      if (!v) return;
      const tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.NoColorSpace; // raw sRGB values, converted in-shader
      this.screenMat.uniforms.uMap.value = tex;
      this.screenMat.uniforms.uHasMap.value = 1;
      this.screenVideo = v;
    });

    new GLTFLoader(lazyManager).load(
      '/assets/models/retro-pc/scene.gltf',
      (gltf) => {
        const model = gltf.scene;
        const S = 2.2;
        model.scale.setScalar(S);
        model.rotation.y = -Math.PI / 2; // screen faces +X in the file → turn it to face the street (+Z)
        model.traverse((o) => {
          if (o.isMesh) {
            o.material.emissive = new THREE.Color(0xffffff);
            o.material.emissiveMap = o.material.map;
            o.material.emissiveIntensity = 0.18;
          }
        });
        this.monitor.add(model);
        // screen sits on the +X face in model space (measured from the asset)
        const local = new THREE.Vector3(1.03, 2.78, -0.02).multiplyScalar(S);
        local.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
        this.screen.position.copy(local);
        this.screen.scale.set(3.3 * S, 2.45 * S, 1);
        this.screenCenter.copy(this.monitor.position).add(local);
        this.model = model;
      },
      undefined,
      () => console.warn('[wired] retro-pc model missing, keeping placeholder screen') // TODO(asset)
    );
  }

  /* ---------------- scroll driven ---------------- */
  setProgress(p) {
    this.progress = p;
    const w = ss(p, 0.26, 0.52);
    this.wired = w;

    const sky = C_SKY_REAL.clone().lerp(C_SKY_WIRED, w);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.scene.fog.far = lerp(80, 120, w);
    this.cableMat.uniforms.uFogColor.value.copy(sky);
    this.cableMat.uniforms.uColor.value.copy(C_CABLE_REAL).lerp(C_CABLE_WIRED, w);
    this.cableMat.uniforms.uOpacity.value = lerp(1, 0.75, w);

    this.poleSolid.material.opacity = 1 - w;
    this.poleSolid.visible = w < 0.99;
    this.citySolid.material.opacity = 1 - w;
    this.citySolid.visible = w < 0.99;
    this.poleWire.material.opacity = w * 0.45;
    this.cityWire.material.opacity = w * 0.3;
    this.ground.material.opacity = 1 - w;
    this.redDots.material.opacity = 0.85 * (1 - w);
    this.grid.material.opacity = w * 0.22;
    this.nodes.material.opacity = w;
    this.flowMat.uniforms.uOpacity.value = w * 0.9;

    // the screen dissolves into static as we fall into it
    const dive = ss(p, 0.9, 1);
    this.screenMat.uniforms.uStatic.value = lerp(0.3, 1, dive);
  }

  _cameraAt(p, out, look) {
    if (p <= RUN_END) {
      const t = easeInOut(p / RUN_END);
      const z = lerp(12, END_Z + 24, t);
      out.set(Math.sin(t * Math.PI * 2) * 0.9, 2.6 + Math.sin(t * Math.PI * 3) * 0.35, z);
      look.set(out.x * 0.4, lerp(5.5, this.screenCenter.y, t), z - 22);
    } else {
      const t = easeInOut((p - RUN_END) / (1 - RUN_END));
      const start = new THREE.Vector3(0, 2.6, END_Z + 24);
      const end = this.screenCenter.clone().add(new THREE.Vector3(0, 0, 1.2));
      out.lerpVectors(start, end, t);
      look.copy(this.screenCenter);
    }
  }

  onResize() {
    this.flowMat && (this.flowMat.uniforms.uPixelRatio.value = this.renderer.getPixelRatio());
  }

  update(dt, t) {
    const k = env.reduced ? 0 : 1;
    this.mouse.lerp(this.mouseTarget, 1 - Math.pow(0.002, dt));
    this._cameraAt(this.progress, this.camera.position, this.lookTarget);
    const near = 1 - ss(this.progress, 0.85, 1);
    this.camera.position.x += this.mouse.x * 0.6 * k * near;
    this.camera.position.y += this.mouse.y * 0.35 * k * near;
    this.camera.lookAt(this.lookTarget);

    this.cableMat.uniforms.uTime.value = t;
    this.flowMat.uniforms.uTime.value = t * k;
    this.screenMat.uniforms.uTime.value = t;

    if (this.wired > 0.01) {
      const d = this.nodeData;
      for (let i = 0; i < d.length; i++) {
        const n = d[i];
        this._e.set(n.r + t * n.v * k, n.r * 2 + t * 0.5 * n.v * k, 0);
        this._q.setFromEuler(this._e);
        this._s.setScalar(n.s * this.wired * (1 + Math.sin(t * 2 + i) * 0.12 * k));
        this._m.compose(n.p, this._q, this._s);
        this.nodes.setMatrixAt(i, this._m);
      }
      this.nodes.instanceMatrix.needsUpdate = true;
    }
  }
}
