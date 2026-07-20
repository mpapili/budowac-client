/* eslint-disable @typescript-eslint/no-explicit-any -- Three.js mock requires any */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LERP_HORIZONTAL, LERP_VERTICAL } from './remotes';
import type { EntityState } from '../proto/types';

/* ------------------------------------------------------------------ */
/*  Lerp constant values                                              */
/* ------------------------------------------------------------------ */

describe('lerp constants', () => {
  it('LERP_VERTICAL is smaller than LERP_HORIZONTAL', () => {
    expect(LERP_VERTICAL).toBeLessThan(LERP_HORIZONTAL);
  });

  it('LERP_HORIZONTAL equals 0.35', () => {
    expect(LERP_HORIZONTAL).toBe(0.35);
  });

  it('LERP_VERTICAL equals 0.12', () => {
    expect(LERP_VERTICAL).toBe(0.12);
  });
});

/* ------------------------------------------------------------------ */
/*  Lerp math behaviour (pure interpolation, no Three.js needed)      */
/* ------------------------------------------------------------------ */

describe('lerp interpolation', () => {
  it('vertical lerp closes a 1-unit gap slower than horizontal', () => {
    const gap = 1;
    const hStep = gap * LERP_HORIZONTAL;
    const vStep = gap * LERP_VERTICAL;
    expect(vStep).toBeLessThan(hStep);
    // After one step horizontal closes 35 %, vertical only 12 %
    expect(hStep).toBeCloseTo(0.35);
    expect(vStep).toBeCloseTo(0.12);
  });

  it('convergence: vertical needs more steps than horizontal to reach within 0.01', () => {
    function stepsToConverge(factor: number, threshold: number): number {
      let gap = 1;
      let n = 0;
      while (gap > threshold) {
        gap *= 1 - factor;
        n++;
      }
      return n;
    }
    const hSteps = stepsToConverge(LERP_HORIZONTAL, 0.01);
    const vSteps = stepsToConverge(LERP_VERTICAL, 0.01);
    expect(vSteps).toBeGreaterThan(hSteps);
    // Horizontal ~13 steps, vertical ~38 steps at 0.01 threshold
    expect(hSteps).toBeLessThanOrEqual(15);
    expect(vSteps).toBeGreaterThanOrEqual(30);
  });
});

/* ------------------------------------------------------------------ */
/*  RemotePlayers integration (with mocked Three.js)                  */
/* ------------------------------------------------------------------ */

describe('RemotePlayers', () => {
  // Minimal Three.js mock — only what RemotePlayers touches.
  let MockGroup: any;
  let MockScene: any;
  let instances: any[];

  beforeEach(() => {
    instances = [];
    MockGroup = vi.fn(() => {
      const inst: any = { name: '', position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 }, children: [] };
      inst.add = vi.fn();
      inst.remove = vi.fn(() => {});
      instances.push(inst);
      return inst;
    });

    MockScene = { add: vi.fn() };

    vi.doMock('three', () => ({ Group: MockGroup }));
  });

  it('applies different lerp to Y vs X/Z', async () => {
    const { RemotePlayers } = await import('./remotes');

    const rp = new RemotePlayers(MockScene);

    // Set target at (10, 10, 10), mesh starts at (0, 0, 0)
    const entities: EntityState[] = [
      { entityId: 'e1', x: 10, y: 10, z: 10, yaw: 0, pitch: 0 },
    ];
    rp.applyEntities(entities, null);

    // Find the mesh group for e1 (it's added to rp.root)
    const mesh = (rp as any).meshes.get('e1');
    expect(mesh).toBeDefined();

    // Reset mesh to origin so we can measure interpolation
    mesh.position.x = 0;
    mesh.position.y = 0;
    mesh.position.z = 0;
    mesh.rotation.y = 0;

    // One update frame
    rp.update(1 / 60);

    // X and Z should move by LERP_HORIZONTAL * 10
    expect(mesh.position.x).toBeCloseTo(0 + 10 * LERP_HORIZONTAL);
    expect(mesh.position.z).toBeCloseTo(0 + 10 * LERP_HORIZONTAL);
    // Y should move by LERP_VERTICAL * 10 (less than X/Z)
    expect(mesh.position.y).toBeCloseTo(0 + 10 * LERP_VERTICAL);
  });

  it('yaw uses horizontal lerp', async () => {
    const { RemotePlayers } = await import('./remotes');

    const rp = new RemotePlayers(MockScene);

    const targetYaw = Math.PI / 2; // 90 degrees
    const entities: EntityState[] = [
      { entityId: 'e2', x: 0, y: 0, z: 0, yaw: targetYaw, pitch: 0 },
    ];
    rp.applyEntities(entities, null);

    const mesh = (rp as any).meshes.get('e2');
    mesh.rotation.y = 0;

    rp.update(1 / 60);

    expect(mesh.rotation.y).toBeCloseTo(targetYaw * LERP_HORIZONTAL);
  });

  it('excludes local player from remote mesh set', async () => {
    const { RemotePlayers } = await import('./remotes');

    const rp = new RemotePlayers(MockScene);

    const entities: EntityState[] = [
      { entityId: 'local', x: 1, y: 2, z: 3, yaw: 0, pitch: 0 },
      { entityId: 'remote', x: 4, y: 5, z: 6, yaw: 0, pitch: 0 },
    ];
    rp.applyEntities(entities, 'local');

    expect((rp as any).meshes.has('local')).toBe(false);
    expect((rp as any).meshes.has('remote')).toBe(true);
  });

  it('creates goat mesh for kind=goat entities', async () => {
    const { RemotePlayers } = await import('./remotes');

    const rp = new RemotePlayers(MockScene);

    const entities: EntityState[] = [
      { entityId: 'goat1', x: 0, y: 0, z: 0, yaw: 0, pitch: 0, kind: 'goat' },
    ];
    rp.applyEntities(entities, null);

    const mesh = (rp as any).meshes.get('goat1');
    expect(mesh).toBeDefined();
    expect((rp as any).kinds.get('goat1')).toBe('goat');
  });

  it('removes entities no longer in snapshot', async () => {
    const { RemotePlayers } = await import('./remotes');

    const rp = new RemotePlayers(MockScene);

    // First frame: two entities
    rp.applyEntities(
      [
        { entityId: 'a', x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
        { entityId: 'b', x: 1, y: 1, z: 1, yaw: 0, pitch: 0 },
      ],
      null,
    );
    expect((rp as any).meshes.size).toBe(2);

    // Second frame: only 'a' remains
    rp.applyEntities(
      [{ entityId: 'a', x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }],
      null,
    );
    expect((rp as any).meshes.has('a')).toBe(true);
    expect((rp as any).meshes.has('b')).toBe(false);
  });
});
