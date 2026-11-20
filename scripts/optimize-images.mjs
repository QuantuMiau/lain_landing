// Converts wallpapers in assets-src/wallpapers to WebP + AVIF at two widths.
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'assets-src/wallpapers';
const OUT = 'public/assets/img/wallpapers';
const WIDTHS = [800, 1600];

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
const meta = {};
for (const file of files) {
  const name = path.parse(file).name;
  const img = sharp(path.join(SRC, file));
  const { width, height } = await img.metadata();
  meta[name] = { w: width, h: height };
  for (const w of WIDTHS) {
    const pipe = sharp(path.join(SRC, file)).resize({ width: Math.min(w, width) });
    await pipe.clone().webp({ quality: 74 }).toFile(`${OUT}/${name}-${w}.webp`);
    await pipe.clone().avif({ quality: 50 }).toFile(`${OUT}/${name}-${w}.avif`);
  }
  console.log('✓', file, `${width}x${height}`);
}
console.log(JSON.stringify(meta));
