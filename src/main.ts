import * as THREE from 'three';
import { createScene, setHighlight, syncChunkMeshes } from './render/scene';
import { startLoop } from './render/loop';
import { BreakFx } from './render/breakFx';
import { RemotePlayers } from './render/remotes';
import { Controls } from './input/controls';
import { Player } from './input/player';
import { raycastVoxels } from './input/raycast';
import { GatewayClient, GATEWAY_URL } from './net/gateway';
import { pingApi, fetchToken, API_URL } from './net/api';
import { ClientWorld } from './world/state';
import {
  setStatus,
  setCoords,
  setNetStatus,
  setHint,
  renderHotbar,
  setCrosshairVisible,
} from './ui/hud';
import { PLACEABLE_BRICKS, BrickType, brickDef } from './proto/brick';
import { MessageTag } from './proto/tags';
import type { ChunkDiff, Snapshot } from './proto/types';

const INPUT_HZ = 20;
const INPUT_DT = 1 / INPUT_HZ;

function randomPlayerName(): string {
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `Player${n}`;
}

/**
 * Budowac client bootstrap.
 * Local sandbox + multiplayer pose/edit relay when gateway/API are up.
 */
async function boot(): Promise<void> {
  const bundle = createScene();
  const controls = new Controls(bundle.renderer.domElement);
  const world = new ClientWorld(42, 3);
  const player = new Player(world.spawnPosition());
  const breakFx = new BreakFx(bundle.scene);
  const remotes = new RemotePlayers(bundle.scene);
  const gw = new GatewayClient();
  const playerName = randomPlayerName();
  let localPlayerId: string | null = null;
  let inputAccum = 0;

  for (const c of world.allChunks()) c.dirty = true;
  syncChunkMeshes(bundle, world);

  renderHotbar(controls.hotbarIndex, bundle.materials);
  setHint(
    'Click to capture mouse · WASD move · Space jump · LMB break · RMB place · 1-7 / scroll hotbar',
  );
  setStatus(`world ready · joining as ${playerName}`);
  setNetStatus(`API … · GW ${GATEWAY_URL}`);

  void (async () => {
    const apiOk = await pingApi();
    updateNetLine(apiOk, gw.connected);
  })();

  gw.onStatus = (_ok, _detail) => {
    void pingApi().then((apiOk) => updateNetLine(apiOk, gw.connected));
  };

  gw.onAuth = (r) => {
    if (r.ok && r.playerId) {
      localPlayerId = r.playerId;
      setStatus(`online as ${r.playerId}`);
    } else {
      setStatus('auth failed — playing offline');
    }
  };

  gw.onFrame = (tag, payload) => {
    if (tag === MessageTag.Snapshot) {
      const snap = payload as Snapshot;
      world.applySnapshot(snap);
      remotes.applyEntities(world.entities.values(), localPlayerId);
      return;
    }
    if (tag === MessageTag.ChunkDiff) {
      const diff = payload as ChunkDiff;
      if (diff.edits?.length) {
        world.applyWorldEdits(diff.edits);
        syncChunkMeshes(bundle, world);
      }
    }
  };

  try {
    gw.connect();
  } catch (e) {
    console.warn('gateway connect failed', e);
  }

  void (async () => {
    try {
      const tok = await fetchToken(playerName);
      localPlayerId = tok.playerId;
      gw.playerId = tok.playerId;
      gw.authenticate(tok.token);
    } catch (e) {
      console.warn('token fetch failed', e);
      setStatus('offline (no API token)');
    }
  })();

  function updateNetLine(apiOk: boolean, gwOk: boolean): void {
    const who = localPlayerId ? ` · id ${localPlayerId}` : '';
    setNetStatus(
      `API ${apiOk ? 'ok' : 'down'} (${API_URL}) · gateway ${gwOk ? 'up' : 'down'} (${GATEWAY_URL})${who}`,
    );
  }

  let lastHotbar = -1;
  const lookDir = new THREE.Vector3();

  startLoop(bundle, (dt) => {
    controls.applyLook(bundle.camera);
    player.update(dt, controls, world);
    player.syncCamera(bundle.camera);
    breakFx.update(dt);
    remotes.update(dt);

    if (gw.authenticated) {
      inputAccum += dt;
      if (inputAccum >= INPUT_DT) {
        inputAccum %= INPUT_DT;
        gw.sendInput({
          inputSeq: player.inputSeq,
          moveX: controls.move.x,
          moveY: -controls.move.z,
          jump: false,
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          yaw: controls.look.yaw,
          pitch: controls.look.pitch,
          tick: 0,
        });
      }
    }

    bundle.camera.getWorldDirection(lookDir);
    const eye = bundle.camera.position;
    const hit = raycastVoxels(world, eye, lookDir, 6);

    if (hit) {
      setHighlight(bundle, hit.x, hit.y, hit.z);
    } else {
      setHighlight(bundle, null, null, null);
    }

    const clicks = controls.consumeClicks();
    if (hit && controls.pointerLocked) {
      if (clicks.break) {
        const prev = world.getBlock(hit.x, hit.y, hit.z);
        if (prev !== BrickType.Air) {
          const edit = world.setBlock(hit.x, hit.y, hit.z, BrickType.Air);
          if (edit) {
            breakFx.burst(hit.x, hit.y, hit.z, prev);
            syncChunkMeshes(bundle, world);
            if (gw.authenticated) {
              gw.sendEdit({
                x: hit.x,
                y: hit.y,
                z: hit.z,
                oldBrick: prev,
                newBrick: BrickType.Air,
              });
            }
          }
        }
      }
      if (clicks.place) {
        const brick = PLACEABLE_BRICKS[controls.hotbarIndex] ?? BrickType.Rock;
        const px = player.position.x;
        const py = player.position.y;
        const pz = player.position.z;
        const overlapsPlayer =
          hit.px + 1 > px - 0.3 &&
          hit.px < px + 0.3 &&
          hit.py + 1 > py &&
          hit.py < py + 1.75 &&
          hit.pz + 1 > pz - 0.3 &&
          hit.pz < pz + 0.3;
        if (!overlapsPlayer && world.getBlock(hit.px, hit.py, hit.pz) === BrickType.Air) {
          const edit = world.setBlock(hit.px, hit.py, hit.pz, brick);
          if (edit) {
            syncChunkMeshes(bundle, world);
            if (gw.authenticated) {
              gw.sendEdit({
                x: hit.px,
                y: hit.py,
                z: hit.pz,
                oldBrick: BrickType.Air,
                newBrick: brick,
              });
            }
          }
        }
      }
    }

    if (controls.hotbarIndex !== lastHotbar) {
      lastHotbar = controls.hotbarIndex;
      renderHotbar(controls.hotbarIndex, bundle.materials);
      setStatus(
        localPlayerId
          ? `${localPlayerId} · holding ${brickDef(PLACEABLE_BRICKS[lastHotbar]).name}`
          : `holding ${brickDef(PLACEABLE_BRICKS[lastHotbar]).name}`,
      );
    }
    const peers = Math.max(0, world.entities.size - (localPlayerId ? 1 : 0));
    setCoords(
      `xyz ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}` +
        (hit ? ` · look ${brickDef(world.getBlock(hit.x, hit.y, hit.z)).name}` : '') +
        (peers > 0 ? ` · peers ${peers}` : ''),
    );
    setCrosshairVisible(controls.pointerLocked);
    if (!controls.pointerLocked) {
      setHint('Click the game to play · Esc releases mouse');
    } else {
      setHint('WASD · Space · Shift sprint · LMB break · RMB place · others are capsules');
    }
  });
}

boot().catch((e) => {
  setStatus('boot failed: ' + (e as Error).message);
  console.error(e);
});
