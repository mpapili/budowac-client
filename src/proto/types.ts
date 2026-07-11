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
  /** Absolute client pose (relay multiplayer). */
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  tick: number;
}

export interface EntityState {
  entityId: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  brickType?: number;
}

export interface Snapshot {
  seq: number;
  lastInputSeq: number;
  entities: EntityState[];
}

/** NET: server → client full chunk (via gateway ChunkData frame). */
export interface ChunkData {
  cx: number;
  cy: number;
  cz: number;
  /** Dense BrickType bytes, length CHUNK_SIZE³. */
  blocks: Uint8Array | number[];
}

/** NET: client → gateway → server brick mutation request. */
export interface Edit {
  x: number;
  y: number;
  z: number;
  oldBrick: number;
  newBrick: number;
}

/**
 * NET: server → client block overrides.
 * Multiplayer path uses world-space `edits` (matches Go ChunkDiff).
 */
export interface ChunkDiff {
  gameId?: string;
  chunkX?: number;
  chunkY?: number;
  chunkZ?: number;
  edits?: Edit[];
  /** Legacy sparse local-chunk form (unused in relay path). */
  cx?: number;
  cy?: number;
  cz?: number;
  changes?: { lx: number; ly: number; lz: number; brickType: number }[];
}

export interface WorldMeta {
  worldId: string;
  name: string;
  seed: number;
  playerCount: number;
}
