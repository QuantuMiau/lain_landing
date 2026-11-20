// Full-screen post pass: RGB split + horizontal strip displacement.
// uAmount 0..1 is driven by GSAP (section changes, random hero spikes).
uniform sampler2D tDiffuse;
uniform float uAmount;
uniform float uBase;     // always-on subtle aberration (mouse velocity)
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;

#include <crt_common>

void main() {
  vec2 uv = vUv;
  float a = uAmount;
  float strips = mix(10.0, 46.0, hash(vec2(uSeed, 1.0)));
  float s = floor(uv.y * strips);
  float n = hash(vec2(s, floor(uTime * 18.0) + uSeed));
  uv.x += (n - 0.5) * 0.16 * a * step(0.55, n);
  uv.x = fract(uv.x);

  float ca = uBase + 0.018 * a;
  vec4 c;
  c.r = texture2D(tDiffuse, uv + vec2(ca, 0.0)).r;
  c.g = texture2D(tDiffuse, uv).g;
  c.b = texture2D(tDiffuse, uv - vec2(ca, 0.0)).b;
  c.a = 1.0;
  gl_FragColor = c;
}
