import * as THREE from 'three';
import { BrickType, brickDef, isOpaqueSolid } from '../proto/brick';
import { CHUNK_SIZE, Chunk } from '../world/chunk';
import type { ClientWorld } from '../world/state';
import type { BrickMaterials } from './materials';

/**
 * Face directions with corner verts + UV corners (matching verts order).
 */
const FACES: {
  nx: number;
  ny: number;
  nz: number;
  verts: number[][];
  uvs: number[][];
  shade: number;
}[] = [
  // +X
  {
    nx: 1,
    ny: 0,
    nz: 0,
    verts: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    shade: 0.8,
  },
  // -X
  {
    nx: -1,
    ny: 0,
    nz: 0,
    verts: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    shade: 0.8,
  },
  // +Y
  {
    nx: 0,
    ny: 1,
    nz: 0,
    verts: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    shade: 1.0,
  },
  // -Y
  {
    nx: 0,
    ny: -1,
    nz: 0,
    verts: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    shade: 0.55,
  },
  // +Z
  {
    nx: 0,
    ny: 0,
    nz: 1,
    verts: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    shade: 0.7,
  },
  // -Z
  {
    nx: 0,
    ny: 0,
    nz: -1,
    verts: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    shade: 0.7,
  },
];

function shouldDrawFace(self: BrickType, neighbor: BrickType): boolean {
  if (self === BrickType.Air) return false;
  const s = brickDef(self);
  const n = brickDef(neighbor);
  if (isOpaqueSolid(self)) {
    return !isOpaqueSolid(neighbor);
  }
  if (neighbor === self) return false;
  if (n.liquid && s.liquid) return false;
  return true;
}

/** Cheap world-space hash → slight per-block brightness variance. */
function blockTint(wx: number, wy: number, wz: number): number {
  let n = Math.imul(wx + 1, 374761393) ^ Math.imul(wy + 3, 668265263) ^ Math.imul(wz + 7, 2147483647);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  const u = ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  return 0.9 + u * 0.2; // 0.9 … 1.1
}

/**
 * Build a multi-group BufferGeometry for one chunk with face culling
 * (neighbors resolved via the world so chunk seams match).
 */
export function meshChunk(
  chunk: Chunk,
  world: ClientWorld,
  materials: BrickMaterials,
): THREE.Mesh | null {
  const byType = new Map<
    BrickType,
    {
      positions: number[];
      normals: number[];
      colors: number[];
      uvs: number[];
      indices: number[];
    }
  >();

  const ensure = (t: BrickType) => {
    let g = byType.get(t);
    if (!g) {
      g = { positions: [], normals: [], colors: [], uvs: [], indices: [] };
      byType.set(t, g);
    }
    return g;
  };

  const origin = chunk.worldOrigin();

  const neighborType = (wx: number, wy: number, wz: number): BrickType => {
    const lx = wx - origin.x;
    const ly = wy - origin.y;
    const lz = wz - origin.z;
    if (
      lx >= 0 &&
      ly >= 0 &&
      lz >= 0 &&
      lx < CHUNK_SIZE &&
      ly < CHUNK_SIZE &&
      lz < CHUNK_SIZE
    ) {
      return chunk.get(lx, ly, lz);
    }
    return world.getBlock(wx, wy, wz);
  };

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const type = chunk.get(lx, ly, lz);
        if (type === BrickType.Air) continue;

        const wx = origin.x + lx;
        const wy = origin.y + ly;
        const wz = origin.z + lz;
        // Texture supplies colour; vertex colour only shades / varies brightness.
        const tint = blockTint(wx, wy, wz);

        for (const face of FACES) {
          const nType = neighborType(wx + face.nx, wy + face.ny, wz + face.nz);
          if (!shouldDrawFace(type, nType)) continue;

          const g = ensure(type);
          const base = g.positions.length / 3;
          const s = face.shade * tint;

          for (let vi = 0; vi < 4; vi++) {
            const v = face.verts[vi];
            const uv = face.uvs[vi];
            g.positions.push(lx + v[0], ly + v[1], lz + v[2]);
            g.normals.push(face.nx, face.ny, face.nz);
            g.colors.push(s, s, s);
            g.uvs.push(uv[0], uv[1]);
          }
          g.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
    }
  }

  if (byType.size === 0) return null;

  const types = [...byType.keys()].sort((a, b) => a - b);
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const groups: { start: number; count: number; materialIndex: number }[] = [];

  types.forEach((t, materialIndex) => {
    const g = byType.get(t)!;
    const indexStart = indices.length;
    const vertBase = positions.length / 3;
    positions.push(...g.positions);
    normals.push(...g.normals);
    colors.push(...g.colors);
    uvs.push(...g.uvs);
    for (const i of g.indices) indices.push(i + vertBase);
    groups.push({ start: indexStart, count: g.indices.length, materialIndex });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  for (const gr of groups) {
    geometry.addGroup(gr.start, gr.count, gr.materialIndex);
  }

  const mats = types.map((t) => {
    const base = materials.get(t);
    const m = base.clone() as THREE.MeshLambertMaterial;
    m.vertexColors = true;
    // Map already on clone; keep white so face shade * texture.
    m.color.set(0xffffff);
    return m;
  });

  const mesh = new THREE.Mesh(geometry, mats);
  mesh.position.set(origin.x, origin.y, origin.z);
  mesh.name = chunk.key;
  mesh.frustumCulled = true;
  return mesh;
}
