import { BrickType, PLACEABLE_BRICKS, brickDef } from '../proto/brick';
import type { BrickMaterials } from '../render/materials';

export function setStatus(text: string): void {
  const el = document.getElementById('status');
  if (el) el.textContent = text;
}

export function setCoords(text: string): void {
  const el = document.getElementById('coords');
  if (el) el.textContent = text;
}

export function setNetStatus(text: string): void {
  const el = document.getElementById('net');
  if (el) el.textContent = text;
}

export function setHint(text: string): void {
  const el = document.getElementById('hint');
  if (el) el.textContent = text;
}

/** Paint hotbar items from palette + highlight selection. */
export function renderHotbar(
  selected: number,
  materials: BrickMaterials,
): void {
  const root = document.getElementById('hotbar');
  if (!root) return;
  root.innerHTML = '';
  PLACEABLE_BRICKS.forEach((type, i) => {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot' + (i === selected ? ' active' : '');
    slot.title = brickDef(type).name;
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.background = materials.hex(type);
    if (type === BrickType.Water || type === BrickType.Leaves) {
      swatch.style.opacity = '0.75';
    }
    const key = document.createElement('span');
    key.className = 'key';
    key.textContent = String(i + 1);
    slot.appendChild(swatch);
    slot.appendChild(key);
    root.appendChild(slot);
  });
}

export function setCrosshairVisible(v: boolean): void {
  const el = document.getElementById('crosshair');
  if (el) el.style.opacity = v ? '1' : '0.35';
}
