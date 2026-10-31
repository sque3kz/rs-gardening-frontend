import * as THREE from 'three';

const materialCache = new Map();

/** Flat-shaded "low poly" material, cached per colour. */
export function mat(color, extra = {}) {
  const key = `${color}:${JSON.stringify(extra)}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0, ...extra }));
  }
  return materialCache.get(key);
}

/** Deterministic random numbers so the scenes look the same on every load. */
export function seededRandom(seed = 1) {
  let a = seed;
  const next = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (min, max) => min + next() * (max - min);
  next.pick = (list) => list[Math.floor(next() * list.length)];
  return next;
}

/** Nudge vertices for an organic, hand-made look. Shared vertices move together. */
export function jitter(geometry, amount, rand, keep = () => false) {
  const pos = geometry.attributes.position;
  const offsets = new Map();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (keep(x, y, z)) continue;
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, [rand.range(-amount, amount), rand.range(-amount, amount), rand.range(-amount, amount)]);
    const [dx, dy, dz] = offsets.get(key);
    pos.setXYZ(i, x + dx, y + dy, z + dz);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function mesh(geometry, material, { shadows = !lowPower } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = shadows;
  m.receiveShadow = shadows;
  return m;
}

export function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Springy ease used for things "popping" into existence. */
export function easeOutBack(t) {
  const c1 = 1.7, c3 = c1 + 1;
  return t <= 0 ? 0 : t >= 1 ? 1 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Phones and tablets: skip real-time shadows and other GPU-heavy extras. */
export const lowPower = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  // Phones have very dense screens; 1.5x still looks sharp and keeps scrolling smooth.
  const maxRatio = lowPower ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxRatio));
  // The shadow pass draws the whole scene a second time every frame – too much for phones.
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

/**
 * Runs `frame(time, delta)` only while the canvas is on screen and the tab is
 * visible, and keeps the renderer sized to the canvas.
 */
export function runWhenVisible(canvas, renderer, camera, frame) {
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  let onScreen = false;
  let rafId = null;
  const clock = new THREE.Clock();
  const tick = () => {
    rafId = requestAnimationFrame(tick);
    const delta = Math.min(clock.getDelta(), 0.05); // also advances elapsedTime
    frame(clock.elapsedTime, delta);
  };
  const update = () => {
    const shouldRun = onScreen && !document.hidden;
    if (shouldRun && rafId === null) { clock.getDelta(); tick(); }
    if (!shouldRun && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  };
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update(); }).observe(canvas);
  document.addEventListener('visibilitychange', update);
}

export const reducedMotion = document.documentElement.classList.contains('reduced-motion');

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}
