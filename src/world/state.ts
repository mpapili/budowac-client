import { BrickType, isCollidable } from '../proto/brick';
import type { EntityState, Snapshot } from '../proto/types';
import {
  CHUNK_SIZE,
  Chunk,
  chunkKey,
  worldToChunk,
  type ChunkCoord,
} from './chunk';
import { generateChunk, surfaceHeight } from './generator';

export interface EditResult {
  chunk: Chunk;
  /** Neighbor chunks that share this face and may need remesh. */
  neighbors: Chunk[];
  wx: number;
  wy: number;
  wz: number;
  previous: BrickType;
  next: BrickType;
}

/**
 * Client-side world cache: chunks + entities.
 * Solo mode generates terrain locally; multiplayer will apply server ChunkData /
 * Snapshot and reconcile player prediction.
 */
export class ClientWorld {
  readonly seed: number;
  /** Horizontal radius of generated chunks around origin (half-extent). */
  readonly radius: number;
  entities = new Map<string, EntityState>();
  lastSnapshotSeq = 0;
  private chunks = new Map<string, Chunk>();

  constructor(seed = 42, radius = 3) {
    this.seed = seed;
    this.radius = radius;
    this.generateLocalPreview();
  }

  /** Offline bootstrap so the game is playable without budowac-server. */
  private generateLocalPreview(): void {
    // Vertical: ground+sea (~0–20) units; keep cy = 0..1 covering y 0..31.
    for (let cx = -this.radius; cx <= this.radius; cx++) {
      for (let cz = -this.radius; cz <= this.radius; cz++) {
        for (let cy = 0; cy <= 1; cy++) {
          const c = new Chunk(cx, cy, cz);
          generateChunk(c, this.seed);
          this.chunks.set(c.key, c);
        }
      }
    }
  }

  getChunk(cx: number, cy: number, cz: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cy, cz));
  }

  allChunks(): IterableIterator<Chunk> {
    return this.chunks.values();
  }

  getBlock(wx: number, wy: number, wz: number): BrickType {
    const { cx, cy, cz } = worldToChunk(wx, wy, wz);
    const chunk = this.getChunk(cx, cy, cz);
    if (!chunk) return BrickType.Air;
    const lx = wx - cx * CHUNK_SIZE;
    const ly = wy - cy * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    return chunk.get(lx, ly, lz);
  }

  setBlock(wx: number, wy: number, wz: number, type: BrickType): EditResult | null {
    const { cx, cy, cz } = worldToChunk(wx, wy, wz);
    const chunk = this.getChunk(cx, cy, cz);
    if (!chunk) return null;

    const lx = wx - cx * CHUNK_SIZE;
    const ly = wy - cy * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    const previous = chunk.get(lx, ly, lz);
    if (previous === type) return null;

    chunk.set(lx, ly, lz, type);

    // Neighbor remesh when editing on a face shared with an adjacent chunk.
    const neighbors: Chunk[] = [];
    const maybeTouch = (n: ChunkCoord) => {
      const c = this.getChunk(n.cx, n.cy, n.cz);
      if (c && c !== chunk) {
        c.dirty = true;
        neighbors.push(c);
      }
    };
    if (lx === 0) maybeTouch({ cx: cx - 1, cy, cz });
    if (lx === CHUNK_SIZE - 1) maybeTouch({ cx: cx + 1, cy, cz });
    if (ly === 0) maybeTouch({ cx, cy: cy - 1, cz });
    if (ly === CHUNK_SIZE - 1) maybeTouch({ cx, cy: cy + 1, cz });
    if (lz === 0) maybeTouch({ cx, cy, cz: cz - 1 });
    if (lz === CHUNK_SIZE - 1) maybeTouch({ cx, cy, cz: cz + 1 });

    /*
     * NET placeholder — when wired to the gateway/server:
     *   gw.send({ tag: MessageTag.Edit, payload: { x:wx, y:wy, z:wz, brickType:type } })
     * Authoritative reject/accept will arrive as ChunkDiff + Snapshot.
     */
    return { chunk, neighbors, wx, wy, wz, previous, next: type };
  }

  solidAt(wx: number, wy: number, wz: number): boolean {
    return isCollidable(this.getBlock(wx, wy, wz));
  }

  /** Safe ground Y above surface near spawn. */
  spawnPosition(): { x: number; y: number; z: number } {
    const h = surfaceHeight(0, 0, this.seed);
    return { x: 0.5, y: h + 2.5, z: 0.5 };
  }

  /**
   * Apply authoritative snapshot entity list (poses). Local player is left alone;
   * rendering skips localPlayerId when drawing remotes.
   */
  applySnapshot(s: Snapshot): void {
    this.lastSnapshotSeq = s.seq;
    const next = new Map<string, EntityState>();
    for (const e of s.entities ?? []) {
      if (!e?.entityId) continue;
      next.set(e.entityId, e);
    }
    this.entities = next;
  }

  /** Apply world-space edits from a server ChunkDiff frame. */
  applyWorldEdits(
    edits: { x: number; y: number; z: number; newBrick: number }[],
  ): void {
    for (const e of edits) {
      this.setBlock(e.x, e.y, e.z, e.newBrick as BrickType);
    }
  }
}
