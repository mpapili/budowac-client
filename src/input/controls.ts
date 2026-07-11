export interface MoveAxes {
  x: number;
  y: number;
}

/** Keyboard WASD stub. Expandable: mouse look, build/break tools. */
export class Controls {
  readonly move: MoveAxes = { x: 0, y: 0 };
  private keys = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this.recompute();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.recompute();
    });
  }

  private recompute(): void {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    this.move.x = x;
    this.move.y = y;
  }
}
