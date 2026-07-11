import type { EntityState, Snapshot } from '../proto/types';

/** Client-side world cache. Expandable: chunk map + palette-driven meshing. */
export class ClientWorld {
  entities = new Map<string, EntityState>();
  lastSnapshotSeq = 0;

  applySnapshot(s: Snapshot): void {
    this.lastSnapshotSeq = s.seq;
    for (const e of s.entities) {
      this.entities.set(e.entityId, e);
    }
  }
}
