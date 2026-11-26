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

- Vercel Function `/api/ws`: WebSocket transport and local connection fan-out.
- Upstash Redis: cross-instance message fan-out, room coordination, and recoverable authoritative state.
- `server/game-simulation.js`: transport-independent authoritative 20 Hz game simulation, shared by local and Vercel adapters.

Vercel pins each WebSocket connection to one Function instance and closes it at the Function's maximum duration. The client now reconnects with bounded exponential backoff. Because different players can land on different instances, instance-local memory alone is not a valid multiplayer state store.

**Migration status:** simulation extraction and client reconnect support are implemented and locally verified. The Vercel WebSocket endpoint and Redis-backed cross-instance coordinator are not enabled yet. No Redis database is currently connected to this project; do not deploy an instance-local-only multiplayer endpoint as if it supported cross-instance matches.

For an explicitly configured external development server, set `VITE_WS_SERVER_URL` to its `ws://` or `wss://` URL. See `.env.example`.

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
