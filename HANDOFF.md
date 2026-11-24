# WLGame Handoff — Current Project Checkpoint

> **Purpose:** This file is the recovery entry point after a frozen browser, interrupted chat, context loss, or a new development session. Read this file first, then verify GitHub/Vercel state before changing code.
>
> **Checkpoint recorded:** 2026-11-24  
> **Repository:** https://github.com/Startat6am/wlgame-test  
> **Default branch:** `main`

## 1. Last known-good source checkpoint

- **Latest `main` commit:** `32b211a156441d19f0377cc9274261460813dc15`
- **Commit:** `Optimize projectile collision distance checks`
- **CI:** GitHub Actions run [#25](https://github.com/Startat6am/wlgame-test/actions/runs/45307202927) completed with **success** for this exact SHA.
- **Checkpoint commit page:** https://github.com/Startat6am/wlgame-test/commit/32b211a156441d19f0377cc9274261460813dc15

This is the latest verified source checkpoint available when this document was written. It is not a claim that the game is feature-complete or that the latest source is deployed to production.

### Changes included in this checkpoint

1. Touch joystick graphics use a dirty flag and are not redrawn on every unchanged frame.
2. Client movement input is sent at 20 Hz to match the current server tick cadence.
3. Server projectile radius checks use squared distance instead of `Math.hypot()`.
4. `docs/PERFORMANCE.md` records the performance audit, implemented changes, measurement strategy, and optimization backlog.
5. `ROADMAP.md` records project phases and acceptance criteria.

## 2. Deployment state — important

- **Production project:** `wlgame-test` (Vercel, Vite, linked to `Startat6am/wlgame-test`).
- **Production deployment observed:** `READY`.
- **Production deployment commit:** `0048fa0b839c8c2a25e0aba8491360d795ad70d1` (`Optimize touch joystick redraw with dirty flag`).
- **Production URL:** https://wlgame-test.vercel.app
- **Observed deployment URL:** https://wlgame-test-5m0tgxhz0-planbnba-2567s-projects.vercel.app
- **Deployment for checkpoint SHA `32b211a`:** no matching production deployment was found at the time of this check.

**Conclusion:** production is serving an older commit than `main`. Do not say that the latest performance changes are live. Before retrying deployment, inspect Vercel deployment history and project limits. Earlier attempts in this project encountered Vercel's daily deployment API limit (HTTP 402); whether that limit still applies must be checked rather than assumed.

Vercel hosts the browser frontend. The Node.js WebSocket game server requires persistent hosting separately; a Vercel frontend deployment does not mean multiplayer server hosting is deployed.

## 3. Read these documents first

- [Project roadmap](ROADMAP.md)
- [Performance strategy](docs/PERFORMANCE.md)
- [Game design and balance data](GAME_DESIGN.md)
- [Ability balance data](src/game/data/ability-balance.json)

If a path has moved, inspect the repository tree instead of assuming it still exists.

## 4. Current architecture and important files

- Phaser 3 browser client: `src/game/`
- Main arena scene: `src/game/scenes/ArenaScene.js`
- Touch joystick: `src/game/input/TouchControls.js`
- Network client: `src/net/NetworkClient.js`
- Node WebSocket server: `server/index.js`
- Combat math and tests: `src/game/combat/combat-math.js` and related tests
- Performance notes: `docs/PERFORMANCE.md`

The server is intended to be authoritative for online movement, projectile hits, damage, and knockback. The current server simulation baseline is 20 Hz.

## 5. Known incomplete work / do not assume it is finished

- Offline Fireball is currently a visual projectile foundation; complete offline collision, damage, knockback, death, and respawn still need implementation and tests.
- A real performance baseline (FPS/frame-time percentiles and memory) has not yet been captured on representative desktop and phone hardware. Performance improvements must not be claimed without before/after measurements.
- Object pools, texture atlases, DPR caps, and spatial partitioning are backlog items; add them only with profiling evidence.
- The client WebSocket URL still needs explicit production configuration.
- Persistent hosting for the WebSocket server, rooms/lobbies, reconnect handling, and load testing remain roadmap work.
- Exact Warlock Arena 0.88/0.88b mechanics and numeric balance values must not be invented. Clearly distinguish verified source data from estimates or other map versions.
- Do not treat the older production deployment as containing commits newer than `0048fa0`.

## 6. Recovery procedure

Run these steps whenever resuming work:

1. Open the repository and check the actual branch head:
   `git status --short --branch`
   `git log -5 --oneline --decorate`
2. Fetch the latest remote state before editing:
   `git fetch origin`
   `git status -sb`
   If local and remote differ, inspect the log and diff; do not force-push or reset blindly.
3. Read this file, `ROADMAP.md`, and the relevant design/performance document.
4. Install dependencies if needed with `npm install`.
5. Run the repository's current validation scripts. At the checkpoint, the known commands are:
   `npm test`
   `npm run build`
   Also run `node --check server/index.js` when server code changes. Confirm script names in `package.json` before relying on them.
6. Check GitHub Actions for the current HEAD SHA.
7. Check Vercel production deployment and compare its deployed commit SHA with `origin/main`.
8. Make a small, focused change; run relevant tests; commit and push it.
9. Update this handoff file after each meaningful milestone: checkpoint SHA, CI result, deployment SHA/status, current blockers, and next action.

### If the chat/browser freezes

- The source of truth is the GitHub repository, not the chat transcript.
- Start a new session with: **“Read HANDOFF.md in Startat6am/wlgame-test and resume from its latest verified checkpoint. First verify the current main SHA, CI, and Vercel production deployment.”**
- Do not recreate work from memory until the repository and current branch have been checked.

## 7. Next actions, in priority order

1. Resolve the Vercel production lag: inspect why the latest `main` SHA has no production deployment, then deploy only after confirming quota/project status.
2. Add a lightweight frame-time monitor (rolling samples, p95/p99, max frame time) and record real desktop/mobile baselines.
3. Validate joystick redraw and 20 Hz input behavior in browser on desktop and mobile.
4. Complete offline Fireball collision/damage/knockback/death/respawn with automated tests.
5. Configure and deploy the authoritative WebSocket server on persistent hosting, then test real multi-client sessions.

---

**Maintenance rule:** this document is a living checkpoint. Update its status fields only from verified repository, CI, and deployment evidence. Never mark a task complete merely because code was drafted or a deployment was requested.
