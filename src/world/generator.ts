import { BrickType } from '../proto/brick';
import { CHUNK_SIZE, Chunk } from './chunk';

/**
 * Lightweight seeded PRNG (mulberry32). Server world gen is authoritative;
 * this is a client-side preview so solo play works offline.
 * // NET: drop once ChunkData is served from budowac-server.
 */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, z: number, seed: number): number {
  let n = seed ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const n00 = hash2(x0, z0, seed);
  const n10 = hash2(x0 + 1, z0, seed);
  const n01 = hash2(x0, z0 + 1, seed);
  const n11 = hash2(x0 + 1, z0 + 1, seed);
  const ix0 = n00 + (n10 - n00) * sx;
  const ix1 = n01 + (n11 - n01) * sx;
  return ix0 + (ix1 - ix0) * sz;
}

function fbm(x: number, z: number, seed: number): number {
  let v = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < 4; i++) {
    v += smoothNoise(x * freq, z * freq, seed + i * 1013) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return v / norm;
}

/** Surface height in world-Y for column (wx, wz). */
export function surfaceHeight(wx: number, wz: number, seed: number): number {
  const n = fbm(wx * 0.04, wz * 0.04, seed);
  return Math.floor(6 + n * 14);
}

const SEA_LEVEL = 8;

/** Lattice spacing for candidate pond centers (world blocks). */
const POND_CELL = 22;

/**
 * Forest density 0–1 from low-frequency FBM so trees form visible groves.
 * Peaks become dense packs; valleys stay open with scatter trees.
 */
function forestDensity(wx: number, wz: number, seed: number): number {
  return fbm(wx * 0.05, wz * 0.05, seed + 4242);
}

/**
 * Per-column plant chance from forest density.
 * Much denser overall so woodlands read clearly.
 */
function treePlantChance(density: number): number {
  // Loners / light scatter on open grass (~5%).
  if (density < 0.38) return 0.05;
  // Grove fringe → dense pack: ~18% … ~55% toward grove center.
  const t = (density - 0.38) / 0.62;
  return 0.18 + t * t * 0.37;
}

/**
 * If (wx,wz) sits in a small inland pond, return flat water surface Y.
 * Centers are Poisson-ish on a lattice so ponds stay deterministic / cross-chunk.
 */
function pondWaterY(wx: number, wz: number, seed: number): number | null {
  const cellX0 = Math.floor(wx / POND_CELL);
  const cellZ0 = Math.floor(wz / POND_CELL);
  // Nearby cells only — pond radius stays well under one cell.
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = cellX0 + dx;
      const cz = cellZ0 + dz;
      // ~18% of lattice cells host a pond.
      if (hash2(cx, cz, seed + 9101) > 0.18) continue;

      const ox =
        cx * POND_CELL +
        4 +
        Math.floor(hash2(cx, cz, seed + 9102) * (POND_CELL - 8));
      const oz =
        cz * POND_CELL +
        4 +
        Math.floor(hash2(cx, cz, seed + 9103) * (POND_CELL - 8));
      // Radius 2–4 flat water bricks.
      const r = 2 + Math.floor(hash2(cx, cz, seed + 9104) * 3);
      const ddx = wx - ox;
      const ddz = wz - oz;
      if (ddx * ddx + ddz * ddz > r * r) continue;

      const cy = surfaceHeight(ox, oz, seed);
      // Inland only — skip beaches / submerged terrain.
      if (cy <= SEA_LEVEL + 2) continue;
      return cy;
    }
  }
  return null;
}

/**
 * Fill a chunk with terrain, ocean, inland ponds, and dense tree groups.
 * Deterministic for (seed, chunk coords).
 */
export function generateChunk(chunk: Chunk, seed: number): void {
  const origin = chunk.worldOrigin();
  const treeRng = mulberry32(
    (seed ^ Math.imul(chunk.cx, 73856093) ^ Math.imul(chunk.cz, 19349663)) >>> 0,
  );

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = origin.x + lx;
      const wz = origin.z + lz;
      const h = surfaceHeight(wx, wz, seed);
      const pondY = pondWaterY(wx, wz, seed);
      // Effective top solid / plant surface (pond floors sit 1 below flat water).
      const topY = pondY !== null ? pondY - 1 : h;

      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const wy = origin.y + ly;
        let type = BrickType.Air;

        if (pondY !== null) {
          // Flat basin: soil/sand bed, one layer of still water, air above.
          if (wy < topY - 2) {
            type = BrickType.Rock;
          } else if (wy < topY) {
            type = BrickType.Soil;
          } else if (wy === topY) {
            type = BrickType.Sand;
          } else if (wy === pondY) {
            type = BrickType.Water;
          }
          // wy > pondY stays air (scoop any taller columns flat).
        } else if (wy < h - 3) {
          type = BrickType.Rock;
        } else if (wy < h) {
          type = BrickType.Soil;
        } else if (wy === h) {
          if (h <= SEA_LEVEL + 1) type = BrickType.Sand;
          else type = BrickType.Grass;
        } else if (wy <= SEA_LEVEL && wy > h) {
          type = BrickType.Water;
        }

        chunk.blocks[lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_SIZE] = type;
      }

      // Trees only on dry grass (not ponds / beaches), surface in this slab.
      const hLocal = topY - origin.y;
      // trunk (~5-8) + canopy needs ~12 blocks headroom; keep inset from XZ edges.
      if (
        pondY === null &&
        h > SEA_LEVEL + 1 &&
        hLocal >= 0 &&
        hLocal < CHUNK_SIZE &&
        lx >= 2 &&
        lx < CHUNK_SIZE - 2 &&
        lz >= 2 &&
        lz < CHUNK_SIZE - 2 &&
        hLocal + 12 < CHUNK_SIZE &&
        treeRng() < treePlantChance(forestDensity(wx, wz, seed))
      ) {
        plantTree(chunk, lx, hLocal + 1, lz, treeRng);
      }
    }
  }

  chunk.dirty = true;
}

/**
 * Taller trunk with a canopy that sits on top of the trunk
 * (wide ring at trunk top, narrowing apex above).
 */
function plantTree(
  chunk: Chunk,
  lx: number,
  ly: number,
  lz: number,
  rng: () => number,
): void {
  // Trunk: 5–8 log blocks (base at ly sitting on grass).
  const trunkH = 5 + Math.floor(rng() * 4);
  for (let i = 0; i < trunkH; i++) {
    setInChunk(chunk, lx, ly + i, lz, BrickType.Wood);
  }

  // Canopy centered on the top trunk block so leaves attach directly.
  // Layer shape (dy relative to top of trunk = ly + trunkH - 1):
  //   dy -1 : thin ring around upper trunk (sleeve)
  //   dy  0 : wide crown at trunk top (attached)
  //   dy  1 : same wide crown
  //   dy  2 : medium
  //   dy  3 : small cap / apex
  const top = ly + trunkH - 1;
  const layers: { dy: number; r: number }[] = [
    { dy: -1, r: 1 },
    { dy: 0, r: 2 },
    { dy: 1, r: 2 },
    { dy: 2, r: 1 },
    { dy: 3, r: 1 },
  ];

  for (const { dy, r } of layers) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        // Keep trunk solid (wood already placed).
        if (dx === 0 && dz === 0 && dy <= 0) continue;
        // Round off corners of wider rings.
        if (r >= 2 && Math.abs(dx) === r && Math.abs(dz) === r && rng() < 0.55) continue;
        // Apex at dy=3: only the center column.
        if (dy === 3 && (dx !== 0 || dz !== 0)) continue;
        // Small chance of holes so crown isn't a solid cube.
        if (r >= 2 && rng() < 0.08) continue;
        setInChunk(chunk, lx + dx, top + dy, lz + dz, BrickType.Leaves);
      }
    }
  }
}

function setInChunk(
  chunk: Chunk,
  lx: number,
  ly: number,
  lz: number,
  type: BrickType,
): void {
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
  const i = lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_SIZE;
  const cur = chunk.blocks[i] as BrickType;
  // Leaves never stomp wood/ground; wood can overwrite air only (or leaves if reshaping).
  if (type === BrickType.Leaves && cur !== BrickType.Air) return;
  if (type === BrickType.Wood && cur !== BrickType.Air && cur !== BrickType.Leaves) return;
  chunk.blocks[i] = type;
}
