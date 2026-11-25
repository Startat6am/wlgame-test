# WLGame Handoff — Recovery Checkpoint

> Read this file first after a frozen browser, interrupted chat, context loss, or when starting a new development session. GitHub is the source of truth; verify the live branch, CI, PR, and deployment before editing.

## 1. Repository and current checkpoint

- **Repository:** https://github.com/Startat6am/wlgame-test
- **Active work branch:** `feature/isometric-arena`
- **PR:** https://github.com/Startat6am/wlgame-test/pull/1 (open, draft; do not merge until manual browser QA is complete).
- **Base branch:** `main`, base commit at PR creation: `b30dccee049e99af70a9563deccb2f97676183b3`.
- **Latest functional code checkpoint:** `c1354b8600dd318c4aecc6c4973dbce0fc374545` — shared immutable arena obstacle geometry used by both client and server, with tests.
- **Latest roadmap checkpoint:** `d6d1086c4c1e7afba757a8ee1e1f328578adacc7` — records the shared obstacle layout milestone and current CI snapshot.
- **Current handoff refresh:** documentation-only; verify live branch HEAD after this commit.
- **Checkpoint date:** 2026-11-25.

The source of truth is the current remote branch. Documentation-only commits can advance HEAD without changing the application-code checkpoint.

## 2. Verified CI and deployment

### GitHub Actions

- **Workflow:** WLGame CI
- **Application run:** #53, run ID `45677306557`, SUCCESS on `85cc36387ba7b55b5deb69229b0cf39400aa01b5`.
- **Latest CI run:** #60, run ID `45683538158`, SUCCESS on `c1354b8600dd318c4aecc6c4973dbce0fc374545`.
- Passed steps: dependency install, `npm run build`, `npm test` (combat, isometric geometry, shared arena data, and network URL tests), and `node --check server/index.js`.
- Run URL: https://github.com/Startat6am/wlgame-test/actions/runs/45683538158

### Vercel

- **Current team:** `callback` (slug `callback5`), Hobby.
- **Project:** `wlgame-test`
- **Project ID:** `prj_278OZbqZFGgj3fYYfS8aF3laAbhx`
- **Linked Git repository:** `Startat6am/wlgame-test`
- **Preview branch:** `feature/isometric-arena`
- **Preview commit:** `c1354b8600dd318c4aecc6c4973dbce0fc374545`
- **Preview deployment:** `dpl_9JTHFQKDLv8nfhSFAbHDHFh3s4fh`
- **Preview state:** READY (verified 2026-11-25).
- **Preview URL:** https://wlgame-test-git-feature-isometric-arena-callback5.vercel.app
- **Immutable deployment URL:** https://wlgame-test-md9rufxlz-callback5.vercel.app
- **Inspector:** https://vercel.com/callback5/wlgame-test/9JTHFQKDLv8nfhSFAbHDHFh3s4fh
- Project dashboard: https://vercel.com/callback5/wlgame-test

This confirms a successful Vercel Preview build for the listed commit. It does NOT confirm browser gameplay, mobile behavior, production release, or a running WebSocket backend.

An old Vercel check from the previous team `planbnba-2567's projects` still reports a daily build-rate-limit failure. It is separate from the new team's project: the new project's Vercel check is SUCCESS and its Preview is READY. Do not confuse the old failure with the current Preview.

The new project was created after connecting GitHub Login Connections. The initial main-branch deployment was created during project setup; its final status has not been independently recorded here. Do not claim the production branch is live without checking it.

## 3. Current implementation

- Phaser 3 browser client; Vite build.
- Simulation and WebSocket server retain Cartesian world coordinates.
- `src/game/geometry/isometric.js` owns world/screen projection, inverse transform, vector conversion, and projected facing angle.
- `src/game/geometry/isometric.test.js` tests coordinate round-trips, cardinal movement vectors, and facing angle.
- `ArenaScene.js` draws a diamond arena and diagonal grid; obstacles, local/remote actors, labels, aim markers, and projectiles are projected for display.
- Local and remote actor sprites use bottom-origin positioning and projected depth sorting.
- Pointer targeting compensates for camera scroll.
- FIRE press-drag direction is converted to world direction once; stationary tap uses the hero's world-facing direction.
- Server snapshots include `facingX`/`facingY` for local and remote orientation.
- Touch joystick graphics use a dirty flag; network movement input is throttled to 20 Hz.
- Offline Fireball projectiles now use swept segment/circle checks and disappear on collision with static arena rocks or arena bounds.
- `NetworkClient.js` accepts `VITE_WS_SERVER_URL` (`ws://` or `wss://`) and validates the configured URL; if unset, it falls back to the current hostname on port 2567.
- `.env.example` documents the optional endpoint; README explains setting it in the Vercel project environment. Network URL resolution is covered by Node tests.
- Authoritative server player movement resolves overlap against the same circular arena obstacles; server Fireballs also stop on swept obstacle collision. The obstacle list now lives in immutable `src/game/data/arena.js`, imported by both Phaser and server to prevent map geometry drift.

## 4. Architecture / important files

- Phaser client: `src/game/`
- Arena scene: `src/game/scenes/ArenaScene.js`
- Isometric projection: `src/game/geometry/isometric.js`
- Projection tests: `src/game/geometry/isometric.test.js`
- Touch joystick: `src/game/input/TouchControls.js`
- Network client: `src/net/NetworkClient.js`
- Node WebSocket server: `server/index.js`
- Combat math/tests: `src/game/combat/combat-math.js` and related tests
- Balance data with source-confidence labels: `src/game/data/ability-balance.json`
- Roadmap: `ROADMAP.md`
- Performance notes: `docs/PERFORMANCE.md`

Current package scripts:
- `npm run build` — `vite build`
- `npm test` — Node tests under `src/game/combat/*.test.js`, `src/game/geometry/*.test.js`, `src/game/data/*.test.js`, and `src/net/*.test.js`
- `npm run server` — `node server/index.js`

## 5. Known gaps — do not mark complete

1. **Manual browser QA is still pending:** isometric rendering, camera bounds/scroll, collision alignment, desktop and phone layouts, actor depth, FIRE tap/drag, keyboard aim, touch movement, local and network modes. User reports no major visible complaints so far; this is useful feedback but not a substitute for browser/device verification.
2. **Offline training-target lifecycle is implemented but needs manual playtesting:** local Fireball swept hits apply damage and directional knockback; lethal damage marks the target dead and schedules a 1.8-second respawn. The target is a stationary training dummy (not an AI opponent). Five automated tests cover the pure state lifecycle. Verify visuals, timing, obstacle/boundary interaction, and controls in a browser.
3. **Online obstacle collision needs gameplay verification:** authoritative player movement and Fireballs now use the same circular obstacle geometry as the offline scene; confirm sliding, edge behavior, and projectile impacts in a live multi-client session.
4. **Persistent WebSocket hosting is incomplete:** client endpoint configuration is implemented, but no persistent Node WebSocket host has been provisioned and `VITE_WS_SERVER_URL` is not set in Vercel. Vercel hosts the frontend; it does not host the persistent Node WebSocket server.
5. No repeatable desktop/phone frame-time or memory baseline has been captured. Do not claim performance improvements without same-device before/after measurements.
6. Object pools, texture atlases, DPR caps, and spatial partitioning remain profiling-driven backlog items.
7. Do not invent exact Warlock Arena 0.88/0.88b mechanics or numeric balance values. The balance JSON distinguishes confirmed 0.88 values, references from other versions, and estimates.

## 6. Recovery procedure

1. Check branch and recent commits: `git status --short --branch` and `git log -8 --oneline --decorate`.
2. Fetch remote: `git fetch origin`; inspect `git status -sb`. Never reset/rebase/force-push blindly.
3. Read `HANDOFF.md`, `ROADMAP.md`, `GAME_DESIGN.md`, and `docs/PERFORMANCE.md` as relevant.
4. Confirm the exact branch HEAD and PR #1 head SHA.
5. Run `npm install`, `npm test`, `npm run build`; for server changes also run `node --check server/index.js`. See `.env.example` for the optional client WebSocket URL.
6. Check GitHub Actions for the exact current SHA.
7. Inspect the Vercel Preview and compare its deployed SHA with the branch HEAD. Inspect production separately; do not infer it from Preview.
8. Continue focused work on `feature/isometric-arena`; keep the PR draft until manual checks pass.
9. After each meaningful milestone, update this handoff with verified commit, CI, deployment, blockers, and next action.

### If the chat/browser freezes

Start a new session with:

> Read HANDOFF.md in Startat6am/wlgame-test and resume from the latest verified checkpoint. First verify the current feature/isometric-arena HEAD, PR #1, GitHub Actions status, and Vercel Preview deployment. Do not merge to main. Continue the manual isometric browser QA and fix issues found; then update HANDOFF.md and ROADMAP.md.

Do not reconstruct work from chat history until the repository and branch have been checked.

## 7. Priority next actions

1. Browser QA on the Preview: arena bounds, camera follow/scroll, obstacle footprint vs physics, actor depth, desktop and mobile aspect ratios.
2. Test FIRE: drag aim, stationary tap forward, release outside button, cooldown, obstacle impacts; test keyboard aim and touch joystick in offline and connected modes.
3. Verify authoritative obstacle collision with two clients: player sliding around rocks and Fireballs stopping at rocks.
4. Manually playtest offline training-target hits, HP label, knockback, death, and 1.8-second respawn; adjust prototype feel only after testing.
5. Choose persistent WebSocket hosting, set `VITE_WS_SERVER_URL` in Vercel, and test multi-client sessions.
6. Capture desktop and representative-phone frame-time/memory baselines before further performance tuning.

---

**Maintenance rule:** update this file only with verified repository, CI, and deployment evidence. A requested action, code draft, or deployment in progress is not a completed task.


## Session continuation — 2026-11-25

- Verified remote branch HEAD: `d922b04df6ed19095dbed9f8a228353677d06cd6`.
- Latest GitHub Actions: WLGame CI run #62, ID `45683692800`, SUCCESS on this HEAD. Vercel status check for the deployment is SUCCESS.
- Fresh isolated environment: `npm install` succeeded; `npm test` passed 22/22; `npm run build` succeeded; `node --check server/index.js` succeeded. Build emits a non-fatal chunk-size warning (main JS ~1.5 MB uncompressed, ~347 KB gzip).
- Browser smoke: local Vite page loaded (“WLGame — Warlock Arena”). Attempt to open Preview URL redirected to Vercel login/SSO, blocking gameplay verification on the deployed build. Do not mark manual QA complete.
- Preview deployment associated with this HEAD: `dpl_2RRZfPEWt9YrA5XLPTgeLCvREPXy`, state READY, URL https://wlgame-test-8ew0hdaou-callback5.vercel.app.
- Working copy used for verification was clean except for a locally generated untracked `package-lock.json` (the repository does not currently track a lockfile); no source changes were made.
- Next actions: obtain authenticated Preview access or another accessible test URL; perform manual movement/camera/obstacle/FIRE/desktop-mobile checks; then implement the offline opponent/target lifecycle. Keep PR #1 Draft and do not merge before manual QA.


## Session continuation — 2026-11-26 (offline combat milestone)

- **Branch HEAD:** `9f6d393b9f9edde5a53fa2250b9b926af5734ab6`.
- **New implementation:** `src/game/combat/offline-combat.js` provides a testable training-target state lifecycle: damage, damage points, directional knockback, death, and timed respawn.
- **Scene integration:** `ArenaScene.js` creates and renders the offline training target, updates its knockback/respawn state, and detects swept Fireball-vs-target collisions. Fireballs still terminate on obstacles and arena bounds. The training target is hidden when the WebSocket client reports a live server connection.
- **Tests:** `src/game/combat/offline-combat.test.js` adds five tests for spawn, damage/knockback, lethal damage, dead-state hit rejection, timed respawn, and boundary clamping. Existing test glob `src/game/combat/*.test.js` includes them.
- **CI:** WLGame CI run #65 (ID `45709311195`) SUCCESS on this exact HEAD: https://github.com/Startat6am/wlgame-test/actions/runs/45709311195
- **Vercel Preview:** deployment `dpl_Fp4D524YZHW5RRSz9Ch1PQ8zsAf3`, READY, commit `9f6d393b9f9edde5a53fa2250b9b926af5734ab6`; URL https://wlgame-test-7h39h0m8e-callback5.vercel.app
- **Manual QA remains incomplete:** earlier Preview access redirected to Vercel SSO. The new READY deployment confirms build/deploy only, not gameplay. Re-test through authenticated access or an intentionally public preview.
- **Next:** manual offline combat and isometric control verification; fix any observed issues. Then proceed with persistent WebSocket hosting and two-client gameplay. PR #1 remains Draft; do not merge before browser QA.
