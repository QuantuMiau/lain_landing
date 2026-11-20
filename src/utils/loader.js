import { LoadingManager } from 'three';

// Hero-critical assets register here; the boot progress bar reads it.
export const bootManager = new LoadingManager();
// Below-the-fold 3D (The Wired) loads lazily through its own manager.
export const lazyManager = new LoadingManager();

/** Track any promise as one item of a LoadingManager. */
export function track(manager, name, promise) {
  manager.itemStart(name);
  return promise.finally(() => manager.itemEnd(name));
}

/**
 * Create a looping, muted, inline <video> from a base path (without extension).
 * Resolves with the element when it has data, or null on failure/timeout so the
 * caller can fall back to a procedural texture instead of breaking.
 */
export function loadVideo(base, { timeout = 8000 } = {}) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    for (const [ext, type] of [['webm', 'video/webm'], ['mp4', 'video/mp4']]) {
      const s = document.createElement('source');
      s.src = `${base}.${ext}`;
      s.type = type;
      v.appendChild(s);
    }
    let done = false;
    const finish = (val) => { if (!done) { done = true; resolve(val); } };
    v.addEventListener('loadeddata', () => { v.play().catch(() => {}); finish(v); }, { once: true });
    v.addEventListener('error', () => finish(null), { once: true });
    v.lastElementChild.addEventListener('error', () => finish(null), { once: true });
    setTimeout(() => finish(v.readyState >= 2 ? v : null), timeout);
    v.load();
  });
}

export function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
