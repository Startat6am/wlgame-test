# WLGame — Warlock Arena

Browser-based 2D arena prototype inspired by the mechanics of Warcraft III custom map **Warlock Arena 0.88**.

## Current milestone

- Phaser 3 isometric arena prototype with keyboard and touch controls.
- Offline training target and authoritative WebSocket combat simulation.
- Node.js WebSocket transport for local development.
- Vercel Functions WebSocket migration in progress; cross-instance room coordination is the next infrastructure milestone.

> This is a technical foundation, not a recreation of the original map's complete balance or content. Original Warlock Arena 0.88 mechanics still need to be documented from a reliable map/version reference before implementing heroes, spells, items, and progression.

## Requirements

- Node.js 20+
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

In another terminal, start the local authoritative WebSocket server:

```bash
npm run server
```

The development client connects to `ws://localhost:2567`. Without the server, the prototype remains playable in local mode.

## WebSocket deployment direction

Vercel Functions now support native WebSocket connections. The target architecture is:

- Vercel Function `/api/ws`: WebSocket transport and per-instance connection fan-out (`api/ws.js` is now in the repository).
- Upstash Redis: durable input stream, fenced single-writer room lease, recoverable authoritative state, and Pub/Sub snapshot fan-out.
- `server/game-simulation.js`: transport-independent authoritative 20 Hz game simulation, shared by local and Vercel adapters.

Vercel pins each WebSocket connection to one Function instance and closes it at the Function's maximum duration. The client now reconnects with bounded exponential backoff. Because different players can land on different instances, instance-local memory alone is not a valid multiplayer state store.

**Migration status:** simulation extraction, client reconnect support, the Vercel `/api/ws` Function entrypoint, and a Redis-backed room runtime/coordinator are implemented with unit tests. The endpoint remains inactive until `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `VITE_WS_SERVER_URL=/api/ws` are configured. The Redis runtime uses a durable input stream, a fenced single-writer lease with epochs, recoverable simulation snapshots, and Pub/Sub SSE fan-out for tick snapshots. No Redis database is currently connected to this project; do not claim deployed multiplayer until the secrets are configured and a real two-client test passes.

For Vercel Preview/Production, set `VITE_WS_SERVER_URL=/api/ws`. For a separate development server, set it to an explicit `ws://` or `wss://` URL. See `.env.example`.

## Controls

- Desktop: WASD or arrow keys.
- Mobile: hold and drag the virtual joystick at the lower-left of the arena.
- FIRE: tap to cast in the current facing direction or drag to aim before release.

## Project layout

```text
api/                  # planned Vercel Function entrypoints
server/
  game-simulation.js  # authoritative simulation, independent of transport
  index.js            # local Node.js WebSocket adapter
src/
  game/
  net/
.github/workflows/
```

## Architecture notes

- The client sends normalized movement intent, not trusted world coordinates.
- The authoritative simulation validates input, resolves movement and projectile collision, and produces snapshots.
- Network simulation runs at 20 Hz; remote actors are interpolated client-side between snapshots.
- The Vercel adapter must use shared coordination/state across Function instances before it is considered multiplayer-ready.
- PostgreSQL persistence, accounts, matchmaking, bots, heroes, abilities, and items remain separate roadmap work.

## Scripts

- `npm run dev` — Vite development server.
- `npm run build` — production client build.
- `npm run preview` — preview production build.
- `npm run server` — local WebSocket server.
- `npm test` — unit and WebSocket integration tests.
