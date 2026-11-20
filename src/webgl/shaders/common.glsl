float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
// barrel distortion of a CRT tube
vec2 crtCurve(vec2 uv, float k) {
  uv = uv * 2.0 - 1.0;
  vec2 off = abs(uv.yx) / vec2(k * 1.25, k);
  uv += uv * off * off;
  return uv * 0.5 + 0.5;
}
// Shaders here author colours in sRGB (like the source GIFs). Convert to linear
// so the composer chain and direct-to-screen rendering both look identical.
vec4 toOutput(vec3 srgb, float a) {
  return linearToOutputTexel(vec4(sRGBTransferEOTF(vec4(max(srgb, 0.0), 1.0)).rgb, a));
}
