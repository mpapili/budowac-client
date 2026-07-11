# budowac-client

Vite + TypeScript + ThreeJS website/game client for Budowac.

## Features (offline playable)

- Local voxel terrain generation (rock / soil / grass / sand / water / trees)
- Face-culled chunk meshing
- FPS controls (pointer lock, WASD, jump, sprint)
- Place / break blocks with hotbar
- HUD, crosshair, net status

Networking to `budowac-api` / `budowac-gateway` is **stubbed** — the sim runs fully client-side. Call sites that will send `PlayerInput`, `Edit`, `ChunkRequest`, etc. are marked with `NET placeholder` comments.

## Dev

```bash
npm install
npm run dev    # http://localhost:5173
```

By default the client talks to the API/gateway on **the same hostname the page
was loaded from** (ports `8080` / `8081`). Opening `http://192.168.x.x:5173`
targets `http://192.168.x.x:8080` and `ws://192.168.x.x:8081`.

Optional build-time env (Vite) overrides: `VITE_API_URL`, `VITE_GATEWAY_URL`.

## Layout

```
src/
  main.ts           # bootstrap + game loop wiring
  render/           # ThreeJS scene, mesher, materials, loop
  world/            # chunks, local generator, ClientWorld
  input/            # controls, player physics, voxel raycast
  net/              # API + gateway stubs
  ui/               # HUD helpers
  proto/            # duplicated wire types + brick palette
```
