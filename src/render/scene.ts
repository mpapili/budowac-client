import * as THREE from 'three';
import type { Chunk } from '../world/chunk';
import type { ClientWorld } from '../world/state';
import { BrickMaterials } from './materials';
import { meshChunk } from './mesher';
import { createClouds } from './clouds';

export interface SceneBundle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  materials: BrickMaterials;
  /** Parent for all chunk meshes. */
  chunksRoot: THREE.Group;
  /** Highlight wireframe for targeted block. */
  highlight: THREE.LineSegments;
}

/**
 * ThreeJS environment: fog void, lights, chunk mesh root, block highlight.
 * Expand later: skybox, shadows, greedy mesher LOD.
 */
export function createScene(container: HTMLElement = document.body): SceneBundle {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5e0);
  scene.fog = new THREE.FogExp2(0xc8daf0, 0.012);

  createClouds(scene);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.08,
    400,
  );
  camera.position.set(0, 20, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.display = 'block';
  renderer.domElement.tabIndex = 0;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xb0c4de, 0.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4e0, 0.95);
  sun.position.set(40, 80, 20);
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0x9ec9ff, 0x4a7040, 0.35);
  scene.add(hemi);

  const chunksRoot = new THREE.Group();
  chunksRoot.name = 'chunks';
  scene.add(chunksRoot);

  // Block target outline (1³ wire box, re-positioned each frame).
  const hlGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
  const highlight = new THREE.LineSegments(
    hlGeom,
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }),
  );
  highlight.visible = false;
  scene.add(highlight);

  // Soft ground plane under everything (fallback / visual help).
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(512, 512),
    new THREE.MeshLambertMaterial({ color: 0x3d6b3d }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  scene.add(ground);

  const materials = new BrickMaterials();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, materials, chunksRoot, highlight };
}

/** (Re)build meshes for dirty chunks; dispose old geometry/materials clones. */
export function syncChunkMeshes(bundle: SceneBundle, world: ClientWorld): void {
  for (const chunk of world.allChunks()) {
    if (!chunk.dirty) continue;
    rebuildChunkMesh(bundle, world, chunk);
    chunk.dirty = false;
  }
}

export function rebuildChunkMesh(
  bundle: SceneBundle,
  world: ClientWorld,
  chunk: Chunk,
): void {
  const existing = bundle.chunksRoot.getObjectByName(chunk.key);
  if (existing) {
    disposeObject(existing);
    bundle.chunksRoot.remove(existing);
  }
  const mesh = meshChunk(chunk, world, bundle.materials);
  if (mesh) bundle.chunksRoot.add(mesh);
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const m = child as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
      else m.material.dispose();
    }
  });
}

export function setHighlight(
  bundle: SceneBundle,
  wx: number | null,
  wy: number | null,
  wz: number | null,
): void {
  if (wx === null || wy === null || wz === null) {
    bundle.highlight.visible = false;
    return;
  }
  bundle.highlight.visible = true;
  // BoxGeometry is centered at origin — shift to block center.
  bundle.highlight.position.set(wx + 0.5, wy + 0.5, wz + 0.5);
}
