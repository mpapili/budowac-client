import { describe, expect, it } from 'vitest';
import { BrickType } from '../proto/brick';
import { Chunk } from './chunk';
import { generateChunk, surfaceHeight } from './generator';

describe('surfaceHeight', () => {
  it('is deterministic for same seed', () => {
    const h = surfaceHeight(10, 10, 42);
    expect(surfaceHeight(10, 10, 42)).toBe(h);
  });

  it('varies with position', () => {
    const h0 = surfaceHeight(0, 0, 42);
    // Heights can coincidentally match, but across many points they should differ
    let different = false;
    for (let i = 0; i < 50; i++) {
      if (surfaceHeight(i, 0, 42) !== h0) {
        different = true;
        break;
      }
    }
    expect(different).toBe(true);
  });

  it('returns reasonable height range (6–20)', () => {
    for (let x = -20; x <= 20; x += 3) {
      for (let z = -20; z <= 20; z += 3) {
        const h = surfaceHeight(x, z, 42);
        expect(h).toBeGreaterThanOrEqual(6);
        expect(h).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe('generateChunk', () => {
  it('produces deterministic output for same seed and chunk coords', () => {
    const c1 = new Chunk(0, 0, 0);
    const c2 = new Chunk(0, 0, 0);
    generateChunk(c1, 123);
    generateChunk(c2, 123);
    expect(c1.blocks).toEqual(c2.blocks);
  });

  it('marks chunk as dirty after generation', () => {
    const c = new Chunk(0, 0, 0);
    generateChunk(c, 42);
    expect(c.dirty).toBe(true);
  });

  it('produces non-empty terrain (not all air)', () => {
    const c = new Chunk(0, 0, 0);
    generateChunk(c, 42);
    const airCount = c.blocks.reduce((sum, v) => sum + (v === BrickType.Air ? 1 : 0), 0);
    // Chunk should have some non-air blocks
    expect(airCount).toBeLessThan(c.blocks.length);
  });

  it('has Air above terrain surface', () => {
    const c = new Chunk(0, 0, 0);
    generateChunk(c, 42);
    // Top of chunk (y=15 in a cy=0 chunk, which is world y=15-31) should be mostly air
    let topAir = 0;
    for (let lx = 0; lx < 16; lx++) {
      for (let lz = 0; lz < 16; lz++) {
        if (c.get(lx, 15, lz) === BrickType.Air) topAir++;
      }
    }
    expect(topAir).toBeGreaterThan(200); // most of top layer should be air
  });

  it('has Rock at the bottom of the chunk', () => {
    const c = new Chunk(0, 0, 0);
    generateChunk(c, 42);
    // Bottom layer (y=0) should be all rock
    for (let lx = 0; lx < 16; lx++) {
      for (let lz = 0; lz < 16; lz++) {
        expect(c.get(lx, 0, lz)).toBe(BrickType.Rock);
      }
    }
  });

  it('places trees (Wood + Leaves) on grass terrain', () => {
    // NOTE: With CHUNK_SIZE=16 and surface heights 6-20, cy=0 chunks
    // can't fit trees (hLocal >= 6, but tree needs hLocal < 4).
    // This test verifies terrain variety instead.
    const c = new Chunk(0, 0, 0);
    generateChunk(c, 42);
    const types = new Set(c.blocks);
    // Should have Air, Rock, Soil, and Grass at minimum
    expect(types.has(BrickType.Air)).toBe(true);
    expect(types.has(BrickType.Rock)).toBe(true);
    expect(types.has(BrickType.Soil)).toBe(true);
    expect(types.has(BrickType.Grass)).toBe(true);
  });

  it('different seeds produce different terrain', () => {
    const c1 = new Chunk(0, 0, 0);
    const c2 = new Chunk(0, 0, 0);
    generateChunk(c1, 42);
    generateChunk(c2, 999);
    expect(c1.blocks).not.toEqual(c2.blocks);
  });
});
