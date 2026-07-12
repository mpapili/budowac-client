import { describe, expect, it } from 'vitest';
import {
  BrickType,
  brickDef,
  DEFAULT_PALETTE,
  isCollidable,
  isOpaqueSolid,
  PLACEABLE_BRICKS,
} from './brick';

describe('brickDef', () => {
  it('returns correct def for each enum value', () => {
    for (const def of DEFAULT_PALETTE) {
      expect(brickDef(def.type)).toBe(def);
    }
  });

  it('falls back to Air for out-of-range types', () => {
    expect(brickDef(999)).toBe(DEFAULT_PALETTE[BrickType.Air]);
  });
});

describe('isCollidable', () => {
  it('returns true for solid bricks', () => {
    expect(isCollidable(BrickType.Rock)).toBe(true);
    expect(isCollidable(BrickType.Grass)).toBe(true);
    expect(isCollidable(BrickType.Wood)).toBe(true);
  });

  it('returns false for non-collidable bricks', () => {
    expect(isCollidable(BrickType.Air)).toBe(false);
    expect(isCollidable(BrickType.Water)).toBe(false);
  });
});

describe('isOpaqueSolid', () => {
  it('returns true for solid + non-transparent bricks', () => {
    expect(isOpaqueSolid(BrickType.Rock)).toBe(true);
    expect(isOpaqueSolid(BrickType.Soil)).toBe(true);
    expect(isOpaqueSolid(BrickType.Grass)).toBe(true);
    expect(isOpaqueSolid(BrickType.Wood)).toBe(true);
    expect(isOpaqueSolid(BrickType.Sand)).toBe(true);
  });

  it('returns false for transparent or non-solid bricks', () => {
    expect(isOpaqueSolid(BrickType.Air)).toBe(false);
    expect(isOpaqueSolid(BrickType.Water)).toBe(false);
    expect(isOpaqueSolid(BrickType.Leaves)).toBe(false);
  });
});

describe('DEFAULT_PALETTE', () => {
  it('has an entry for every BrickType enum value', () => {
    for (const type of Object.keys(BrickType) as (keyof typeof BrickType)[]) {
      const numeric = BrickType[type];
      if (typeof numeric === 'number') {
        expect(DEFAULT_PALETTE[numeric]).toBeDefined();
        expect(DEFAULT_PALETTE[numeric]!.type).toBe(numeric);
      }
    }
  });

  it('has matching enum values and array indices', () => {
    for (const def of DEFAULT_PALETTE) {
      expect(DEFAULT_PALETTE[def.type]).toBe(def);
    }
  });
});

describe('PLACEABLE_BRICKS', () => {
  it('does not include Air', () => {
    expect(PLACEABLE_BRICKS).not.toContain(BrickType.Air);
  });

  it('only includes solid or liquid bricks', () => {
    for (const type of PLACEABLE_BRICKS) {
      const def = brickDef(type);
      expect(def.solid || def.liquid).toBe(true);
    }
  });
});
