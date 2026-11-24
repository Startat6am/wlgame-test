# WLGame Handoff — Recovery Checkpoint

> Read this file first after a frozen browser, interrupted chat, context loss, or when starting a new development session. GitHub is the source of truth; always verify the live branch and deployment before editing.

- **Repository:** https://github.com/Startat6am/wlgame-test
- **Branch:** `main`
- **Checkpoint date:** 2026-11-24
- **Latest application-code commit:** `9e510f2789fda7d0057154aa16c799c6e9c1be95` — makes FIRE button cast immediately in the hero's facing direction.
- **Previous verified code checkpoint:** `32b211a156441d19f0377cc9274261460813dc15` — CI passed on run #25.
- **Current code commit CI:** pending at the time this handoff was last updated; verify the run for the exact HEAD SHA.
- **Handoff file was introduced in:** `be8deb33b3f3d10df5a67218e368213492f524bb`.

> The hashes above are historical checkpoints, not a substitute for checking the current `origin/main` HEAD. This file itself may be updated, creating newer documentation-only commits.

## 1. What is included in the verified code checkpoint

1. Touch joystick graphics use a dirty flag and are not redrawn every unchanged frame.
2. Client movement input is sent at 20 Hz to match the current server tick.
3. Server projectile radius checks use squared distance instead of `Math.hypot()`.
4. `docs/PERFORMANCE.md` documents the performance audit, implemented changes, measurement strategy, and backlog.
5. `ROADMAP.md` records project phases and acceptance criteria.
6. The FIRE button now casts a Fireball immediately in the hero's current facing direction. Keyboard aiming remains available with Space followed by a target click.

This is a verified source checkpoint, not a claim that the game is complete or all these changes are deployed.

## 2. Vercel deployment state

- **Project:** `wlgame-test`, Vite, linked to `Startat6am/wlgame-test`.
- **Production URL:** https://wlgame-test.vercel.app
- **Previously observed READY production deployment:** commit `0048fa0b839c8c2a25e0aba8491360d795ad70d1` (older than the code checkpoint above).
- **Observed deployment after adding this handoff:** Vercel created a new production deployment for the documentation commit `be8deb3`; it was **BUILDING** at the time of the check.
- **Important:** Always inspect the latest Vercel deployment and compare its commit SHA to current `origin/main`. Do not infer that the latest code is live just because a deployment exists.

Earlier attempts encountered Vercel's daily deployment API limit (HTTP 402). Check current deployment history and limits rather than assuming the limit still applies. A Vercel frontend deployment does not deploy the persistent Node.js WebSocket server; multiplayer server hosting must be separate.

## 3. Read these documents first

- [Roadmap](ROADMAP.md)
- [Performance strategy](docs/PERFORMANCE.md)
- [Game design](GAME_DESIGN.md)
- [Ability balance data](src/game/data/ability-balance.json)

## 4. Architecture / important files

- Phaser 3 client: `src/game/`
- Arena scene: `src/game/scenes/ArenaScene.js`
- Touch joystick: `src/game/input/TouchControls.js`
- Network client: `src/net/NetworkClient.js`
- Node WebSocket server: `server/index.js`
- Combat math/tests: `src/game/combat/combat-math.js` and related tests
- Performance notes: `docs/PERFORMANCE.md`

The online server is intended to be authoritative for movement, projectile hits, damage, and knockback. Current server simulation baseline: 20 Hz.

## 5. Known incomplete work and constraints

- Offline Fireball currently displays visual projectiles; offline collision, damage, knockback, death, and respawn still need implementation and tests.
- FIRE button behavior was changed to immediate cast; verify mouse and touch pointer-up handling in a real browser after deployment.
- No repeatable desktop/phone performance baseline has been captured yet. Do not claim performance gains without same-device before/after measurements.
- Object pools, texture atlases, DPR caps, and spatial partitioning remain profiling-driven backlog items.
- Client WebSocket URL needs explicit production configuration.
- Persistent WebSocket hosting, rooms/lobbies, reconnect handling, and load testing remain roadmap work.
- Do not invent exact Warlock Arena 0.88/0.88b mechanics or numeric balance values. Distinguish verified source data from estimates and data from other map versions.

## 6. Recovery procedure

1. Check local state: `git status --short --branch` and `git log -5 --oneline --decorate`.
2. Fetch remote: `git fetch origin`, then `git status -sb`. Inspect divergence before any reset/rebase; never force-push or reset blindly.
3. Read this file, `ROADMAP.md`, and the relevant design/performance document.
4. If dependencies are missing: `npm install`.
5. Validate using current package scripts: `npm test`, `npm run build`. For server changes also run `node --check server/index.js`. Confirm scripts in `package.json`.
6. Check GitHub Actions for the exact current HEAD SHA.
7. Check Vercel production deployment and compare deployed SHA with current `origin/main`.
8. Make focused changes, test, commit, and push.
9. After meaningful milestones, update this handoff with the latest verified app-code checkpoint, CI result, deployment SHA/status, blockers, and next action.

### If the chat/browser freezes

Start a new session with:

> Read `HANDOFF.md` in `Startat6am/wlgame-test` and resume from its latest verified checkpoint. First verify the current `main` SHA, CI, and Vercel production deployment.

Do not reconstruct work from chat memory until the repository and branch have been checked.

## 7. Next actions (priority order)

1. Confirm the latest Vercel production deployment completes, then compare its deployed SHA with current `main`.
2. Add a lightweight frame-time monitor (rolling samples, p95/p99, max frame time) and capture real desktop/mobile baselines.
3. Validate joystick redraw and 20 Hz input behavior in browser on desktop and mobile.
4. Browser-test the FIRE button on desktop and touch devices; verify cooldown feedback and projectile visibility in both offline and connected modes.
5. Complete offline Fireball collision/damage/knockback/death/respawn with automated tests.
5. Configure and deploy the authoritative WebSocket server on persistent hosting; test multi-client sessions.

---

**Maintenance rule:** update this file only with verified repository, CI, and deployment evidence. A drafted change or requested deployment is not a completed task.
