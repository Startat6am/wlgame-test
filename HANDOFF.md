# WLGame Handoff — Recovery Checkpoint

> Read this file first after a frozen browser, interrupted chat, context loss, or when starting a new development session. GitHub is the source of truth; always verify the live branch and deployment before editing.

- **Repository:** https://github.com/Startat6am/wlgame-test
- **Branch:** `main`
- **Checkpoint date:** 2026-11-24
- **Current isometric work branch:** `feature/isometric-arena`.
- **Latest isometric implementation commit:** `cc5abc214ee69b1f5d3537ea55b3067d7f2edc9d` (pointer/FIRE coordinate fixes and actor-foot/depth alignment).
- **Base commit:** `b30dccee049e99af70a9563deccb2f97676183b3`.
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
6. FIRE is an aim-stick action: press and drag on the button to choose a direction, then release to cast. A stationary tap fires in the hero's current facing direction. Keyboard aiming remains available with Space followed by a target click.

7. Isometric prototype work is in `feature/isometric-arena`: diamond arena rendering, projected obstacles/actors/projectiles, and screen/world coordinate conversion for movement and aiming. This branch is not merged or deployed; browser testing and CI verification are still required.

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
- FIRE now supports press-drag-release directional aiming and tap-to-fire-forward; verify mouse and touch pointer handling in a real browser after deployment.
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

## 7. Current isometric branch checkpoint

- The simulation and WebSocket server continue to use the existing Cartesian world coordinates.
- `src/game/geometry/isometric.js` owns world/screen projection and inverse transforms; tests live beside it.
- Server snapshots now include `facingX`/`facingY` so the client can orient projected local and remote actors consistently.
- `ArenaScene.js` renders the arena as a diamond with diagonal grid lines, projected obstacles, actors, aim marker, and projectiles.
- Keyboard/touch screen directions and FIRE drag aim are converted back to simulation directions; a stationary FIRE tap preserves the hero's world-facing direction.
- PR: https://github.com/Startat6am/wlgame-test/pull/1 (draft).
- Latest observed Vercel status: failed with `build-rate-limit` (project/team limit; not an application build failure). Vercel deployment inspection returned 403 Forbidden; no deployment status is claimed.
- GitHub Actions CI run #34 passed build/tests/server syntax on earlier checkpoint `f714c8e`; newer pointer/render alignment commits have not yet received a reported Actions run.
- Recent code review fixes: pointer targeting now uses camera-adjusted world coordinates; FIRE drag stores the already-converted world direction (no second transform); obstacle footprints are scaled to match their circular physics bodies; actor sprites use bottom-origin positioning for foot/depth alignment.
- Not yet verified on latest HEAD: Vite production build, CI, browser rendering, collision alignment, camera behavior on phone aspect ratios, and live network aim direction. Do not merge or describe this as production-ready until those checks pass.

## 8. Next actions (priority order)

1. Confirm the latest Vercel production deployment completes, then compare its deployed SHA with current `main`.
2. Add a lightweight frame-time monitor (rolling samples, p95/p99, max frame time) and capture real desktop/mobile baselines.
3. Validate joystick redraw and 20 Hz input behavior in browser on desktop and mobile.
4. Browser-test FIRE aim-stick behavior on desktop and touch devices: drag direction, stationary tap forward, release outside the button, cooldown, and projectile visibility in offline and connected modes.
5. Complete offline Fireball collision/damage/knockback/death/respawn with automated tests.
5. Configure and deploy the authoritative WebSocket server on persistent hosting; test multi-client sessions.

---

**Maintenance rule:** update this file only with verified repository, CI, and deployment evidence. A drafted change or requested deployment is not a completed task.
