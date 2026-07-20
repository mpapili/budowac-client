import * as THREE from 'three';
import type { EntityState } from '../proto/types';

/** Horizontal (X/Z/yaw) lerp speed — snappy tracking. */
export const LERP_HORIZONTAL = 0.35;
/** Vertical (Y) lerp speed — slower so elevation changes look smooth. */
export const LERP_VERTICAL = 0.12;

/**
 * Remote entities: player capsules + simple goats, lerp to snapshot pose.
 */
export class RemotePlayers {
  readonly root = new THREE.Group();
  private meshes = new Map<string, THREE.Group>();
  private targets = new Map<string, { x: number; y: number; z: number; yaw: number }>();
  private kinds = new Map<string, string>();

  constructor(scene: THREE.Scene) {
    this.root.name = 'remotePlayers';
    scene.add(this.root);
  }

  /** Sync map from snapshot entities (exclude localPlayerId). */
  applyEntities(entities: Iterable<EntityState>, localPlayerId: string | null): void {
    const seen = new Set<string>();
    for (const e of entities) {
      if (!e.entityId || e.entityId === localPlayerId) continue;
      seen.add(e.entityId);
      this.targets.set(e.entityId, { x: e.x, y: e.y, z: e.z, yaw: e.yaw });
      const kind = e.kind ?? '';
      const prev = this.kinds.get(e.entityId);
      if (!this.meshes.has(e.entityId) || prev !== kind) {
        const old = this.meshes.get(e.entityId);
        if (old) {
          this.root.remove(old);
          disposeGroup(old);
        }
        const mesh = kind === 'goat' ? makeGoat() : makeAvatar(e.entityId);
        this.meshes.set(e.entityId, mesh);
        this.kinds.set(e.entityId, kind);
        this.root.add(mesh);
      }
    }
    for (const id of [...this.meshes.keys()]) {
      if (!seen.has(id)) {
        const m = this.meshes.get(id)!;
        this.root.remove(m);
        disposeGroup(m);
        this.meshes.delete(id);
        this.targets.delete(id);
        this.kinds.delete(id);
      }
    }
  }

  /** Call each frame for smooth lerp. */
  update(_dt: number): void {
    for (const [id, mesh] of this.meshes) {
      const t = this.targets.get(id);
      if (!t) continue;
      mesh.position.x += (t.x - mesh.position.x) * LERP_HORIZONTAL;
      mesh.position.y += (t.y - mesh.position.y) * LERP_VERTICAL;
      mesh.position.z += (t.z - mesh.position.z) * LERP_HORIZONTAL;
      const cur = mesh.rotation.y;
      let dy = t.yaw - cur;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      mesh.rotation.y = cur + dy * LERP_HORIZONTAL;
    }
  }
}

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 360) / 360;
}

function makeAvatar(id: string): THREE.Group {
  const g = new THREE.Group();
  g.name = `remote:${id}`;
  const color = new THREE.Color().setHSL(hashHue(id), 0.55, 0.5);
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const headMat = new THREE.MeshLambertMaterial({ color: color.clone().offsetHSL(0, 0, 0.15) });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.4, 10), bodyMat);
  body.position.y = 0.7;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), headMat);
  head.position.y = 1.55;
  g.add(body, head);
  return g;
}

/** Small procedural goat: body, head, four legs, stub horns. */
function makeGoat(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'remote:goat';
  const fur = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x5c4a3a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.75), fur);
  body.position.y = 0.42;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.28), fur);
  head.position.set(0, 0.52, 0.48);
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.28, 6);
  const legs: THREE.Mesh[] = [];
  for (const [lx, lz] of [
    [-0.16, 0.22],
    [0.16, 0.22],
    [-0.16, -0.22],
    [0.16, -0.22],
  ] as const) {
    const leg = new THREE.Mesh(legGeo, dark);
    leg.position.set(lx, 0.14, lz);
    legs.push(leg);
  }
  const hornGeo = new THREE.ConeGeometry(0.035, 0.1, 5);
  const hL = new THREE.Mesh(hornGeo, dark);
  hL.position.set(-0.06, 0.64, 0.42);
  const hR = new THREE.Mesh(hornGeo, dark);
  hR.position.set(0.06, 0.64, 0.42);
  g.add(body, head, ...legs, hL, hR);
  return g;
}

function disposeGroup(g: THREE.Group): void {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry?.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else (mat as THREE.Material | undefined)?.dispose();
    }
  });
}
