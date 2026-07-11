import * as THREE from 'three';
import { BrickType, brickDef } from '../proto/brick';

const SIZE = 16;

/** Deterministic pixel hash (0..1). */
function hash3(x: number, y: number, salt: number): number {
  let n = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ salt;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, v | 0));
}

/**
 * Tiny procedural face textures so blocks aren't flat single-colors.
 * Kept deliberately simple (16×16 canvas, nearest filtering).
 */
export function makeBrickTexture(type: BrickType): THREE.Texture | null {
  if (type === BrickType.Air) return null;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const base = hexToRgb(brickDef(type).color);
  const img = ctx.createImageData(SIZE, SIZE);
  const data = img.data;
  const salt = type * 9973;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      let [r, g, b] = base;
      const n = hash3(x, y, salt);
      const n2 = hash3(x, y, salt + 17);

      switch (type) {
        case BrickType.Grass: {
          // Mottled greens + occasional darker dirt fleck.
          const d = (n - 0.5) * 44;
          r = clamp(r + d * 0.35);
          g = clamp(g + d);
          b = clamp(b + d * 0.25);
          if (n2 > 0.92) {
            r = clamp(r * 0.55 + 40);
            g = clamp(g * 0.45 + 20);
            b = clamp(b * 0.3);
          }
          break;
        }
        case BrickType.Wood: {
          // Vertical bark streaks + occasional knot.
          const streak = hash3(x, 0, salt + 3);
          const d = (streak - 0.5) * 50 + (n - 0.5) * 16;
          r = clamp(r + d);
          g = clamp(g + d * 0.7);
          b = clamp(b + d * 0.4);
          if (n2 > 0.96) {
            r = clamp(r * 0.55);
            g = clamp(g * 0.5);
            b = clamp(b * 0.4);
          }
          break;
        }
        case BrickType.Rock: {
          // Speckled grey continuum.
          const d = (n - 0.5) * 60;
          r = clamp(r + d);
          g = clamp(g + d);
          b = clamp(b + d);
          if (n2 > 0.88) {
            const k = n2 > 0.96 ? 1.25 : 0.7;
            r = clamp(r * k);
            g = clamp(g * k);
            b = clamp(b * k);
          }
          break;
        }
        case BrickType.Soil: {
          const d = (n - 0.5) * 36;
          r = clamp(r + d);
          g = clamp(g + d * 0.7);
          b = clamp(b + d * 0.4);
          if (n2 > 0.9) {
            r = clamp(r + 20);
            g = clamp(g + 8);
          }
          break;
        }
        case BrickType.Sand: {
          const d = (n - 0.5) * 28;
          r = clamp(r + d);
          g = clamp(g + d);
          b = clamp(b + d * 0.6);
          break;
        }
        case BrickType.Leaves: {
          const d = (n - 0.5) * 50;
          r = clamp(r + d * 0.4);
          g = clamp(g + d);
          b = clamp(b + d * 0.3);
          if (n2 > 0.85) {
            g = clamp(g + 25);
            r = clamp(r - 8);
          }
          break;
        }
        case BrickType.Water: {
          const d = (n - 0.5) * 30;
          r = clamp(r + d * 0.4);
          g = clamp(g + d * 0.6);
          b = clamp(b + d);
          if (n2 > 0.9) {
            r = clamp(r + 30);
            g = clamp(g + 30);
            b = clamp(b + 20);
          }
          break;
        }
        default: {
          const d = (n - 0.5) * 24;
          r = clamp(r + d);
          g = clamp(g + d);
          b = clamp(b + d);
        }
      }

      // Soft vignette / per-edge darken so blocks read less like flat tiles.
      const edge =
        Math.min(x, y, SIZE - 1 - x, SIZE - 1 - y) === 0
          ? 0.86
          : Math.min(x, y, SIZE - 1 - x, SIZE - 1 - y) === 1
            ? 0.94
            : 1;
      data[i] = clamp(r * edge);
      data[i + 1] = clamp(g * edge);
      data[i + 2] = clamp(b * edge);
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
