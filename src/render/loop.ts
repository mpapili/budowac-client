import type { SceneBundle } from './scene';

export type UpdateFn = (dt: number) => void;

/** requestAnimationFrame game loop. Expandable for prediction / interp. */
export function startLoop(bundle: SceneBundle, update: UpdateFn): () => void {
  let last = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    bundle.renderer.render(bundle.scene, bundle.camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
