import { BrickType } from '../proto/brick';

/** Voxels per axis of a chunk cube. Spec-aligned fixed size. */
export const CHUNK_SIZE = 16;

export type ChunkCoord = { cx: number; cy: number; cz: number };

export function chunkKey(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`;
}

export function worldToChunk(x: number, y: number, z: number): ChunkCoord {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cy: Math.floor(y / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE),
  };
}

export function localIndex(lx: number, ly: number, lz: number): number {
  return lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_SIZE;
}

/**
 * Dense 16³ brick buffer. Client-owned until ChunkData arrives from the server.
 * // NET: replace populate-from-generator with ChunkData / ChunkDiff apply.
 */
export class Chunk {
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
  /** Flat [x + y*S + z*S*S] BrickType values. */
  readonly blocks: Uint8Array;
  /** Dirty bits: mesh needs rebuild. */
  dirty = true;

  constructor(cx: number, cy: number, cz: number) {
    this.cx = cx;
    this.cy = cy;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
  }

  get key(): string {
    return chunkKey(this.cx, this.cy, this.cz);
  }

  get(lx: number, ly: number, lz: number): BrickType {
    if (
      lx < 0 ||
      ly < 0 ||
      lz < 0 ||
      lx >= CHUNK_SIZE ||
      ly >= CHUNK_SIZE ||
      lz >= CHUNK_SIZE
    ) {
      return BrickType.Air;
    }
    return this.blocks[localIndex(lx, ly, lz)] as BrickType;
  }

  set(lx: number, ly: number, lz: number, type: BrickType): void {
    if (
      lx < 0 ||
      ly < 0 ||
      lz < 0 ||
      lx >= CHUNK_SIZE ||
      ly >= CHUNK_SIZE ||
      lz >= CHUNK_SIZE
    ) {
      return;
    }
    const i = localIndex(lx, ly, lz);
    if (this.blocks[i] === type) return;
    this.blocks[i] = type;
    this.dirty = true;
  }

  worldOrigin(): { x: number; y: number; z: number } {
    return {
      x: this.cx * CHUNK_SIZE,
      y: this.cy * CHUNK_SIZE,
      z: this.cz * CHUNK_SIZE,
    };
  }
}
