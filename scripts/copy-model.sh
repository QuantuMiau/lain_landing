#!/usr/bin/env bash
set -euo pipefail
OUT=public/assets/models/retro-pc
mkdir -p "$OUT/textures"
cp assets-src/model/scene.gltf assets-src/model/scene.bin assets-src/model/license.txt "$OUT/"
cp assets-src/model/textures/* "$OUT/textures/"
echo "✓ model"
