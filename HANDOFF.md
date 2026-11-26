# WLGame Handoff — Recovery Checkpoint

> Read this file first after a frozen browser, interrupted chat, context loss, or when starting a new development session. GitHub is the source of truth; verify the live branch, CI, PR, and deployment before editing.

## 1. Repository and current checkpoint

- **Repository:** https://github.com/Startat6am/wlgame-test
- **Active work branch:** `feature/isometric-arena`
- **PR:** https://github.com/Startat6am/wlgame-test/pull/1 (open, draft; do not merge until manual browser QA is complete).
- **Base branch:** `main`, base commit at PR creation: `b30dccee049e99af70a9563deccb2f97676183b3`.
- **Latest functional code checkpoint:** `68a0d23593e6e568eb04bfc0ba05102516a9b152` — WebSocket protocol validation, slow-client policy, and real-server integration smoke test; includes remote-player interpolation and prior arena/combat milestones.
- **Latest roadmap checkpoint:** `43635f5d12c63d6a1579ba3160ea7918cb1b582e` — records the latest WebSocket integration milestone and verification.
- **Current handoff refresh:** documentation-only; verify live branch HEAD after this commit.
- **Checkpoint date:** 2026-11-26.

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


## Verification follow-up — 2026-11-26

- Latest application code HEAD: `f284a66d446b6fb9026eabdcbe5acf6efe872fe5`.
- The offline target now also resolves its knockback movement against the shared static arena obstacle circles (two deterministic resolution passes); it cannot be pushed through a rock by a Fireball hit.
- Added a sixth offline-combat unit test for target-vs-obstacle collision.
- GitHub Actions WLGame CI run #69 (ID `45709553240`) completed SUCCESS on the exact code HEAD: https://github.com/Startat6am/wlgame-test/actions/runs/45709553240. Build, full test command, and server syntax validation passed.
- Vercel Preview deployment `dpl_FxwnuJ3EdhD3v8khXsFgmvPjiZ5a` is READY for the exact code HEAD; URL https://wlgame-test-ekmrf1e6r-callback5.vercel.app.
- Next commit is documentation-only; re-check branch HEAD, CI, and deployment after the handoff refresh.


## Fireball feel update — 2026-11-26

- **Code changes:** `src/game/combat/offline-combat.js` base knockback reduced from 260 to 130; `server/index.js` authoritative Fireball base knockback likewise reduced from 260 to 130.
- **Aim feedback:** `ArenaScene.js` now draws a translucent 100-screen-pixel projected direction guide from the hero while the FIRE button is held. It follows the drag direction, defaults to current facing while stationary, and clears on release. Guide length is measured in projected screen pixels (not world units).
- **Test:** updated offline combat assertion to confirm the lower impulse. Full CI and latest Preview must be checked against the exact branch HEAD before describing this update as verified.
- **Manual QA:** user confirmed offline hit registration, HP, knockback, and death work before this adjustment. New knockback scale and aim-guide visibility/angle still need manual confirmation on desktop and mobile.
- **Next:** verify latest CI/Preview, then ask user to confirm reduced push and the 100px guide; proceed to online host after input UX is accepted.


## FIRE aim-stick release correction — 2026-11-26

- Refactored the FIRE joystick aim update into one shared handler used by pointer movement and pointer release.
- The translucent 100px guide and the joystick icon now derive from the same current pointer offset and screen-to-world direction.
- On release, the pointer coordinates are sampled again before casting, so the Fireball uses the final release direction even when the browser does not deliver a final pointermove event.
- Commit: `0b9008132205b6d8330d63e48a6ead6f3a990f60`.
- Manual desktop/mobile verification remains outstanding; confirm guide alignment and actual projectile trajectory on release.


## Client-side FIRE aim refresh — 2026-11-26

- FIRE aim direction now updates on every client render frame while the skill pointer is held, by polling the active Phaser pointer; pointer-move events remain an immediate update path.
- Removed the 10px aim dead zone: any non-zero pointer offset updates the world-space aim vector; exact center falls back to facing direction.
- Aim direction is never clamped or redirected by arena bounds or obstacles. Projectile collision remains authoritative and stops the projectile at blocked geometry.
- The guide is client-rendered and does not wait for server snapshots or the 20Hz network simulation.
- Commit: `6d6d871588b07f150c80ba052b7fd0ec508623d1`.
- Manual touch/mouse verification remains outstanding.


## FIRE input freeze investigation — 2026-11-26

- User reported that pressing FIRE freezes the game.
- Updated `ArenaScene.js` to cache the last FIRE pointer coordinates and skip aim recalculation/graphics clearing/redrawing when the pointer has not moved. Pointer movement still updates immediately, and release forces a final coordinate sample before casting.
- Code commit: `582d3223be96f4df0ee7a43438a9d112b73a9bb1`.
- This is a targeted performance hypothesis, not a confirmed root-cause diagnosis. Browser/device reproduction and verification remain required; do not claim the freeze is fixed until manually tested.
- Next: verify CI and Preview for this code commit, then reproduce FIRE press/hold/drag/release in desktop and mobile browsers. If the freeze persists, capture browser console/performance traces and inspect Phaser pointer lifecycle and scene update cost.

- Follow-up after user reported the first optimization still froze the browser: removed the per-render-frame Phaser pointer-array polling entirely. Aim now updates from local `pointermove` events and samples final coordinates on `pointerup`; no per-frame aim work occurs. Commit: `deb3dac125da76a29b3c52a5c7d222521e4c9535`. Still requires manual reproduction/verification.

- FIRE guide anchoring fix: while FIRE is held, the guide is redrawn only when the hero's world position changes, preserving the current aim vector. This keeps the 100px guide attached to the moving hero when strafing around an obstacle without reintroducing per-frame pointer polling. Commit `20115b9170ff6db7c4dde5deef14f8ea501374f4`; manual QA pending.


## Frame-time diagnostics milestone — 2026-11-26

- Added `src/game/performance/frame-time.js`: fixed-capacity 120-sample Float64 ring buffer with p50/p95/p99/max statistics.
- Integrated into `ArenaScene.update`: record the Phaser frame delta; refresh the HUD twice per second with FPS and p95/p99 milliseconds. Sorting occurs only on HUD refresh, not every frame.
- Added `src/game/performance/frame-time.test.js` (four tests) and included the performance test glob in `npm test`.
- Application code commit: `34adef0b369407f1531518692bb22bb562d7aa17`; metrics module `33ddb6e6989033fb37c5892db66c94b5f3fd9ce3`; test `ec7d226a62a8a457b91f3f700e5f1f736a78fdae`; package script `d511d03aae4ed6a23301e71a4b2efe44505d4c18`.
- Documentation update: pending verification after this commit.
- Manual performance baselines are still not captured; do not claim the game is faster. The HUD is intended to expose frame-time spikes while reproducing issues.


### Verification — frame-time diagnostics

- Current branch/PR head at verification: `d778c52d6a17ae69f73a610f451975b88fc44446`; PR #1 remains open and Draft.
- GitHub Actions WLGame CI run #89 (ID `45762329119`) completed SUCCESS on this exact HEAD. The job passed `npm install`, `npm run build`, `npm test`, and `node --check server/index.js`.
- Vercel Preview deployment `dpl_6ny2i5AbnHx2EXbvurykKkdso9hq` is READY for the exact HEAD. Preview alias: https://wlgame-test-git-feature-isometric-arena-callback5.vercel.app. This is build/deploy verification only; no manual gameplay or performance baseline is claimed.


## Arena collision regression coverage — 2026-11-26

- Added `resolveCircleAgainstArena` to `src/game/combat/combat-math.js`; it clamps a moving circle to world bounds, resolves obstacle circles, and handles projection oscillation in tight corners with a deterministic perimeter candidate search.
- Reused the resolver for offline training-target knockback and authoritative server player movement. The server reuses the shared immutable obstacle objects; no per-tick obstacle conversion is performed. Fireball swept collision behavior is unchanged.
- Added four regression tests: arena boundary clamp, tangential movement along an obstacle edge, resolution of a corner formed by overlapping obstacles, and invalid world dimensions.
- Local verification in a clean ephemeral Node box: `npm test` passed 36/36, `npm run build` succeeded, and `node --check server/index.js` succeeded. Known Vite large-chunk warning remains (~1.51 MB minified / 349 KB gzip).
- Commit/CI/Preview verification pending. Manual browser and two-client collision checks remain required; PR #1 remains Draft.


## WebSocket load protection — 2026-11-26

- `server/index.js` now configures `ws` with `maxPayload: 1024`, rate-limits each player's input stream to 30 messages/sec and Fireball casts to 3/sec, and skips snapshot sends when a client's `bufferedAmount` exceeds 64 KiB.
- Fixed-window limiter is isolated in `src/net/rate-limit.js` with deterministic unit tests. Fireball's 1.4-second server cooldown remains the gameplay authority.
- This prevents oversized frames and excessive inbound processing. Snapshot delivery skips clients above 64 KiB buffered and closes a client with code 1013 after its queue stays above 256 KiB for 40 consecutive 20 Hz ticks (2 seconds); the counter resets when the queue drains. Live WebSocket integration and load testing remain open.
- Verification and deployment for this change pending.


## Remote-player interpolation — 2026-11-26

- Added src/net/remote-interpolation.js: bounded (8-sample) per-player receive-time buffer and linear interpolation of world position/facing.
- ArenaScene.applySnapshot records remote-player samples; ArenaScene.update renders them 100 ms behind the latest local receive time. This smooths the remote presentation between 20 Hz snapshots without predicting or changing server-authoritative movement/collision.
- Remote-player health still updates immediately from snapshots. Actors are removed when absent from a snapshot as before.
- Added five tests in src/net/remote-interpolation.test.js.
- Local verification in the isolated Node workspace: npm test passed 45/45, npm run build succeeded, node --check server/index.js succeeded, and git diff --check succeeded. Vite reports the known non-fatal large-chunk warning (~1.51 MB minified / 350 KB gzip).
- GitHub Actions WLGame CI run #100 (ID 45765989025) passed on code HEAD 71d023624ad4f6ac1c3c29b79c10695b4b02d8d8. Vercel Preview deployment dpl_2s45a3WV3zCu4hHUVnxq4HyJFr3u is READY for that exact SHA at https://wlgame-test-5vzfmje1n-callback5.vercel.app. No browser or two-client gameplay QA has been performed. The 100 ms buffer is an initial tuning value; verify perceived latency/jitter with two clients before treating it as final.
- Previous verified Preview checkpoint b9ca7f2c27b8c3c32e4b7cec30eb72779aa38c8e is READY at https://wlgame-test-32be2e91h-callback5.vercel.app; branch alias https://wlgame-test-git-feature-isometric-arena-callback5.vercel.app.


## WebSocket protocol and slow-client policy — 2026-11-26

- Extracted parsing/validation and existing per-player rate limits into src/net/websocket-protocol.js. Server message handling now consumes normalized input/cast commands from this module.
- Added deterministic tests for malformed JSON, oversized/unknown/non-finite messages, 30 input/sec, 3 cast/sec, 64 KiB snapshot skip threshold, and 256 KiB sustained-backlog disconnect threshold.
- Slow clients are disconnected with WebSocket close code 1013 only after >256 KiB remains queued for 40 consecutive server ticks (2 seconds). The streak resets when bufferedAmount drops back to 256 KiB or below. Snapshots are skipped above 64 KiB.
- Local verification in the isolated Node workspace: npm test passed 52/52, npm run build succeeded, node --check server/index.js succeeded, and git diff --check succeeded. This is unit-level verification; live WebSocket integration and network load tests remain outstanding.
- GitHub Actions WLGame CI run #102 (ID 45766258303) passed on server code commit cad2fd6522523c6a219951a8f97a70a4a1b4eb81; CI run #104 (ID 45766338860) passed on documentation HEAD 53298e309f33ec8ac3ae724b4b3122eb45c2811c. Vercel Preview deployment dpl_F7NdfP753Hdb5CYpBLGNnNYVftn1 is READY for that exact HEAD at https://wlgame-test-bxe6prwrl-callback5.vercel.app. PR #1 remains Draft; do not merge before manual browser/two-client QA.


## WebSocket integration smoke — 2026-11-26

- Added server/server.integration.test.js and extended npm test to include server/*.test.js.
- The integration test launches server/index.js as a child process on PORT=0, reads the assigned port from the listening log, connects with the ws client, verifies welcome/snapshot, confirms malformed JSON is ignored, sends 31 movement messages and checks the 31st reverse input is rate-limited, then sends a 1025-byte frame and verifies close code 1009 while the server process remains alive.
- Local verification: npm test passed 53/53, npm run build succeeded, node --check server/index.js succeeded, and git diff --check succeeded. Known non-fatal Vite chunk warning remains (~1.51 MB minified / 350 KB gzip).
- GitHub Actions WLGame CI run #107 (ID 45766726278) passed on integration-test commit 68a0d23593e6e568eb04bfc0ba05102516a9b152. Vercel Preview deployment dpl_9Z5B7kTVNZM3Pq4r1HVXoy9quBTp is READY for that exact code SHA at https://wlgame-test-25as0es1h-callback5.vercel.app. This is a one-client smoke test, not a multi-client load test or slow-socket saturation test. PR #1 remains Draft.


## Vercel WebSocket migration — 2026-11-26

- User approved proceeding with a Vercel-only WebSocket architecture. Do not provision a separate persistent Node host at this stage.
- Verified project: Vercel project `wlgame-test`, team Hobby. A connected Upstash Redis database was not found in the authorized account scope.
- Official Vercel WebSocket support is GA (2026-10-20). Connections are pinned to one Function instance and obey Function maximum duration; Hobby currently has a 300-second maximum with Fluid Compute. Different connections may be assigned to different instances.
- Extracted the authoritative simulation into `server/game-simulation.js` (`GameSimulation`, `GAME_CONFIG`). The local `server/index.js` is now a thin `ws` transport adapter that keeps the existing 20 Hz authoritative movement, projectile collision, hit, knockback, respawn, snapshot and slow-client handling.
- Added `server/game-simulation.test.js` for fixed-tick movement, snapshot serialization, Fireball cooldown, and player/projectile cleanup.
- Added `src/net/reconnect.js` and tests. `NetworkClient` now reconnects after disconnects using bounded exponential backoff with jitter, avoids duplicate sockets, and stops retrying on explicit disconnect. This supports Vercel's duration-bounded socket lifecycle.
- Updated `src/net/websocket-url.js`: HTTPS pages resolve to same-origin `wss://<host>/api/ws`; HTTP development still uses `ws://<hostname>:2567`. Explicit `VITE_WS_SERVER_URL` still overrides the default.
- Updated README and ROADMAP to document the Vercel migration and the current non-production state.
- Local verification on the exact source state before the documentation commits: `npm test` passed **57/57**; `npm run build`, `node --check server/index.js`, and `git diff --check` passed. The existing Vite large-chunk warning remains (~1.51 MB minified / 350 KB gzip).
- No Vercel `/api/ws` endpoint has been deployed yet. Do not treat the URL routing change as proof that the endpoint exists or that cross-instance multiplayer works.
- Redis design constraint: Upstash REST supports Pub/Sub through an SSE `/subscribe` endpoint and HTTP `/publish`; REST blocking `XREAD` is not supported. The next adapter must implement a single fenced writer/lease per room, recoverable state, and per-instance local socket fan-out. Do not use independent in-memory simulations per Function.
- No Redis database was created because account provisioning can create billable usage depending on account/payment settings. Ask for approval before creating a database or configuring a paid plan; prefer an explicitly free tier if available.
- Manual browser/device QA and deployed two-client tests remain outstanding. PR #1 remains Draft; do not merge before manual QA.
- Current source changes include simulation extraction, reconnect logic, production URL routing, and new tests. Verify the current branch HEAD, CI and Vercel deployment after the documentation commits before reporting deployment status.


## Vercel WebSocket Function + Redis room coordinator — 2026-11-26

- User approved the Vercel-only deployment direction. Keep PR #1 Draft and do not merge before real two-client/manual QA.
- Added `api/ws.js`: exports a Node HTTP server with `WebSocketServer({ server, maxPayload: 1024 })`, as required by Vercel's native WebSocket Function integration. The function rejects ordinary HTTP with 426. It requires server-only `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; until configured, the endpoint closes WebSocket attempts as not configured.
- Added `vercel.json` setting `api/ws.js` maxDuration to 300 seconds. Vercel Hobby connections are duration-bounded; `NetworkClient` reconnects with capped exponential backoff and jitter. HTTPS clients do not attempt network mode until `VITE_WS_SERVER_URL` is configured; set it to `/api/ws` for same-origin Preview/Production routing. Local HTTP still falls back to port 2567.
- Extracted authoritative simulation to `server/game-simulation.js`; state can be serialized/restored for leader failover. `server/index.js` remains the local Node transport adapter.
- Added `server/upstash-redis-rest.js`: authenticated Redis REST commands, HTTP publish, SSE subscribe parsing. Unit tests cover JSON payloads and LF/CRLF event framing.
- Added `server/redis-room-coordinator.js`: atomic Lua lease acquisition with monotonic fencing epochs; compare-token renew/release; durable ordered join/input/leave events in Redis Streams; XREAD polling; atomic tick commit that verifies the leader token, persists simulation state, publishes the snapshot to Pub/Sub, and trims acknowledged stream entries.
- Added `server/vercel-room-runtime.js`: each Function instance maintains only its local sockets and an SSE snapshot subscription. A single leased leader reads the durable input stream and advances the 20 Hz authoritative simulation. Other instances forward published snapshots/combat events to their local sockets. On leader change, state and stream cursor are restored from Redis. The lease token is checked atomically during each state+snapshot commit to fence stale leaders.
- Important: the coordinator is a designed/implemented prototype, not yet validated against a real Upstash database. Lua behavior, XREAD/XADD/XTRIM response shapes, and long-lived SSE behavior still require a live integration test. Do not call the migration production-ready until this passes.
- Added tests for lease fencing, stream order/cursor validation, state recovery, failover, socket attachment, and cross-instance snapshot fan-out.
- Local verification on exact source state before the latest docs commits: `npm test` passed **76/76**; `npm run build`, `node --check server/index.js`, `node --check api/ws.js`, `node --check server/vercel-room-runtime.js`, and `git diff --check` passed. Vite emits the existing non-fatal large-chunk warning (~1.51 MB minified / 350 KB gzip).
- No Upstash Redis database is connected in the authorized account scope. Provisioning a new database can create billable usage depending on account/payment settings; obtain user approval before creating it or selecting a paid plan. No credentials have been added to the repo or Vercel.
- Exact next steps: (1) obtain approval to create an explicitly free Upstash Redis database in `eu-west-1` (closest available region to Vercel's current `iad1` is not necessarily optimal; check actual region selection and Vercel Function region before choosing); (2) configure the two Redis secrets in Vercel and set `VITE_WS_SERVER_URL=/api/ws`; (3) verify a live two-client session with clients on separate Function instances, failover, reconnect at 300 seconds, and snapshot backpressure; (4) update this handoff and roadmap with actual CI/Preview/live-service evidence.
- Manual browser/device QA remains outstanding. The Vercel project has SSO protection on Preview deployments, so use authenticated Preview access or a controlled custom-domain test. PR #1 remains Draft.
