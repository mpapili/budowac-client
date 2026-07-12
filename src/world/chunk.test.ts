import { describe, expect, it } from 'vitest';
import { BrickType } from '../proto/brick';
import { CHUNK_SIZE, chunkKey, localIndex, worldToChunk, Chunk } from './chunk';

describe('CHUNK_SIZE', () => {
  it('is 16', () => {
    expect(CHUNK_SIZE).toBe(16);
  });
});

describe('chunkKey', () => {
  it('produces comma-separated string', () => {
    expect(chunkKey(0, 0, 0)).toBe('0,0,0');
    expect(chunkKey(-1, 2, 3)).toBe('-1,2,3');
  });

  it('is deterministic', () => {
    expect(chunkKey(1, 2, 3)).toBe(chunkKey(1, 2, 3));
  });
});

describe('worldToChunk', () => {
  it('maps positive coords', () => {
    expect(worldToChunk(31, 10, 0)).toEqual({ cx: 1, cy: 0, cz: 0 });
  });

  it('maps negative coords (floor division)', () => {
    expect(worldToChunk(-1, 0, 0)).toEqual({ cx: -1, cy: 0, cz: 0 });
    expect(worldToChunk(-17, 0, 0)).toEqual({ cx: -2, cy: 0, cz: 0 });
  });

  it('maps exact chunk boundaries', () => {
    expect(worldToChunk(16, 16, 16)).toEqual({ cx: 1, cy: 1, cz: 1 });
    expect(worldToChunk(15, 15, 15)).toEqual({ cx: 0, cy: 0, cz: 0 });
  });
});

describe('localIndex', () => {
  it('computes flat index correctly', () => {
    expect(localIndex(0, 0, 0)).toBe(0);
    expect(localIndex(1, 0, 0)).toBe(1);
    expect(localIndex(0, 1, 0)).toBe(16);
    expect(localIndex(0, 0, 1)).toBe(256);
    expect(localIndex(15, 15, 15)).toBe(15 + 15 * 16 + 15 * 256); // 4063
  });
});

describe('Chunk', () => {
  it('initializes with all Air', () => {
    const c = new Chunk(0, 0, 0);
    expect(c.get(0, 0, 0)).toBe(BrickType.Air);
    expect(c.blocks.length).toBe(CHUNK_SIZE ** 3);
  });

  it('has correct key', () => {
    expect(new Chunk(2, 0, -1).key).toBe('2,0,-1');
  });

  it('has correct worldOrigin', () => {
    const c = new Chunk(1, 0, -1);
    expect(c.worldOrigin()).toEqual({ x: 16, y: 0, z: -16 });
  });

  it('starts dirty', () => {
    expect(new Chunk(0, 0, 0).dirty).toBe(true);
  });

  describe('get', () => {
    it('returns Air for out-of-bounds coords', () => {
      const c = new Chunk(0, 0, 0);
      expect(c.get(-1, 0, 0)).toBe(BrickType.Air);
      expect(c.get(16, 0, 0)).toBe(BrickType.Air);
      expect(c.get(0, -1, 0)).toBe(BrickType.Air);
      expect(c.get(0, 0, 16)).toBe(BrickType.Air);
    });
  });

  describe('set', () => {
    it('sets a block and marks dirty', () => {
      const c = new Chunk(0, 0, 0);
      c.dirty = false;
      c.set(5, 5, 5, BrickType.Rock);
      expect(c.get(5, 5, 5)).toBe(BrickType.Rock);
      expect(c.dirty).toBe(true);
    });

    it('ignores out-of-bounds coords', () => {
      const c = new Chunk(0, 0, 0);
      c.set(-1, 0, 0, BrickType.Rock);
      c.set(16, 0, 0, BrickType.Rock);
      expect(c.get(0, 0, 0)).toBe(BrickType.Air);
    });

    it('no-ops when setting the same type (does not overwrite)', () => {
      const c = new Chunk(0, 0, 0);
      c.set(5, 5, 5, BrickType.Soil); // set to Soil
      c.set(5, 5, 5, BrickType.Soil); // no-op: same type
      expect(c.get(5, 5, 5)).toBe(BrickType.Soil);
    });
  });
});
