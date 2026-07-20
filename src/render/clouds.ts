import * as THREE from 'three';

/**
 * Low-poly clouds via InstancedMesh (single draw call).
 * Zero-detail icosahedrons give the faceted aesthetic with minimal vertex count.
 * Placed once at scene init; no per-frame updates needed.
 */
export function createClouds(scene: THREE.Scene): void {
  const geom = new THREE.IcosahedronGeometry(1, 0);
  const mat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });

  const group = new THREE.Group();
  group.name = 'clouds';

  const clouds = generateCloudPositions();
  const mesh = new THREE.InstancedMesh(geom, mat, clouds.length);
  mesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i];
    dummy.position.set(c.x, c.y, c.z);
    dummy.scale.set(c.sx, c.sy, c.sz);
    dummy.rotation.set(c.rx, c.ry, c.rz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  group.add(mesh);
  scene.add(group);
}

interface Puff {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rx: number;
  ry: number;
  rz: number;
}

function generateCloudPositions(): Puff[] {
  const puffs: Puff[] = [];
  const count = 10;
  const rng = mulberry32(7777);

  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 50 + rng() * 100;
    const cx = Math.cos(angle) * radius;
    const cz = Math.sin(angle) * radius;
    const cy = 35 + rng() * 30;

    const puffsPerCloud = 3 + Math.floor(rng() * 3);
    for (let j = 0; j < puffsPerCloud; j++) {
      const sx = 4 + rng() * 8;
      const sz = 4 + rng() * 8;
      puffs.push({
        x: cx + (rng() - 0.5) * 16,
        y: cy + (rng() - 0.5) * 3,
        z: cz + (rng() - 0.5) * 16,
        sx,
        sy: 1.5 + rng() * 2,
        sz,
        rx: rng() * 0.3,
        ry: rng() * Math.PI * 2,
        rz: rng() * 0.3,
      });
    }
  }

  return puffs;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
