import * as THREE from 'three';
import { BrickType, DEFAULT_PALETTE, brickDef } from '../proto/brick';
import { makeBrickTexture } from './textures';

/**
 * One material per brick type (shared across all chunk meshes).
 * Procedural 16×16 map for rough surface detail; vertex colors add face shade.
 */
export class BrickMaterials {
  private byType = new Map<BrickType, THREE.Material>();

  constructor() {
    for (const def of DEFAULT_PALETTE) {
      if (def.type === BrickType.Air) continue;
      const map = makeBrickTexture(def.type);
      // Map already carries base colour — keep mat colour white so maps aren't tinted twice.
      // (Mesh clones in mesher still enable vertexColors for ambient face shade.)
      if (def.transparent || def.liquid) {
        this.byType.set(
          def.type,
          new THREE.MeshLambertMaterial({
            color: 0xffffff,
            map: map ?? undefined,
            transparent: true,
            opacity: def.opacity,
            depthWrite: !def.liquid,
            side: THREE.DoubleSide,
          }),
        );
      } else {
        this.byType.set(
          def.type,
          new THREE.MeshLambertMaterial({
            color: 0xffffff,
            map: map ?? undefined,
          }),
        );
      }
    }
  }

  get(type: BrickType | number): THREE.Material {
    return this.byType.get(type as BrickType) ?? this.byType.get(BrickType.Rock)!;
  }

  /** Materials array ordered by BrickType for MultiMaterial geometry groups. */
  materialList(usedTypes: BrickType[]): THREE.Material[] {
    return usedTypes.map((t) => this.get(t));
  }

  /** Debug color for HUD chips. */
  hex(type: BrickType | number): string {
    return `#${brickDef(type).color.toString(16).padStart(6, '0')}`;
  }
}
