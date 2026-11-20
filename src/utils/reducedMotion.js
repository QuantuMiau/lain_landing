// Single source of truth for motion / device capability flags.
const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileQ = window.matchMedia('(max-width: 820px), (pointer: coarse)');

export const env = {
  reduced: rmq.matches,
  mobile: mobileQ.matches,
  finePointer: window.matchMedia('(pointer: fine)').matches,
};

rmq.addEventListener?.('change', (e) => { env.reduced = e.matches; });
mobileQ.addEventListener?.('change', (e) => { env.mobile = e.matches; });

export const MQ = {
  desktop: '(min-width: 821px) and (pointer: fine)',
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
};

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
