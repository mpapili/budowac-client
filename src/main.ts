import { createScene } from './render/scene';
import { startLoop } from './render/loop';
import { Controls } from './input/controls';
import { GatewayClient, GATEWAY_URL } from './net/gateway';
import { pingApi, API_URL } from './net/api';
import { ClientWorld } from './world/state';
import { setStatus } from './ui/hud';
import * as THREE from 'three';

async function boot(): Promise<void> {
  const bundle = createScene();
  const controls = new Controls();
  const world = new ClientWorld();
  const gw = new GatewayClient();

  const apiOk = await pingApi();
  setStatus(`API ${apiOk ? 'ok' : 'down'} (${API_URL}) · gateway ${GATEWAY_URL}`);

  gw.onMessage = (data) => {
    console.debug('gateway frame', data);
  };
  try {
    gw.connect();
  } catch (e) {
    console.warn('gateway connect failed', e);
  }

  // Gentle orbit of the camera around origin for life motion.
  let t = 0;
  startLoop(bundle, (dt) => {
    t += dt;
    const r = 16;
    bundle.camera.position.x = Math.cos(t * 0.15) * r;
    bundle.camera.position.z = Math.sin(t * 0.15) * r;
    bundle.camera.position.y = 10 + Math.sin(t * 0.3) * 1.5;
    bundle.camera.lookAt(0, 0, 0);

    // Feed predicted move into future input path (stub).
    if (controls.move.x || controls.move.y) {
      const dir = new THREE.Vector3(controls.move.x, 0, controls.move.y);
      void dir;
      void world;
    }
  });
}

boot().catch((e) => {
  setStatus('boot failed: ' + (e as Error).message);
  console.error(e);
});
