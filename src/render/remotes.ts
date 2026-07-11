import * as THREE from 'three';
import type { EntityState } from '../proto/types';

/**
 * Simple remote-player avatars: colored capsule + head, lerp to snapshot pose.
 */
export class RemotePlayers {
  readonly root = new THREE.Group();
  private meshes = new Map<string, THREE.Group>();
  private targets = new Map<string, { x: number; y: number; z: number; yaw: number }>();

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
      if (!this.meshes.has(e.entityId)) {
        const mesh = makeAvatar(e.entityId);
        this.meshes.set(e.entityId, mesh);
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
      }
    }
  }

  /** Call each frame for smooth lerp. */
  update(_dt: number): void {
    for (const [id, mesh] of this.meshes) {
      const t = this.targets.get(id);
      if (!t) continue;
      mesh.position.x += (t.x - mesh.position.x) * 0.35;
      mesh.position.y += (t.y - mesh.position.y) * 0.35;
      mesh.position.z += (t.z - mesh.position.z) * 0.35;
      // yaw is horizontal look
      const cur = mesh.rotation.y;
      let dy = t.yaw - cur;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      mesh.rotation.y = cur + dy * 0.35;
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
  // body cylinder ~1.4 tall, radius 0.3, feet at y=0
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.4, 10), bodyMat);
  body.position.y = 0.7;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), headMat);
  head.position.y = 1.55;
  g.add(body, head);
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
