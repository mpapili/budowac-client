import * as THREE from 'three';
import type { ClientWorld } from '../world/state';
import type { Controls } from './controls';

const EYE_HEIGHT = 1.62;
const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.75;
const GRAVITY = -28;
const JUMP_V = 9.2;
const WALK_SPEED = 5.5;
const SPRINT_SPEED = 8.5;

/**
 * Local player with client-side physics (AABB vs collidable voxels).
 * Prediction path later: append PlayerInput frames each tick and reconcile
 * against Snapshot.lastInputSeq from the server.
 */
export class Player {
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  onGround = false;
  /** Monotonic input sequence for future reconciliation. */
  inputSeq = 0;

  constructor(spawn: { x: number; y: number; z: number }) {
    this.position.set(spawn.x, spawn.y, spawn.z);
  }

  update(dt: number, controls: Controls, world: ClientWorld): void {
    // Movement in look-horizontal plane.
    const speed = controls.sprinting ? SPRINT_SPEED : WALK_SPEED;
    const yaw = controls.look.yaw;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    // move.z is forward negative (W), move.x strafe.
    const wishX = controls.move.x * cos + controls.move.z * sin;
    const wishZ = -controls.move.x * sin + controls.move.z * cos;

    this.velocity.x = wishX * speed;
    this.velocity.z = wishZ * speed;
    this.velocity.y += GRAVITY * dt;

    if (controls.consumeJump() && this.onGround) {
      this.velocity.y = JUMP_V;
      this.onGround = false;
    }

    this.moveAxis(world, this.velocity.x * dt, 0, 0);
    this.moveAxis(world, 0, this.velocity.y * dt, 0);
    this.moveAxis(world, 0, 0, this.velocity.z * dt);

    // Keep player from falling forever offline.
    if (this.position.y < -20) {
      this.position.y = 40;
      this.velocity.y = 0;
    }

    this.inputSeq++;
    // Multiplayer: main.ts throttles Absolute pose PlayerInput to gateway ~20 Hz.
  }

  /** Camera sits at eye height above feet. */
  syncCamera(camera: THREE.Camera): void {
    camera.position.set(
      this.position.x,
      this.position.y + EYE_HEIGHT,
      this.position.z,
    );
  }

  private moveAxis(world: ClientWorld, dx: number, dy: number, dz: number): void {
    this.position.x += dx;
    this.position.y += dy;
    this.position.z += dz;

    const minX = this.position.x - PLAYER_RADIUS;
    const maxX = this.position.x + PLAYER_RADIUS;
    const minY = this.position.y;
    const maxY = this.position.y + PLAYER_HEIGHT;
    const minZ = this.position.z - PLAYER_RADIUS;
    const maxZ = this.position.z + PLAYER_RADIUS;

    const x0 = Math.floor(minX);
    const x1 = Math.floor(maxX);
    const y0 = Math.floor(minY);
    const y1 = Math.floor(maxY);
    const z0 = Math.floor(minZ);
    const z1 = Math.floor(maxZ);

    this.onGround = dy < 0 ? false : this.onGround;

    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          if (!world.solidAt(x, y, z)) continue;
          // Block AABB [x,x+1]×[y,y+1]×[z,z+1]
          if (
            maxX <= x ||
            minX >= x + 1 ||
            maxY <= y ||
            minY >= y + 1 ||
            maxZ <= z ||
            minZ >= z + 1
          ) {
            continue;
          }

          if (dx > 0) {
            this.position.x = x - PLAYER_RADIUS - 1e-4;
            this.velocity.x = 0;
          } else if (dx < 0) {
            this.position.x = x + 1 + PLAYER_RADIUS + 1e-4;
            this.velocity.x = 0;
          }

          if (dz > 0) {
            this.position.z = z - PLAYER_RADIUS - 1e-4;
            this.velocity.z = 0;
          } else if (dz < 0) {
            this.position.z = z + 1 + PLAYER_RADIUS + 1e-4;
            this.velocity.z = 0;
          }

          if (dy > 0) {
            this.position.y = y - PLAYER_HEIGHT - 1e-4;
            this.velocity.y = 0;
          } else if (dy < 0) {
            this.position.y = y + 1 + 1e-4;
            this.velocity.y = 0;
            this.onGround = true;
          }
        }
      }
    }
  }
}
