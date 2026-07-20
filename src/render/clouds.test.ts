/* eslint-disable @typescript-eslint/no-explicit-any -- Three.js mock requires any */
import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Shared mutable state — cleared each test, captured by mocks       */
/* ------------------------------------------------------------------ */

const groupInstances: any[] = [];
const meshInstances: any[] = [];
const geomCalls: any[] = [];
const matCalls: any[] = [];
const setMatrixAtCalls: { index: number }[] = [];

function makeMockThree() {
  return {
    Group: vi.fn(() => {
      const inst: any = { name: '' };
      inst.add = vi.fn();
      groupInstances.push(inst);
      return inst;
    }),
    InstancedMesh: vi.fn(() => {
      const inst: any = { frustumCulled: true };
      inst.setMatrixAt = vi.fn((idx: number) => {
        setMatrixAtCalls.push({ index: idx });
      });
      meshInstances.push(inst);
      return inst;
    }),
    IcosahedronGeometry: vi.fn((r: number, d: number) => {
      geomCalls.push({ r, d });
      return { dispose: vi.fn() };
    }),
    MeshLambertMaterial: vi.fn((opts: any) => {
      matCalls.push(opts);
      return opts;
    }),
    Object3D: vi.fn(() => ({
      position: { set: vi.fn() },
      scale: { set: vi.fn() },
      rotation: { set: vi.fn() },
      updateMatrix: vi.fn(),
      matrix: new Float32Array(16),
    })),
  };
}

vi.mock('three', () => makeMockThree());

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('createClouds', () => {
  let MockScene: any;

  beforeEach(() => {
    // Clear shared state arrays
    groupInstances.length = 0;
    meshInstances.length = 0;
    geomCalls.length = 0;
    matCalls.length = 0;
    setMatrixAtCalls.length = 0;

    // Clear all mock call histories
    vi.clearAllMocks();

    MockScene = { add: vi.fn() };
  });

  it('adds a group named "clouds" to the scene', async () => {
    const { createClouds } = await import('./clouds');
    createClouds(MockScene);
    expect(MockScene.add).toHaveBeenCalled();
    expect(groupInstances[0].name).toBe('clouds');
  });

  it('creates exactly one InstancedMesh', async () => {
    const { createClouds } = await import('./clouds');
    createClouds(MockScene);
    expect(meshInstances.length).toBe(1);
  });

  it('sets frustumCulled to false on the InstancedMesh', async () => {
    const { createClouds } = await import('./clouds');
    createClouds(MockScene);
    expect(meshInstances[0].frustumCulled).toBe(false);
  });

  it('uses IcosahedronGeometry with detail 0', async () => {
    const { createClouds } = await import('./clouds');
    createClouds(MockScene);
    expect(geomCalls.length).toBe(1);
    expect(geomCalls[0].r).toBe(1);
    expect(geomCalls[0].d).toBe(0);
  });

  it('uses MeshLambertMaterial with correct cloud options', async () => {
    const { createClouds } = await import('./clouds');
    createClouds(MockScene);
    const matOpts = matCalls[0];
    expect(matOpts.color).toBe(0xffffff);
    expect(matOpts.transparent).toBe(true);
    expect(matOpts.opacity).toBe(0.7);
    expect(matOpts.depthWrite).toBe(false);
  });

  it('generates between 20 and 60 puffs total', async () => {
    const { createClouds } = await import('./clouds');
    createClouds(MockScene);
    const count = setMatrixAtCalls.length;
    expect(count).toBeGreaterThanOrEqual(20);
    expect(count).toBeLessThanOrEqual(60);
  });

  it('adds the InstancedMesh to the clouds group', async () => {
    const { createClouds } = await import('./clouds');
    createClouds(MockScene);
    expect(groupInstances[0].add).toHaveBeenCalledWith(meshInstances[0]);
  });
});
