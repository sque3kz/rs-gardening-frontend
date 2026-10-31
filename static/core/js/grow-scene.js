/* Process section: a tree grows out of a terracotta pot as you scroll. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRenderer, easeOutBack, jitter, lowPower, mat, mesh, reducedMotion, runWhenVisible, seededRandom, smoothstep, webglAvailable } from './three-utils.js';

const canvas = document.querySelector('[data-grow-canvas]');

const C = {
  pot: 0xc9704a,
  potDark: 0xa95a3a,
  soil: 0x4a3222,
  bark: 0x7a5434,
  leaves: [0x4e9a48, 0x6cb35a, 0x3d8442, 0x86c46a],
  blossoms: [0xffffff, 0xf9c6d6, 0xf58fb4, 0xf2c14e],
};
const MAX_DEPTH = 3;

function init() {
  const rand = seededRandom(21);
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 3.2, 10.5);
  const lookTarget = new THREE.Vector3(0, 1.6, 0);

  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x8a7a5a, 1.4));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.4);
  sun.position.set(4, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 6, bottom: -2, near: 1, far: 25 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  if (lowPower) {
    // Phones: a soft painted blob under the pot instead of real-time shadows.
    const blob = document.createElement('canvas');
    blob.width = blob.height = 64;
    const ctx = blob.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(40, 30, 20, 0.32)');
    gradient.addColorStop(1, 'rgba(40, 30, 20, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blob), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0.25, 0.005, -0.2);
    scene.add(shadow);
  } else {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.18 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
  }

  const plant = new THREE.Group();
  scene.add(plant);

  /* ---------- Pot ---------- */
  const profile = [
    [0, 0], [0.62, 0], [0.7, 0.08], [0.82, 1.0], [0.95, 1.02], [0.98, 1.25], [0.88, 1.27], [0.86, 1.12], [0, 1.12],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = mesh(new THREE.LatheGeometry(profile, 12), mat(C.pot));
  plant.add(pot);
  const band = mesh(new THREE.CylinderGeometry(0.9, 0.88, 0.06, 12, 1, true), mat(C.potDark, { side: THREE.DoubleSide }));
  band.position.y = 0.9;
  plant.add(band);
  const soil = mesh(jitter(new THREE.CylinderGeometry(0.86, 0.86, 0.06, 12, 1), 0.02, rand), mat(C.soil));
  soil.position.y = 1.14;
  plant.add(soil);
  const SOIL_Y = 1.17;

  // A seed that disappears as the sprout appears.
  const seed = mesh(new THREE.IcosahedronGeometry(0.09, 0), mat(0x8a6234));
  seed.scale.set(1, 0.7, 1);
  seed.position.set(0.05, SOIL_Y + 0.03, 0.1);
  plant.add(seed);

  /* ---------- Procedural tree ---------- */
  const growables = []; // { object, start, duration, kind }
  const leafGeo = new THREE.IcosahedronGeometry(1, 0);
  const leafMat = mat(0xffffff, { vertexColors: true });
  const placer = new THREE.Object3D();

  const addLeafCluster = (parent, y, start, size) => {
    const cluster = new THREE.Group();
    cluster.position.y = y;
    // All leaves of a cluster are baked into one mesh (coloured per vertex) – one draw call instead of 3–4.
    const count = 3 + Math.floor(rand() * 2);
    const leaves = Array.from({ length: count }, () => {
      const color = new THREE.Color(rand.pick(C.leaves));
      placer.scale.setScalar(size * rand.range(0.55, 1));
      placer.position.set(rand.range(-0.3, 0.3) * size * 2, rand.range(-0.1, 0.35) * size * 2, rand.range(-0.3, 0.3) * size * 2);
      placer.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      placer.updateMatrix();
      const leaf = leafGeo.clone().applyMatrix4(placer.matrix);
      const n = leaf.attributes.position.count;
      leaf.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n }, () => [color.r, color.g, color.b]).flat(), 3));
      return leaf;
    });
    cluster.add(mesh(mergeGeometries(leaves), leafMat));
    parent.add(cluster);
    growables.push({ object: cluster, start, duration: 0.14, kind: 'pop' });

    // Blossoms arrive in the final "nurture" stage.
    for (let i = 0; i < 2; i++) {
      const blossom = mesh(new THREE.IcosahedronGeometry(0.055, 0), mat(rand.pick(C.blossoms), { roughness: 0.5 }));
      blossom.position.set(rand.range(-0.35, 0.35) * size * 2, rand.range(0.1, 0.45) * size * 2, rand.range(-0.35, 0.35) * size * 2);
      cluster.add(blossom);
      growables.push({ object: blossom, start: rand.range(0.8, 0.93), duration: 0.08, kind: 'pop' });
    }
  };

  const makeBranch = (depth, length, radius, start) => {
    const branch = new THREE.Group();
    const geo = new THREE.CylinderGeometry(radius * 0.62, radius, length, 6);
    geo.translate(0, length / 2, 0);
    branch.add(mesh(geo, mat(C.bark)));
    const duration = depth === 0 ? 0.3 : 0.16;
    growables.push({ object: branch, start, duration, kind: 'grow' });

    if (depth < MAX_DEPTH) {
      const children = depth === 0 ? 3 : 2 + (rand() > 0.6 ? 1 : 0);
      const yawOffset = rand() * Math.PI * 2;
      for (let i = 0; i < children; i++) {
        const pivot = new THREE.Group();
        pivot.position.y = length * (depth === 0 ? rand.range(0.6, 0.95) : rand.range(0.7, 1));
        pivot.rotation.y = yawOffset + (i / children) * Math.PI * 2 + rand.range(-0.3, 0.3);
        const child = makeBranch(depth + 1, length * rand.range(0.62, 0.78), radius * 0.62, start + duration * 0.75);
        child.rotation.z = rand.range(0.45, 0.85);
        pivot.add(child);
        branch.add(pivot);
      }
    }
    if (depth >= 2) addLeafCluster(branch, length, rand.range(0.55, 0.72) + depth * 0.02, 0.26 + (MAX_DEPTH - depth) * 0.06);
    return branch;
  };

  const trunk = makeBranch(0, 1.5, 0.13, 0.12);
  trunk.position.y = SOIL_Y - 0.02;
  plant.add(trunk);

  // Two baby leaves for the sprout stage, which fall away as the tree matures.
  const sprout = new THREE.Group();
  [-1, 1].forEach((side) => {
    const leaf = mesh(new THREE.SphereGeometry(0.16, 6, 4), mat(C.leaves[1]));
    leaf.scale.set(1, 0.25, 0.55);
    leaf.position.x = side * 0.15;
    leaf.rotation.z = side * 0.5;
    sprout.add(leaf);
  });
  plant.add(sprout);

  /* ---------- Falling petals for the final stage ---------- */
  const petals = Array.from({ length: 14 }, () => {
    const petal = new THREE.Mesh(new THREE.CircleGeometry(0.05, 5), new THREE.MeshStandardMaterial({ color: rand.pick(C.blossoms), side: THREE.DoubleSide }));
    petal.userData = { x: rand.range(-1.8, 1.8), z: rand.range(-1.2, 1.2), speed: rand.range(0.25, 0.5), phase: rand() * 10 };
    scene.add(petal);
    return petal;
  });

  /* ---------- Animation ---------- */
  let target = window.rsGrowProgress ?? 0;
  let progress = reducedMotion ? 1 : target;
  window.addEventListener('rs:grow', (e) => { target = e.detail.progress; });
  if (reducedMotion) target = 1;

  const apply = (p) => {
    seed.scale.setScalar(1 - smoothstep(0.04, 0.12, p));
    growables.forEach(({ object, start, duration, kind }) => {
      const t = (p - start) / duration;
      if (kind === 'grow') {
        const s = Math.max(0.0001, smoothstep(0, 1, t));
        object.scale.set(s, s, s);
      } else {
        object.scale.setScalar(Math.max(0.0001, easeOutBack(t)));
      }
      object.visible = t > 0;
    });
    const sproutT = smoothstep(0.1, 0.2, p) * (1 - smoothstep(0.5, 0.62, p));
    sprout.scale.setScalar(Math.max(0.0001, sproutT * 1.6));
    sprout.position.y = SOIL_Y + 1.5 * trunk.scale.y * 0.9;
    sprout.visible = sproutT > 0.01;
  };

  runWhenVisible(canvas, renderer, camera, (t) => {
    progress += (target - progress) * 0.08;
    apply(progress);

    // Camera eases out as the tree gets taller.
    const zoom = smoothstep(0.1, 0.8, progress);
    camera.position.set(0, 2.4 + zoom * 1.6, 8 + zoom * 3.2);
    lookTarget.y = 1.4 + zoom * 1.0;
    camera.lookAt(lookTarget);

    plant.rotation.y = (reducedMotion ? 0 : t * 0.15) + progress * Math.PI * 0.8;
    trunk.rotation.z = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.02 * progress;

    const petalAmount = smoothstep(0.88, 1, progress);
    petals.forEach((petal) => {
      const { x, z, speed, phase } = petal.userData;
      petal.visible = petalAmount > 0.01 && !reducedMotion;
      const fall = ((t * speed + phase) % 1);
      petal.position.set(x + Math.sin(t + phase) * 0.3, 4.2 - fall * 4.1, z);
      petal.rotation.set(t * 2 + phase, t * 1.5, 0);
      petal.scale.setScalar(petalAmount);
    });

    renderer.render(scene, camera);
  });
}

// Build the scene shortly before it scrolls into view rather than while the page is loading.
if (canvas && webglAvailable()) {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    init();
  }, { rootMargin: '150% 0px' });
  observer.observe(canvas);
}
