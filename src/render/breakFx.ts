import * as THREE from 'three';
import { brickDef } from '../proto/brick';

const DURATION = 0.38;
const COUNT = 10;
const GRAVITY = 5.5;

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  age: number;
  spin: THREE.Vector3;
  baseScale: number;
  baseOpacity: number;
}

/**
 * Soft debris pop when a block is broken — brief, colour-matched cubes that fade out.
 */
export class BreakFx {
  private root = new THREE.Group();
  private particles: Particle[] = [];
  private geom = new THREE.BoxGeometry(0.14, 0.14, 0.14);

  constructor(scene: THREE.Scene) {
    this.root.name = 'break-fx';
    scene.add(this.root);
  }

  /** Spawn a gentle burst at block world coords using its brick colour. */
  burst(wx: number, wy: number, wz: number, brickType: number): void {
    const def = brickDef(brickType);
    if (!def.solid && !def.liquid) return;

    const cx = wx + 0.5;
    const cy = wy + 0.5;
    const cz = wz + 0.5;
    const color = new THREE.Color(def.color);

    for (let i = 0; i < COUNT; i++) {
      const baseOpacity = Math.min(0.9, def.opacity);
      const mat = new THREE.MeshLambertMaterial({
        color,
        transparent: true,
        opacity: baseOpacity,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.geom, mat);
      mesh.position.set(
        cx + (Math.random() - 0.5) * 0.35,
        cy + (Math.random() - 0.5) * 0.35,
        cz + (Math.random() - 0.5) * 0.35,
      );
      const baseScale = 0.55 + Math.random() * 0.65;
      mesh.scale.setScalar(baseScale);
      this.root.add(mesh);

      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.7 + 0.15,
        Math.random() - 0.5,
      ).normalize();
      const speed = 1.4 + Math.random() * 1.6;

      this.particles.push({
        mesh,
        vel: dir.multiplyScalar(speed),
        age: 0,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 7,
          (Math.random() - 0.5) * 7,
          (Math.random() - 0.5) * 7,
        ),
        baseScale,
        baseOpacity,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      const t = Math.min(1, p.age / DURATION);
      if (t >= 1) {
        this.disposeParticle(p);
        this.particles.splice(i, 1);
        continue;
      }

      p.vel.y -= GRAVITY * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;

      // Ease-out shrink + fade (gentle, not snappy).
      const fade = 1 - t * t;
      p.mesh.scale.setScalar(p.baseScale * (0.65 + 0.35 * fade));
      (p.mesh.material as THREE.MeshLambertMaterial).opacity = p.baseOpacity * fade;
    }
  }

  private disposeParticle(p: Particle): void {
    this.root.remove(p.mesh);
    (p.mesh.material as THREE.Material).dispose();
  }
}
