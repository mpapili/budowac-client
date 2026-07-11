import * as THREE from 'three';
import { BrickType } from '../proto/brick';
import type { ClientWorld } from '../world/state';

export interface HitResult {
  /** Block that was hit (for breaking). */
  x: number;
  y: number;
  z: number;
  /** Adjacent empty cell where a new block would be placed. */
  px: number;
  py: number;
  pz: number;
  distance: number;
}

/**
 * DDA grid raycast from camera through voxel world.
 * Stops on first solid/liquid non-air brick within maxDistance.
 */
export function raycastVoxels(
  world: ClientWorld,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDistance = 6,
): HitResult | null {
  const dir = direction.clone().normalize();
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = dir.x > 0 ? 1 : dir.x < 0 ? -1 : 0;
  const stepY = dir.y > 0 ? 1 : dir.y < 0 ? -1 : 0;
  const stepZ = dir.z > 0 ? 1 : dir.z < 0 ? -1 : 0;

  const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;

  let tMaxX =
    stepX > 0
      ? (Math.floor(origin.x) + 1 - origin.x) * tDeltaX
      : stepX < 0
        ? (origin.x - Math.floor(origin.x)) * tDeltaX
        : Infinity;
  let tMaxY =
    stepY > 0
      ? (Math.floor(origin.y) + 1 - origin.y) * tDeltaY
      : stepY < 0
        ? (origin.y - Math.floor(origin.y)) * tDeltaY
        : Infinity;
  let tMaxZ =
    stepZ > 0
      ? (Math.floor(origin.z) + 1 - origin.z) * tDeltaZ
      : stepZ < 0
        ? (origin.z - Math.floor(origin.z)) * tDeltaZ
        : Infinity;

  let distance = 0;
  let prevX = x;
  let prevY = y;
  let prevZ = z;

  for (let i = 0; i < maxDistance * 3 + 3; i++) {
    const block = world.getBlock(x, y, z);
    if (block !== BrickType.Air) {
      // Don't treat water as a hard target for break/place by default — still selectable.
      return {
        x,
        y,
        z,
        px: prevX,
        py: prevY,
        pz: prevZ,
        distance,
      };
    }

    prevX = x;
    prevY = y;
    prevZ = z;

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        distance = tMaxX;
        if (distance > maxDistance) return null;
        tMaxX += tDeltaX;
        x += stepX;
      } else {
        distance = tMaxZ;
        if (distance > maxDistance) return null;
        tMaxZ += tDeltaZ;
        z += stepZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        distance = tMaxY;
        if (distance > maxDistance) return null;
        tMaxY += tDeltaY;
        y += stepY;
      } else {
        distance = tMaxZ;
        if (distance > maxDistance) return null;
        tMaxZ += tDeltaZ;
        z += stepZ;
      }
    }
  }
  return null;
}
