/**
 * Canonical brick palette (client copy).
 * Reconcile with budowac-space/initial-repo-spec.md — every repo's proto/brick must match.
 */

export enum BrickType {
  Air = 0,
  Rock = 1,
  Soil = 2,
  Grass = 3,
  Wood = 4,
  Water = 5,
  Leaves = 6,
  Sand = 7,
}

export interface BrickDef {
  type: BrickType;
  name: string;
  solid: boolean;
  liquid: boolean;
  transparent: boolean;
  collidable: boolean;
  /** sRGB hex for client materials (not on wire). */
  color: number;
  opacity: number;
}

export const DEFAULT_PALETTE: BrickDef[] = [
  {
    type: BrickType.Air,
    name: 'air',
    solid: false,
    liquid: false,
    transparent: true,
    collidable: false,
    color: 0x000000,
    opacity: 0,
  },
  {
    type: BrickType.Rock,
    name: 'rock',
    solid: true,
    liquid: false,
    transparent: false,
    collidable: true,
    color: 0x6b6f78,
    opacity: 1,
  },
  {
    type: BrickType.Soil,
    name: 'soil',
    solid: true,
    liquid: false,
    transparent: false,
    collidable: true,
    color: 0x6b4423,
    opacity: 1,
  },
  {
    type: BrickType.Grass,
    name: 'grass',
    solid: true,
    liquid: false,
    transparent: false,
    collidable: true,
    color: 0x4caf50,
    opacity: 1,
  },
  {
    type: BrickType.Wood,
    name: 'wood',
    solid: true,
    liquid: false,
    transparent: false,
    collidable: true,
    color: 0x8b5a2b,
    opacity: 1,
  },
  {
    type: BrickType.Water,
    name: 'water',
    solid: false,
    liquid: true,
    transparent: true,
    collidable: false,
    color: 0x2e86c1,
    opacity: 0.55,
  },
  {
    type: BrickType.Leaves,
    name: 'leaves',
    solid: true,
    liquid: false,
    transparent: true,
    collidable: true,
    color: 0x2e7d32,
    opacity: 0.9,
  },
  {
    type: BrickType.Sand,
    name: 'sand',
    solid: true,
    liquid: false,
    transparent: false,
    collidable: true,
    color: 0xd4c4a0,
    opacity: 1,
  },
];

export const PLACEABLE_BRICKS: BrickType[] = [
  BrickType.Rock,
  BrickType.Soil,
  BrickType.Grass,
  BrickType.Wood,
  BrickType.Sand,
  BrickType.Leaves,
  BrickType.Water,
];

export function brickDef(type: BrickType | number): BrickDef {
  return DEFAULT_PALETTE[type] ?? DEFAULT_PALETTE[BrickType.Air];
}

export function isCollidable(type: number): boolean {
  return brickDef(type).collidable;
}

export function isOpaqueSolid(type: number): boolean {
  const d = brickDef(type);
  return d.solid && !d.transparent;
}
