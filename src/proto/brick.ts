export enum BrickType {
  Air = 0,
  Rock = 1,
  Soil = 2,
  Grass = 3,
  Wood = 4,
  Water = 5,
}

export interface BrickDef {
  type: BrickType;
  name: string;
  solid: boolean;
  liquid: boolean;
  transparent: boolean;
  collidable: boolean;
}

export const DEFAULT_PALETTE: BrickDef[] = [
  { type: BrickType.Air, name: 'air', solid: false, liquid: false, transparent: true, collidable: false },
  { type: BrickType.Rock, name: 'rock', solid: true, liquid: false, transparent: false, collidable: true },
  { type: BrickType.Soil, name: 'soil', solid: true, liquid: false, transparent: false, collidable: true },
  { type: BrickType.Grass, name: 'grass', solid: true, liquid: false, transparent: false, collidable: true },
  { type: BrickType.Wood, name: 'wood', solid: true, liquid: false, transparent: false, collidable: true },
  { type: BrickType.Water, name: 'water', solid: false, liquid: true, transparent: true, collidable: false },
];
