// TV static mixed with a video feed, used on the 3D monitor screen.
uniform sampler2D uMap;
uniform float uTime;
uniform float uStatic;   // 0 = clean feed, 1 = pure static
uniform float uHasMap;
uniform float uBright;
varying vec2 vUv;

#include <crt_common>

void main() {
  vec2 uv = crtCurve(vUv, 3.4);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = toOutput(vec3(0.0), 1.0); return; }

  float t = floor(uTime * 24.0);
  float n = hash(floor(uv * vec2(220.0, 160.0)) + t);
  float rowN = hash(vec2(floor(uv.y * 60.0), t));
  vec3 stat = vec3(n * (0.6 + 0.4 * rowN));

  vec3 feed = vec3(0.0);
  if (uHasMap > 0.5) {
    vec2 fuv = uv;
    fuv.x += (rowN - 0.5) * 0.02 * uStatic;
    feed.r = texture2D(uMap, fuv + vec2(0.003, 0.0)).r;
    feed.g = texture2D(uMap, fuv).g;
    feed.b = texture2D(uMap, fuv - vec2(0.003, 0.0)).b;
  }
  float s = uHasMap > 0.5 ? uStatic : 1.0;
  vec3 col = mix(feed, stat, s);
  col *= 0.75 + 0.25 * sin(uv.y * 700.0);
  vec2 v = uv * (1.0 - uv);
  col *= pow(clamp(v.x * v.y * 20.0, 0.0, 1.0), 0.35);
  gl_FragColor = toOutput(col * uBright, 1.0);
}
