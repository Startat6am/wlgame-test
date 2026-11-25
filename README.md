# WLGame — Warlock Arena

Browser-based 2D arena prototype inspired by the mechanics of Warcraft III custom map **Warlock Arena 0.88**.

## Current milestone

- Phaser 3 arena prototype with a controllable placeholder hero.
- Keyboard (WASD / arrows) and touch joystick movement.
- Responsive canvas and mobile-friendly layout.
- Optional WebSocket connection to a Node.js server; local movement remains available when the server is offline.
- Server-side validation of movement input and authoritative position simulation foundation.

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

In another terminal, start the WebSocket server:

```bash
npm run server
```

The client connects to `ws://localhost:2567` when available. Without it, the prototype runs in local mode.

For a deployed client, set `VITE_WS_SERVER_URL` to the persistent WebSocket server URL (for example, `wss://your-host.example`) in the deployment environment. If unset, the client falls back to the current hostname on port `2567`. See `.env.example`.

## Controls

- Desktop: WASD or arrow keys.
- Mobile: hold and drag the virtual joystick at the lower-left of the arena.
- Use the browser's device toolbar or a phone to test touch controls.

## Project layout

```text
client/
  src/
    game/
      scenes/
      input/
    net/
server/
.github/workflows/
```

## Architecture notes

- The client sends normalized movement intent, not trusted world coordinates.
- The server validates input, clamps movement, and broadcasts snapshots.
- Gameplay rules should move to shared/server-side modules as combat is implemented.
- PostgreSQL persistence, rooms, matchmaking, bots, heroes, abilities, and items are intentionally not faked in this first milestone.

## Scripts

- `npm run dev` — Vite development server.
- `npm run build` — production client build.
- `npm run preview` — preview production build.
- `npm run server` — WebSocket server.
