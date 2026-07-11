export interface MoveAxes {
  /** Strafe: -1 left … +1 right */
  x: number;
  /** Forward: -1 back (W) … +1 forward (S) in camera-local Z */
  z: number;
}

export interface LookAngles {
  yaw: number;
  pitch: number;
}

/**
 * FPS-style controls: WASD, Space jump, Shift sprint, pointer-lock look,
 * 1–7 hotbar, left/right click place/break.
 */
export class Controls {
  readonly move: MoveAxes = { x: 0, z: 0 };
  jumpPressed = false;
  breakHeld = false;
  placeHeld = false;
  /** Rising-edge flags consumed once per frame. */
  breakClick = false;
  placeClick = false;
  readonly look: LookAngles = { yaw: 0, pitch: 0 };
  hotbarIndex = 0;
  pointerLocked = false;

  private keys = new Set<string>();
  private readonly sensitivity = 0.0022;
  private readonly canvas: HTMLElement;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      this.keys.add(e.code);
      this.recompute();
      if (e.code === 'Space') {
        this.jumpPressed = true;
        e.preventDefault();
      }
      if (e.code.startsWith('Digit')) {
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= 7) this.hotbarIndex = n - 1;
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.recompute();
    });

    canvas.addEventListener('click', () => {
      if (!this.pointerLocked) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.look.yaw -= e.movementX * this.sensitivity;
      this.look.pitch -= e.movementY * this.sensitivity;
      const maxPitch = Math.PI / 2 - 0.01;
      this.look.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.look.pitch));
    });

    canvas.addEventListener('mousedown', (e) => {
      if (!this.pointerLocked) return;
      if (e.button === 0) {
        this.breakHeld = true;
        this.breakClick = true;
      } else if (e.button === 2) {
        this.placeHeld = true;
        this.placeClick = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.breakHeld = false;
      if (e.button === 2) this.placeHeld = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.pointerLocked) return;
        e.preventDefault();
        const dir = e.deltaY > 0 ? 1 : -1;
        this.hotbarIndex = (this.hotbarIndex + dir + 7) % 7;
      },
      { passive: false },
    );
  }

  get sprinting(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  consumeClicks(): { break: boolean; place: boolean } {
    const out = { break: this.breakClick, place: this.placeClick };
    this.breakClick = false;
    this.placeClick = false;
    return out;
  }

  consumeJump(): boolean {
    const j = this.jumpPressed;
    this.jumpPressed = false;
    return j;
  }

  /** Apply yaw/pitch to a camera via Euler YXZ (FPS convention). */
  applyLook(camera: { rotation: { order: string; x: number; y: number } }): void {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = this.look.yaw;
    camera.rotation.x = this.look.pitch;
  }

  private recompute(): void {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (x !== 0 && z !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      z *= inv;
    }
    this.move.x = x;
    this.move.z = z;
  }
}
