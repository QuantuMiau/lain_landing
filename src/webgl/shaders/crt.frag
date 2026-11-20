// CRT tube: curvature, rolling scanlines, chromatic aberration, noise, vignette.
// Rendered with additive blending, so black pixels vanish into the scene.
uniform sampler2D uMap;
uniform float uTime;
uniform float uAberration; // grows with mouse velocity
uniform float uDistort;    // line tearing amount
uniform float uOpacity;
uniform float uHasMap;
varying vec2 vUv;

#include <crt_common>

void main() {
  vec2 uv = crtCurve(vUv, 4.2);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }

  // horizontal tearing: random lines jump sideways, plus a slow sine wobble
  float row = floor(uv.y * 140.0);
  float tear = step(0.985, hash(vec2(row, floor(uTime * 9.0))));
  uv.x += tear * 0.035 * uDistort + sin(uv.y * 38.0 + uTime * 2.4) * 0.0018 * uDistort;

  float ab = 0.0025 + uAberration;
  vec3 col;
  if (uHasMap > 0.5) {
    col.r = texture2D(uMap, uv + vec2(ab, 0.0)).r;
    col.g = texture2D(uMap, uv).g;
    col.b = texture2D(uMap, uv - vec2(ab, 0.0)).b;
  } else {
    // TODO(asset): procedural placeholder when the hero video is missing
    float n = hash(floor(uv * vec2(160.0, 120.0)) + floor(uTime * 12.0));
    col = vec3(n) * vec3(0.88, 0.48, 0.59) * 0.5;
  }

  // scanlines + a slow rolling bright band
  float scan = 0.72 + 0.28 * sin(uv.y * 900.0);
  float band = smoothstep(0.0, 0.08, fract(uv.y * 0.6 - uTime * 0.07)) * (1.0 - smoothstep(0.08, 0.2, fract(uv.y * 0.6 - uTime * 0.07)));
  col *= scan;
  col += band * 0.06 * vec3(0.88, 0.48, 0.59);

  // static grain
  col += (hash(uv * 512.0 + fract(uTime) * 37.0) - 0.5) * 0.07;

  // tube vignette
  vec2 v = uv * (1.0 - uv);
  col *= pow(clamp(v.x * v.y * 18.0, 0.0, 1.0), 0.3);

  gl_FragColor = toOutput(col * uOpacity, 1.0);
}
