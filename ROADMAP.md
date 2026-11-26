# WLGame Roadmap

This roadmap prioritizes a stable playable core first, then expands gameplay and online features. Unknown original-map details are deliberately deferred; implementation must not invent missing Warlock 0.88/0.88b rules.

## Project principles

- Faithful to Warlock Arena 0.88/0.88b where source evidence exists.
- Clearly label estimates and mechanics from other versions.
- Keep client presentation separate from authoritative online simulation.
- Desktop and mobile are first-class targets.
- Performance work is measured, not assumed.
- Missing reference details are tracked for later research rather than blocking engineering foundations.

## Current baseline

- [x] Phaser 3 browser client and responsive shell.
- [x] Arena scene, player movement, camera follow, obstacles, HUD.
- [x] Keyboard and touch input foundation.
- [x] Fireball aiming and cooldown foundation.
- [x] Offline visual Fireball fallback.
- [x] FPS display.
- [x] Initial combat math module and tests.
- [x] Initial WebSocket server and client.
- [x] Initial authoritative movement/projectile/hit processing.
- [x] CI workflow for build, tests, and server syntax validation.
- [x] Performance: redraw touch joystick only when dirty.
- [x] Performance: throttle movement input to 20 Hz to match current server tick.
- [x] Initial 2D isometric projection layer on `feature/isometric-arena`.
- [x] Preview deployment for the isometric branch on the new Vercel team.

**Verification snapshot (2026-11-25):** GitHub Actions run #60 (run ID `45683538158`) passed on `c1354b8600dd318c4aecc6c4973dbce0fc374545`: Vite build, all Node tests (combat, isometric geometry, shared arena data, and WebSocket URL resolution), and server syntax validation. Vercel Preview deployment `dpl_9JTHFQKDLv8nfhSFAbHDHFh3s4fh` for the same branch/commit reported READY. This verifies build/deployment only; manual browser gameplay checks have not yet been completed. The old team's Vercel build-rate-limit failure is separate from the new team's successful project deployment.

## Roadmap

### P0 — Performance foundation and playable combat
- [ ] Establish repeatable desktop/mobile performance baselines.
- [x] Add a 120-sample rolling frame-time history and HUD p95/p99 reporting; same-device baseline capture remains open.
- [ ] Verify the joystick dirty-render and 20 Hz input changes in browser.
- [x] Add swept segment/circle collision tests; stop offline Fireballs at static arena obstacles.
- [x] Apply matching circular obstacle resolution to authoritative server player movement and swept obstacle collision to server Fireballs.
- [x] Move arena obstacle definitions into one immutable shared data module consumed by both Phaser and the authoritative server; test its shape to prevent client/server map drift.
- [x] Implement an offline training target with swept Fireball hits, health/damage, directional knockback, death, and timed respawn; pure combat lifecycle covered by automated tests. Manual gameplay tuning/verification remains pending.
- [x] Halve Fireball knockback in both offline and authoritative server combat (260 → 130 base impulse).
- [x] Show a translucent 100-screen-pixel direction guide from the player while the FIRE button is held; update it from the same aim-stick vector and sample the exact final pointer position on release before casting.
- [x] Add collision regression tests for arena boundaries, tangential obstacle-edge movement, overlapping-obstacle corners, and invalid arena dimensions; share the same arena movement resolver between offline target motion and authoritative server player movement.
- [ ] Manually verify collision behavior in desktop/mobile browsers and a two-client network session.
- [ ] Verify mobile portrait and landscape behavior.
- [ ] Fix any measured performance regressions before expanding content.

### P1 — Core arena and simulation
- [ ] Complete arena boundaries and obstacle collision rules in both offline and authoritative online simulation (circular player/obstacle resolution and swept projectile/obstacle collision are implemented in the server; browser gameplay verification remains pending).
- [ ] Implement lava zones and damage/death flow.
- [ ] Separate simulation from presentation where required.
- [ ] Add projectile/effect pooling if profiling demonstrates allocation pressure.
- [x] Interpolate remote-player positions and facing between timestamped 20 Hz snapshots using a 100 ms client render buffer; server simulation remains authoritative.
- [ ] Add long-session memory and lifecycle tests.

### P2 — Ability framework
- [ ] Implement data-driven ability definitions and common lifecycle.
- [ ] Standardize cooldown, cost, targeting, projectile, area, status, and effect interfaces.
- [ ] Implement confirmed 0.88/0.88b ability behavior.
- [ ] Implement the remaining ability set and combinations only as source evidence becomes available.
- [ ] Add balance tests and source-confidence metadata for every parameter.

### P3 — Online multiplayer
- [ ] Complete Vercel Functions WebSocket migration with Redis-backed cross-instance room coordination; no separate always-on Node host is planned unless measurements show Vercel is unsuitable.
- [x] Support an explicit client WebSocket endpoint through `VITE_WS_SERVER_URL` with a same-host development fallback.
- [ ] Add rooms, lobby, ready state, match lifecycle, and disconnect handling.
- [x] Add a 1 KB WebSocket payload cap, per-player input/cast rate limits, and snapshot backpressure protection (skip stale snapshots above 64 KB queued).
- [x] Extract WebSocket protocol parsing and rate limits into pure unit-testable functions; test malformed/oversized/invalid payloads, input/cast floods, and slow-client backpressure policy. Disconnect after >256 KiB queued for 40 consecutive ticks (2 seconds).
- [x] Add a live WebSocket integration test for malformed JSON, movement flood limiting, and oversized-frame rejection.
- [x] Extract the authoritative 20 Hz simulation into `server/game-simulation.js`, shared by transport adapters; retain the standalone Node server for local development.
- [x] Add bounded exponential reconnect with jitter for WebSocket disconnects and duration-limit closures; route production HTTPS clients toward the same-origin `/api/ws` endpoint.
- [x] Implement the Vercel `/api/ws` adapter, Redis Pub/Sub SSE fan-out, single-writer room lease, durable input stream, and state recovery code with mocked integration/unit coverage.
- [ ] Provision/configure Redis secrets and validate the actual Redis REST/Lua/Streams/SSE behavior against a real database.
- [ ] Add multi-client concurrency/load tests and exercise slow-client disconnection under real socket backpressure.
- [ ] Load-test multiple concurrent matches.
- [ ] Measure latency, jitter, snapshot bandwidth, and server event-loop lag.

### P4 — Bots and game modes
- [ ] Add bot movement, targeting, threat evaluation, and ability selection.
- [ ] Add difficulty profiles.
- [ ] Research the exact four original modes before implementing their rules.
- [ ] Add match settings and victory/defeat flow.

### P5 — Accounts and persistence
- [ ] Select and provision PostgreSQL hosting.
- [ ] Add authentication and secure session handling.
- [ ] Add player profiles and preferences.
- [ ] Persist match history and statistics.
- [ ] Add ratings and leaderboards after match outcomes are stable.

### P6 — UX, accessibility, and content polish
- [ ] Complete menus, lobby, settings, results, and tutorial/help.
- [ ] Add sound and visual feedback.
- [ ] Add configurable controls and accessibility options.
- [ ] Optimize assets, atlases, and mobile resolution scaling based on device tests.

### P7 — Release readiness
- [ ] Full desktop/mobile regression matrix.
- [ ] Security and abuse review for multiplayer.
- [ ] Performance acceptance tests under representative load.
- [ ] Monitoring, logging, backups, and deployment rollback.
- [ ] Public beta, issue triage, and stable release.

### P6a — Isometric arena conversion
- [x] Add a 2D isometric projection layer while preserving server simulation coordinates.
- [x] Render diamond arena, diagonal tile grid, and projected obstacles.
- [x] Project local/remote players and projectiles; convert movement and targeting directions.
- [x] Add projection round-trip and direction tests.
- [x] Pass CI build, tests, and server syntax check on the current application checkpoint.
- [x] Publish the isometric branch to a READY Vercel Preview deployment.
- [ ] Verify collision alignment, camera bounds, and desktop/mobile layouts in a browser.
- [ ] Verify FIRE tap/drag and keyboard/touch movement in local and network modes.
- [ ] Complete visual regression review and merge only after manual checks pass.

## Handoff and session recovery

- `HANDOFF.md` is the canonical recovery checkpoint for interrupted chats, browser freezes, and context loss. It records the active branch/PR, verified commit, CI and Vercel deployment evidence, architecture, known gaps, and exact next actions.
- `ROADMAP.md` tracks project scope and milestones; it links to the handoff rather than duplicating volatile deployment details.
- After every meaningful implementation or deployment milestone, update `HANDOFF.md` with verified facts and update this roadmap if priorities or completion status changed.
- On resumption, verify GitHub branch HEAD, PR, CI, and Vercel Preview before editing. Never infer a successful build, deployment, manual QA, or merge from an older checkpoint.
- Recovery entry point: [HANDOFF.md](./HANDOFF.md).

## Definition of done for each phase

A phase is complete only when:
1. Code is committed.
2. Automated tests pass.
3. Manual checks cover affected desktop and mobile flows.
4. Performance changes include before/after measurements where relevant.
5. Documentation reflects the actual implementation.
6. No unverified deployment is described as released.

## Current next actions

1. User reports no major visible issues so far; retain this as feedback, not as a substitute for device/browser QA. Perform targeted Preview checks for arena bounds, camera, obstacle alignment, actor depth, desktop/phone layouts, FIRE and touch input before merging P6a.
2. Manually verify obstacle collision in offline and online play, including sliding along rock edges and Fireball impacts.
3. Manually playtest the new offline training target: verify hit registration, HP display, knockback against arena boundaries/obstacles, lethal hit, and 1.8-second respawn. Current target is explicitly a prototype training dummy, not an AI opponent.
4. Provision/configure Upstash Redis (with explicit approval), add its server-only secrets to Vercel, set `VITE_WS_SERVER_URL=/api/ws`, then verify two clients routed to separate Function instances.


## Verification update — 2026-11-25 (session continuation)

- Current branch HEAD at inspection: `d922b04df6ed19095dbed9f8a228353677d06cd6`.
- GitHub Actions WLGame CI run #62 (run ID `45683692800`) completed SUCCESS for this HEAD; Vercel status check also SUCCESS.
- Independent clean-environment verification on this branch: `npm install`, `npm test` (22/22 passing), `npm run build`, and `node --check server/index.js` all exited successfully. Vite reports a non-fatal large-chunk warning: main JS output is about 1.5 MB uncompressed / 347 KB gzip.
- Browser smoke check: local Vite page loaded with title “WLGame — Warlock Arena”. The deployed Preview redirected to Vercel login/SSO in the test browser, so gameplay interaction on the deployed Preview was not verified. No manual gameplay QA is claimed.
- Next: arrange authenticated Preview access or use an accessible test deployment, then exercise movement, camera, collision, FIRE, and responsive layouts. Track JS bundle splitting as a separate measured optimization task.


## Offline combat milestone — 2026-11-26

- [x] Add a standalone offline training-target state module with damage, damage-point accumulation, directional knockback, death state, and timed respawn.
- [x] Connect local Fireball swept collision to the target; projectiles still stop at static obstacles and arena bounds.
- [x] Render target health/respawn state in the isometric scene; hide the training target when the WebSocket client connects.
- [x] Add five unit tests covering spawn, damage/knockback, lethal damage, dead-state hit rejection, respawn, and world-bound clamping.
- [ ] Manually verify gameplay feel and interaction in an accessible browser; Vercel Preview may be protected by SSO.
- Verification: CI run #69, commit `f284a66d446b6fb9026eabdcbe5acf6efe872fe5`, SUCCESS. Vercel Preview deployment `dpl_FxwnuJ3EdhD3v8khXsFgmvPjiZ5a`, READY.


## Fireball feel update — 2026-11-26

- [x] Halve base Fireball knockback consistently in offline and server simulation: 260 → 130.
- [x] Add a translucent 100px projected-screen aim guide from the hero while FIRE is pressed; guide follows drag direction and clears when the press is released.
- [ ] Manually confirm guide visibility/angle on desktop and mobile, plus equal knockback in offline and network matches.
- Verification pending for latest code commit; see HANDOFF.md for the latest CI/Preview checkpoint.


## FIRE aim-stick release correction — 2026-11-26

- [x] Share one aim-vector update path between FIRE joystick movement and release.
- [x] Re-sample pointer coordinates on release so projectile direction matches the final joystick direction, including a final movement without a preceding pointermove event.
- [ ] Manually verify guide-to-projectile alignment on desktop and mobile.
- Implementation commit: `0b9008132205b6d8330d63e48a6ead6f3a990f60`.


## Client-side FIRE aim refresh — 2026-11-26

- [x] Refresh FIRE aim and its guide on each client render frame while the pointer is held.
- [x] Remove the aim dead zone so every non-zero stick displacement changes direction.
- [x] Keep aim independent of obstacles and walkable areas; server-side projectile collision remains authoritative.
- [ ] Manually verify continuous pointer tracking and release direction on touch and mouse.
- Implementation commit: `6d6d871588b07f150c80ba052b7fd0ec508623d1`.


## FIRE input freeze investigation — 2026-11-26

- [x] Avoid recalculating the FIRE aim and redrawing its guide on render frames where pointer coordinates are unchanged.
- [ ] Reproduce and verify FIRE press/hold/drag/release on desktop and mobile; root cause is not yet confirmed.
- Code commit: `582d3223be96f4df0ee7a43438a9d112b73a9bb1`.

- Follow-up: removed per-frame FIRE pointer polling after browser-freeze report; event-driven client aim and release resampling remain. Commit `deb3dac125da76a29b3c52a5c7d222521e4c9535`. Manual QA still pending.

- Fixed FIRE guide anchoring during movement: retain the aim direction, but update the guide origin when the hero moves. Redraw is position-change-driven, not pointer polling. Commit `20115b9170ff6db7c4dde5deef14f8ea501374f4`; verify manually.


## Frame-time diagnostics — 2026-11-26

- [x] Add a fixed-capacity 120-sample ring buffer for frame deltas.
- [x] Show FPS plus rolling p95/p99 frame time in the HUD, refreshed twice per second; percentile sorting is kept out of the per-frame path.
- [x] Add automated tests for percentile values, ring-buffer wraparound, empty history, and invalid inputs.
- [ ] Capture repeatable desktop and representative-phone baselines under idle, movement, and FIRE hold/drag scenarios.
- This instrumentation provides evidence for future diagnosis; it is not itself a measured performance improvement.


## Arena collision regression coverage — 2026-11-26

- Added `resolveCircleAgainstArena` as a shared pure resolver for world-bound clamping and circular obstacle collision. It is used by offline training-target knockback and authoritative server player movement.
- Added a deterministic perimeter escape search for the case where sequential circle projections oscillate between overlapping obstacle circles in a narrow corner.
- Added tests for world boundaries, unobstructed tangential movement, a corner between overlapping rocks, and invalid world dimensions.
- Local verification: `npm test` passed 36/36; `npm run build` succeeded; `node --check server/index.js` succeeded. Vite still reports the known non-fatal large JavaScript chunk warning (~1.51 MB minified / 349 KB gzip).
- Automated tests do not replace live browser/two-client gameplay QA.


## WebSocket load protection — 2026-11-26

- Limited inbound WebSocket payloads to 1 KB at the protocol layer.
- Added per-player fixed-window limits: 30 movement input messages/sec and 3 cast messages/sec (Fireball cooldown remains authoritative).
- Snapshot broadcasts now skip clients with more than 64 KB queued, avoiding unbounded stale-snapshot backlog.
- Added deterministic unit tests for limiter thresholds, exact window reset, clock rollback, and invalid configuration.
- Integration tests and an explicit slow-client disconnect policy remain open.


## Remote-player interpolation — 2026-11-26

- Added src/net/remote-interpolation.js, a bounded timestamped sample buffer with linear interpolation for position and facing.
- ArenaScene now queues each remote-player snapshot and renders remote actors 100 ms behind the latest client receive time, smoothing motion between 20 Hz snapshots. Health updates remain immediate; local player/server simulation and collision authority are unchanged.
- Added five deterministic tests for interpolation, buffer edges, duplicate/out-of-order timestamps, capacity, and malformed samples.
- Local verification in the isolated Node workspace: npm test passed 45/45 and npm run build succeeded. GitHub Actions WLGame CI run #100 (ID 45765989025) passed on code HEAD 71d023624ad4f6ac1c3c29b79c10695b4b02d8d8; Vercel Preview deployment dpl_2s45a3WV3zCu4hHUVnxq4HyJFr3u is READY for that exact SHA. Vite's existing large-chunk warning remains (~1.51 MB minified / 350 KB gzip).
- Manual two-client latency/jitter tuning remains open; 100 ms is an initial render buffer, not a measured optimum.


## WebSocket protocol and slow-client protection — 2026-11-26

- Extracted client message parsing/validation and per-player input/cast rate limits into src/net/websocket-protocol.js.
- Malformed JSON, oversized payloads, unknown messages, non-finite values, and messages above configured per-player rates are ignored.
- Snapshot delivery skips clients above 64 KiB buffered. A client above 256 KiB for 40 consecutive 20 Hz ticks (2 seconds) is closed with WebSocket code 1013; the streak resets as soon as the queue drains below the critical threshold.
- Added seven deterministic unit tests covering protocol validation, flood limits, skip threshold, disconnect threshold, recovery, and invalid backpressure values.
- Added a child-process WebSocket integration test that starts the real server on an ephemeral port, confirms malformed JSON is ignored, verifies the 31st input in a one-second window is dropped, and confirms oversized frames close with code 1009 while the server stays alive. Multi-client concurrency/load tests and real slow-socket backpressure simulation remain open.
- Local verification: npm test passed 52/52, npm run build succeeded, node --check server/index.js succeeded, and git diff --check succeeded. GitHub Actions WLGame CI run #102 (ID 45766258303) passed on server code commit cad2fd6522523c6a219951a8f97a70a4a1b4eb81; CI run #104 (ID 45766338860) passed on documentation HEAD 53298e309f33ec8ac3ae724b4b3122eb45c2811c. Vercel Preview deployment dpl_F7NdfP753Hdb5CYpBLGNnNYVftn1 is READY for that exact HEAD. Vite's known large-chunk warning remains.


## WebSocket integration smoke — 2026-11-26

- Added server/server.integration.test.js; it launches the actual Node WebSocket server on an ephemeral port and exercises welcome/snapshot delivery, malformed JSON handling, the 30 input/sec rate limit, and the 1 KiB max-payload close behavior.
- Updated the listening log to report the assigned ephemeral port and included server/*.test.js in npm test.
- Local verification: npm test passed 53/53, npm run build succeeded, node --check server/index.js succeeded, and git diff --check succeeded. GitHub Actions WLGame CI run #107 (ID 45766726278) passed on integration-test commit 68a0d23593e6e568eb04bfc0ba05102516a9b152. Vercel Preview deployment dpl_9Z5B7kTVNZM3Pq4r1HVXoy9quBTp is READY for that exact code SHA at https://wlgame-test-25as0es1h-callback5.vercel.app. The Vite large-chunk warning remains non-fatal.
- This is a single-client protocol smoke test. Multi-client concurrency/load tests and slow-client queue saturation still require dedicated test harnesses.


## Vercel WebSocket migration — 2026-11-26

- Decision: use Vercel Functions for the WebSocket endpoint; do not provision Railway/Fly or another persistent host at this stage. Vercel WebSocket support reached GA on 2026-10-20.
- Constraints: each connection is pinned to one Function instance and ends at that Function's maximum duration (Hobby: 300 seconds with Fluid Compute). New connections can land on a different instance, so in-memory room state cannot be authoritative across clients.
- Current implementation: `server/game-simulation.js` extracts the deterministic 20 Hz authoritative game state and combat loop from the standalone WebSocket transport. `server/index.js` now adapts sockets to this simulation. `NetworkClient` reconnects with bounded exponential backoff and jitter; production HTTPS URL resolution targets `/api/ws`, while HTTP development retains port 2567.
- Coordination design implemented in code: clients append ordered join/input/leave events to a Redis Stream; one fenced room leader (atomic lease plus monotonically increasing epoch) reads events and advances the simulation; each successful tick atomically persists simulation state, publishes a snapshot event, and trims acknowledged input events. Each Function instance subscribes to the snapshot Pub/Sub channel through Upstash SSE and forwards snapshots/combat events only to its local sockets. A simple process-local simulation in each Function is explicitly insufficient.
- Infrastructure: free Upstash Redis database `wlgame-realtime` is provisioned in Frankfurt (`eu-central-1`). Vercel Preview variables (`UPSTASH_REDIS_REST_URL`, sensitive `UPSTASH_REDIS_REST_TOKEN`, and `VITE_WS_SERVER_URL=/api/ws`) are configured for `feature/isometric-arena` only. Vercel project Function region is set to Stockholm (`arn1`); `vercel.json` now declares the same top-level region. Production env vars and aliases remain untouched.
- Local verification after the complete Vercel/Redis runtime code: `npm test` passed 76/76; `npm run build`, `node --check server/index.js`, `node --check api/ws.js`, `node --check server/vercel-room-runtime.js`, and `git diff --check` succeeded. The existing Vite large-chunk warning remains non-fatal (~1.51 MB minified / 350 KB gzip).
- Not yet complete: provisioning/configuring a real Redis database, testing the Lua/Streams/PubSub behavior against it, Vercel environment configuration, deployed two-client test across separate Function instances, and manual browser/device QA.


## Vercel Function + Redis coordinator implementation — 2026-11-26

- [x] Add `api/ws.js`, a native Node.js WebSocket Function entrypoint using the existing `ws` dependency; ordinary HTTP requests receive 426 and WebSocket frames are capped at 1 KiB.
- [x] Add `vercel.json` with a 300-second maximum duration for `api/ws.js` (Hobby limit; reconnect behavior is implemented in the browser client).
- [x] Add `server/upstash-redis-rest.js`: authenticated REST command execution, publish, and SSE subscribe parsing (including CRLF frames).
- [x] Add `server/redis-room-coordinator.js`: atomic lease acquisition/renew/release with fencing epochs; Redis Stream append/read for ordered join/input/leave events; atomic tick state persistence + snapshot Pub/Sub + trimming of acknowledged input events.
- [x] Add `server/vercel-room-runtime.js`: per-instance local socket fan-out, one authoritative room leader, event replay, state recovery after leader failover, lease renewal, and slow-client snapshot backpressure.
- [x] Extend `GameSimulation` with explicit player IDs and JSON-safe state serialization/restore, including cooldown and projectile hit state.
- [x] Client can be configured with same-origin `VITE_WS_SERVER_URL=/api/ws`; HTTPS deployment stays in offline mode until this flag is set, avoiding retry loops before the Redis service is configured. Local HTTP development still defaults to port 2567.
- [x] Document server-only `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and optional `WLGAME_ROOM_ID` in `.env.example` (empty placeholders only; no credentials committed).
- [x] Local verification on code state: `npm test` passed 76/76; `npm run build`, syntax checks for local server and Vercel endpoint/runtime, and `git diff --check` passed. The known non-fatal Vite chunk-size warning remains (~1.51 MB minified / 350 KB gzip).
- [x] Live Upstash checks verified atomic lease acquisition, Redis Stream XADD/XREAD, fenced tick commit (Lua EVAL), and state persistence on the provisioned free database.
- [ ] Verify live Pub/Sub SSE subscription delivery and reconnect behavior; the `PUBLISH` command itself was accepted, but no subscriber delivery has yet been observed. A direct SSE test from the isolated runner was blocked by credential-handling controls.
- [x] Configure Preview-only Vercel environment variables for `feature/isometric-arena`; production settings remain unchanged.
- [x] Deploy the current runtime/config source with the Preview variables and confirm the WebSocket Function deployment reports region `arn1`: `dpl_AkmKYPTFiqaWwTQqzs1TTd8yN33F` (`READY`, source `7b5349d...`). The subsequent branch commits are documentation-only.
- [ ] Test two-client traffic across separate Function instances, leader failover, 300-second reconnect, and manual gameplay.
- Infrastructure note: the free Upstash database has been created with no reserved monthly charge. Keep usage within its free quota; do not upgrade to a paid plan without explicit approval. Current target pairing: Vercel Function `arn1` (Stockholm) + Upstash primary `eu-central-1` (Frankfurt).


### Latest verified rollout status — 2026-11-26

- GitHub Actions run #158 (`45773309161`) passed on branch HEAD `513a1b8a8ed69bd0fc702b914f058a07c002132f`: Vite build, `npm test`, and the workflow's Node syntax check succeeded.
- Vercel Preview deployment `dpl_AkmKYPTFiqaWwTQqzs1TTd8yN33F` is READY, source `7b5349dc9987c9cda2a1cb1749db39eb9f3a60c8`, Function region `arn1` (Stockholm). Branch alias: `https://wlgame-test-git-feature-isometric-arena-callback5.vercel.app` (SSO-protected).
- A manual forced deployment for exact docs-only HEAD was rejected because the Vercel Hobby team exceeded 100 deployments/day; automatic deployment for the app-code commit above succeeded after the region change. Avoid redundant deploys until quota resets.
- Live Upstash tests confirmed lease acquisition, XADD/XREAD, and fenced atomic state commit. Pub/Sub SSE and actual two-client WebSocket traffic still need validation.

- Latest CI after documentation updates: run #160 (`45773485362`) passed on HEAD `3ae8c7f123c1a1de80271b91ac5c870e64874964`.
- Live Redis lease verification also confirmed token renewal, release, and rejection of a stale token after release.


## Local movement jitter investigation — 2026-11-26

- User reports strong movement spikes in the deployed Preview. Two-player testing is explicitly deferred until single-player movement is smooth.
- Code inspection found the local player was hard-snapped to every 20 Hz server snapshot, while the Vercel room leader advances only after sequential Redis REST/Streams/commit work. This makes visible movement inherit snapshot/network jitter; the remote-player interpolation buffer did not cover the local player.
- Added client-side local movement prediction at render-frame cadence using the same arena circle resolver as the server, plus a 100 ms exponential reconciliation toward authoritative snapshots. First authoritative snapshot seeds the spawn position; reconnect welcome resets prediction initialization.
- Added deterministic unit coverage for spawn seeding, per-frame movement, smooth correction, bounds, and long-frame delta capping.
- Next gate: run CI/build, then single-client Preview movement test and inspect p95/p99 frame time. Do not start two-player or cross-instance testing until this gate passes.
