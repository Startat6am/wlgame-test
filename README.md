# WLGame — Warlock Arena

Browser-based 2D arena prototype inspired by the mechanics of Warcraft III custom map **Warlock Arena 0.88**.

## Current milestone

- Phaser 3 isometric arena prototype with keyboard and touch controls.
- Offline training target and authoritative WebSocket combat simulation.
- Node.js WebSocket transport for local development.
- Vercel WebSocket Function + Upstash Redis room coordinator implemented; live multi-instance gameplay validation remains.

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

**Migration status:** simulation extraction, client reconnect support, the Vercel `/api/ws` Function, and Redis-backed room runtime are implemented. A free Upstash database is provisioned in Frankfurt (`eu-central-1`), and its server-only secrets plus `VITE_WS_SERVER_URL=/api/ws` are configured in Vercel Preview for `feature/isometric-arena` only. Vercel Functions are configured for Stockholm (`arn1`) with a 300-second maximum duration. Live checks have verified Redis lease acquisition, stream append/read, and fenced tick-state commit; Pub/Sub SSE and two-client cross-instance gameplay still need end-to-end verification. Production environment variables and aliases have not been changed.

For Vercel Preview/Production, set `VITE_WS_SERVER_URL=/api/ws`. For a separate development server, set it to an explicit `ws://` or `wss://` URL. See `.env.example`.

## Controls

- Desktop: WASD or arrow keys.
- Mobile: hold and drag the virtual joystick at the lower-left of the arena.
- FIRE: tap to cast in the current facing direction or drag to aim before release.

## Project layout

```text
api/ws.js             # Vercel WebSocket Function entrypoint
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
- The Vercel adapter uses Redis-backed shared coordination/state; it is not multiplayer-ready until live SSE fan-out and two-client cross-instance gameplay are verified.
- PostgreSQL persistence, accounts, matchmaking, bots, heroes, abilities, and items remain separate roadmap work.

## Scripts

- `npm run dev` — Vite development server.
- `npm run build` — production client build.
- `npm run preview` — preview production build.
- `npm run server` — local WebSocket server.
- `npm test` — unit and WebSocket integration tests.
