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
- [ ] Deploy the Node.js WebSocket server on persistent hosting separate from Vercel.
- [x] Support an explicit client WebSocket endpoint through `VITE_WS_SERVER_URL` with a same-host development fallback.
- [ ] Add rooms, lobby, ready state, match lifecycle, and disconnect handling.
- [x] Add a 1 KB WebSocket payload cap, per-player input/cast rate limits, and snapshot backpressure protection (skip stale snapshots above 64 KB queued).
- [x] Extract WebSocket protocol parsing and rate limits into pure unit-testable functions; test malformed/oversized/invalid payloads, input/cast floods, and slow-client backpressure policy. Disconnect after >256 KiB queued for 40 consecutive ticks (2 seconds). [ ] Add live WebSocket integration and load tests.
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
4. Configure persistent WebSocket hosting and an explicit client server URL before claiming online multiplayer is available outside local development.


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
- Live WebSocket integration tests and concurrent-client load tests remain open; unit tests do not prove behavior under real network congestion.
- Local verification: npm test passed 52/52, npm run build succeeded, node --check server/index.js succeeded, and git diff --check succeeded. GitHub Actions WLGame CI run #102 (ID 45766258303) passed on server code commit cad2fd6522523c6a219951a8f97a70a4a1b4eb81; CI run #104 (ID 45766338860) passed on documentation HEAD 53298e309f33ec8ac3ae724b4b3122eb45c2811c. Vercel Preview deployment dpl_F7NdfP753Hdb5CYpBLGNnNYVftn1 is READY for that exact HEAD. Vite's known large-chunk warning remains.
