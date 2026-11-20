#!/usr/bin/env bash
# GIF -> MP4 (h264) + WebM (vp9) for VideoTexture usage, plus a poster frame.
set -euo pipefail
SRC=assets-src/gif
OUT=public/assets/video
mkdir -p "$OUT" public/assets/gif public/assets/img/frames
for f in "$SRC"/*.gif; do
  n=$(basename "$f" .gif)
  ffmpeg -v error -y -i "$f" -movflags +faststart -pix_fmt yuv420p -preset veryfast -crf 24 \
    -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -an "$OUT/$n.mp4"
  ffmpeg -v error -y -i "$f" -c:v libvpx-vp9 -b:v 0 -crf 38 -deadline good -cpu-used 4 -row-mt 1 -pix_fmt yuv420p \
    -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -an "$OUT/$n.webm"
  ffmpeg -v error -y -i "$f" -vf "select=eq(n\,2)" -frames:v 1 -q:v 3 "public/assets/img/frames/$n.webp"
  echo "✓ $n"
done
# small GIFs are kept as <img> for the DOM (hero fallback / CTA corner)
cp "$SRC/lain_glitch.gif" public/assets/gif/lain-glitch.gif
