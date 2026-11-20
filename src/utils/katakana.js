import { CanvasTexture, LinearFilter } from 'three';

export const KANA = 'レインワイヤードアリスチサナイツプロトコルナビコプランドエイリマサミヤスオミカシリアルエクスペリメンツ';
export const GLITCH_CHARS = 'アイウエオカキクケコサシスセソナニヌネノ01#%/<>_=+';

/** Build an 8x8 glyph atlas texture of katakana for GPU point sprites. */
export function makeKanaAtlas(size = 512, cols = 8) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const cell = size / cols;
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${Math.floor(cell * 0.72)}px "DotGothic16", "Noto Sans JP", monospace`;
  const glyphs = [...new Set(KANA)];
  for (let i = 0; i < cols * cols; i++) {
    const ch = glyphs[i % glyphs.length];
    g.fillText(ch, (i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2);
  }
  const tex = new CanvasTexture(c);
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  return { texture: tex, cols };
}

/** Fake hex dump lines for decoration. */
export function hexDump(lines = 12, seed = 0x3a2f) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const hex = (n, w) => Math.floor(n).toString(16).padStart(w, '0');
  const out = [];
  for (let i = 0; i < lines; i++) {
    const row = Array.from({ length: 6 }, () => hex(rnd() * 255, 2)).join(' ');
    out.push(`${hex(0x0e00 + i * 16, 4)}  ${row}`);
  }
  return out.join('\n');
}
