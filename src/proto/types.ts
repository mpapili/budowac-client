export interface Hello {
  version: string;
  playerName: string;
}

export interface Auth {
  token: string;
}

export interface PlayerInput {
  inputSeq: number;
  moveX: number;
  moveY: number;
  jump: boolean;
  tick: number;
}

export interface EntityState {
  entityId: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  brickType: number;
}

export interface Snapshot {
  seq: number;
  lastInputSeq: number;
  entities: EntityState[];
}

export interface WorldMeta {
  worldId: string;
  name: string;
  seed: number;
  playerCount: number;
}
