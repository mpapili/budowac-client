import { describe, expect, it } from 'vitest';
import { BrickType } from '../proto/brick';
import type { Snapshot } from '../proto/types';
import { ClientWorld } from './state';

describe('ClientWorld', () => {
  it('generates local preview chunks on construction', () => {
    const world = new ClientWorld(42, 1);
    // radius 1: cx=-1..1, cz=-1..1, cy=0..1 => 9 * 2 = 18 chunks
    const chunks = [...world.allChunks()];
    expect(chunks.length).toBe(18);
  });

  it('stores seed and radius', () => {
    const world = new ClientWorld(123, 5);
    expect(world.seed).toBe(123);
    expect(world.radius).toBe(5);
  });

  describe('getBlock', () => {
    it('returns Air for coords outside generated chunks', () => {
      const world = new ClientWorld(42, 1);
      // Far away coords are outside the radius=1 generated area
      expect(world.getBlock(1000, 0, 1000)).toBe(BrickType.Air);
    });

    it('returns terrain blocks at spawn area', () => {
      const world = new ClientWorld(42, 2);
      const block = world.getBlock(0, 5, 0);
      // y=5 is likely below surface for seed 42 (surface ~6-20)
      expect(block).not.toBe(BrickType.Air);
    });
  });

  describe('setBlock', () => {
    it('changes a block and marks chunk dirty', () => {
      const world = new ClientWorld(42, 1);
      const chunk = world.getChunk(0, 0, 0)!;
      chunk.dirty = false;

      // y=3 is above typical surface for seed 42 (~6-20) → Air → Wood is a real change
      const result = world.setBlock(8, 3, 8, BrickType.Wood);
      expect(result).not.toBeNull();
      expect(chunk.dirty).toBe(true);
      expect(world.getBlock(8, 3, 8)).toBe(BrickType.Wood);
    });

    it('returns null for coords outside any chunk', () => {
      const world = new ClientWorld(42, 1);
      expect(world.setBlock(9999, 9999, 9999, BrickType.Rock)).toBeNull();
    });

    it('returns null when setting to the same type', () => {
      const world = new ClientWorld(42, 1);
      // Set to Air when already Air
      expect(world.setBlock(999, 10, 999, BrickType.Air)).toBeNull();
    });

    it('marks neighbor chunks dirty when editing on a face boundary', () => {
      const world = new ClientWorld(42, 2);
      // World x=-16 → cx=-1, lx=0 (face shared with cx=-2 chunk)
      // y=3 is above surface → Air → change to Wood is a real edit
      const result = world.setBlock(-16, 3, 8, BrickType.Wood);
      expect(result).not.toBeNull();
      // The neighbor chunk at cx=-2 should be dirty
      const neighbor = world.getChunk(-2, 0, 0);
      expect(neighbor?.dirty).toBe(true);
    });

    it('returns previous and next types in result', () => {
      const world = new ClientWorld(42, 1);
      const result = world.setBlock(8, 5, 8, BrickType.Wood);
      if (!result) throw new Error('expected result');
      expect(result.next).toBe(BrickType.Wood);
      expect(result.previous).not.toBe(BrickType.Wood); // was something else
    });
  });

  describe('solidAt', () => {
    it('returns true for collidable blocks', () => {
      const world = new ClientWorld(42, 1);
      // Bottom of chunk 0,0,0 should be rock (collidable)
      expect(world.solidAt(8, 0, 8)).toBe(true);
    });

    it('returns false for Air', () => {
      const world = new ClientWorld(42, 1);
      // Top of chunk should be air
      expect(world.solidAt(8, 30, 8)).toBe(false);
    });
  });

  describe('spawnPosition', () => {
    it('returns a position above surface at origin', () => {
      const world = new ClientWorld(42, 1);
      const spawn = world.spawnPosition();
      expect(spawn.x).toBe(0.5);
      expect(spawn.z).toBe(0.5);
      // Y should be surfaceHeight + 2.5
      expect(spawn.y).toBeGreaterThan(8);
    });
  });

  describe('applySnapshot', () => {
    it('updates entity map from snapshot', () => {
      const world = new ClientWorld(42, 1);
      const snapshot: Snapshot = {
        seq: 1,
        lastInputSeq: 0,
        entities: [
          { entityId: 'a', x: 1, y: 2, z: 3, yaw: 0, pitch: 0 },
          { entityId: 'b', x: 10, y: 20, z: 30, yaw: 1.5, pitch: 0.5 },
        ],
      };
      world.applySnapshot(snapshot);
      expect(world.entities.size).toBe(2);
      expect(world.lastSnapshotSeq).toBe(1);
      expect(world.entities.get('a')?.x).toBe(1);
    });

    it('replaces entities (not merges)', () => {
      const world = new ClientWorld(42, 1);
      world.applySnapshot({ seq: 1, lastInputSeq: 0, entities: [{ entityId: 'a', x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }] });
      world.applySnapshot({ seq: 2, lastInputSeq: 0, entities: [{ entityId: 'b', x: 1, y: 1, z: 1, yaw: 0, pitch: 0 }] });
      expect(world.entities.size).toBe(1);
      expect(world.entities.has('a')).toBe(false);
      expect(world.entities.has('b')).toBe(true);
    });

    it('skips entities with missing entityId', () => {
      const world = new ClientWorld(42, 1);
      world.applySnapshot({
        seq: 1,
        lastInputSeq: 0,
        entities: [
          // @ts-expect-error testing missing entityId
          { x: 1, y: 2, z: 3, yaw: 0, pitch: 0 },
          { entityId: 'valid', x: 10, y: 20, z: 30, yaw: 0, pitch: 0 },
        ],
      });
      expect(world.entities.size).toBe(1);
    });
  });

  describe('applyWorldEdits', () => {
    it('applies a list of world-space edits', () => {
      const world = new ClientWorld(42, 1);
      world.applyWorldEdits([
        { x: 8, y: 8, z: 8, newBrick: BrickType.Wood },
        { x: 9, y: 9, z: 9, newBrick: BrickType.Sand },
      ]);
      expect(world.getBlock(8, 8, 8)).toBe(BrickType.Wood);
      expect(world.getBlock(9, 9, 9)).toBe(BrickType.Sand);
    });
  });

  describe('getChunk', () => {
    it('returns undefined for non-existent chunks', () => {
      const world = new ClientWorld(42, 1);
      expect(world.getChunk(100, 100, 100)).toBeUndefined();
    });
  });
});
