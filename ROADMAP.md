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

**Verification snapshot (2026-11-25):** GitHub Actions run #40 passed on application commit `eea4e3478195737225c13f69bb59a3c87897f3f2` (Vite build, `npm test`, and `node --check server/index.js`). The new Vercel project `wlgame-test` deployed that same branch/commit to Preview and reported READY. This verifies build/deployment only; manual browser gameplay checks have not yet been completed. An unrelated failed Vercel status from the former team still appears on GitHub and refers to its old daily build limit; the new team's Vercel check is successful.

## Roadmap

### P0 — Performance foundation and playable combat
- [ ] Establish repeatable desktop/mobile performance baselines.
- [ ] Add frame-time history and p95/p99 reporting.
- [ ] Verify the joystick dirty-render and 20 Hz input changes in browser.
- [ ] Complete local projectile collision, damage, knockback, death, and respawn.
- [ ] Add collision tests and gameplay regression tests.
- [ ] Verify mobile portrait and landscape behavior.
- [ ] Fix any measured performance regressions before expanding content.

### P1 — Core arena and simulation
- [ ] Complete arena boundaries and obstacle collision rules in both offline and authoritative online simulation.
- [ ] Implement lava zones and damage/death flow.
- [ ] Separate simulation from presentation where required.
- [ ] Add projectile/effect pooling if profiling demonstrates allocation pressure.
- [ ] Add stable remote-player interpolation.
- [ ] Add long-session memory and lifecycle tests.

### P2 — Ability framework
- [ ] Implement data-driven ability definitions and common lifecycle.
- [ ] Standardize cooldown, cost, targeting, projectile, area, status, and effect interfaces.
- [ ] Implement confirmed 0.88/0.88b ability behavior.
- [ ] Implement the remaining ability set and combinations only as source evidence becomes available.
- [ ] Add balance tests and source-confidence metadata for every parameter.

### P3 — Online multiplayer
- [ ] Deploy the Node.js WebSocket server on persistent hosting separate from Vercel.
- [ ] Configure the client with an explicit server URL.
- [ ] Add rooms, lobby, ready state, match lifecycle, and disconnect handling.
- [ ] Harden server validation, rate limits, and slow-client handling.
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

## Definition of done for each phase

A phase is complete only when:
1. Code is committed.
2. Automated tests pass.
3. Manual checks cover affected desktop and mobile flows.
4. Performance changes include before/after measurements where relevant.
5. Documentation reflects the actual implementation.
6. No unverified deployment is described as released.

## Current next actions

1. Perform browser QA on the isometric Preview: arena bounds, camera follow/scroll, obstacle collision footprint, actor depth, desktop and phone aspect ratios.
2. Verify FIRE tap/drag, keyboard aim, and touch joystick in offline and connected modes.
3. Fix issues found by those checks before merging P6a.
4. Continue P0: add local projectile collision/damage lifecycle with automated tests; preserve the distinction between offline visual-only fireball and authoritative online combat until implemented.
5. Make online obstacle collision match the offline arena geometry.
6. Configure persistent WebSocket hosting and an explicit client server URL before claiming online multiplayer is available outside local development.
