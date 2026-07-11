/** Duplicated wire tags — reconcile with initial-repo-spec.md */
export enum MessageTag {
  Hello = 0,
  Auth = 1,
  ChunkRequest = 2,
  ChunkData = 3,
  ChunkDiff = 4,
  PlayerInput = 5,
  Snapshot = 6,
  EntityState = 7,
  Edit = 8,
  Occurrence = 9,
  StateSummary = 10,
  /** gateway ↔ server only (not client WS). */
  Join = 11,
  Leave = 12,
}
