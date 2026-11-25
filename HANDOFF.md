# WLGame Handoff — Recovery Checkpoint

> Read this file first after a frozen browser, interrupted chat, context loss, or when starting a new development session. GitHub is the source of truth; verify the live branch, CI, PR, and deployment before editing.

## 1. Repository and current checkpoint

- **Repository:** https://github.com/Startat6am/wlgame-test
- **Active work branch:** `feature/isometric-arena`
- **PR:** https://github.com/Startat6am/wlgame-test/pull/1 (open, draft; do not merge until manual browser QA is complete).
- **Base branch:** `main`, base commit at PR creation: `b30dccee049e99af70a9563deccb2f97676183b3`.
- **Latest application-code commit:** `5dba11606ddd14f14d874321e86380969d6c2748` — aligns authoritative player and Fireball obstacle collisions with the offline arena geometry.
- **Latest roadmap refresh:** `7870dd14bf6432fa730f55919720cad877c05327` — records the handoff workflow and obstacle-collision progress.
- **Current handoff refresh:** documentation-only; check branch HEAD for the resulting SHA after commit.
- **Checkpoint date:** 2026-11-25.

The source of truth is the current remote branch. Documentation-only commits can advance HEAD without changing the application-code checkpoint.

## 2. Verified CI and deployment

### GitHub Actions

- **Workflow:** WLGame CI
- **Run:** #45, run ID `45676652010`
- **Commit tested:** `5dba11606ddd14f14d874321e86380969d6c2748`
- **Result:** SUCCESS.
- Passed steps: dependency install, `npm run build`, `npm test`, and `node --check server/index.js`.
- Run URL: https://github.com/Startat6am/wlgame-test/actions/runs/45676652010

### Vercel

- **Current team:** `callback` (slug `callback5`), Hobby.
- **Project:** `wlgame-test`
- **Project ID:** `prj_278OZbqZFGgj3fYYfS8aF3laAbhx`
- **Linked Git repository:** `Startat6am/wlgame-test`
- **Preview branch:** `feature/isometric-arena`
- **Preview commit:** `5dba11606ddd14f14d874321e86380969d6c2748`
- **Preview deployment:** `dpl_EWYxNK7RNQ6u1idanftWLhzcUoCS`
- **Preview state:** READY (verified 2026-11-25).
- **Preview URL:** https://wlgame-test-git-feature-isometric-arena-callback5.vercel.app
- **Immutable deployment URL:** https://wlgame-test-513rh1na6-callback5.vercel.app
- **Inspector:** https://vercel.com/callback5/wlgame-test/EWYxNK7RNQ6u1idanftWLhzcUoCS
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
- Authoritative server player movement resolves overlap against the same circular arena obstacles; server Fireballs also stop on swept obstacle collision. Shared obstacle coordinates and collision math match the offline scene.

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
- `npm test` — Node tests under `src/game/combat/*.test.js` and `src/game/geometry/*.test.js`
- `npm run server` — `node server/index.js`

## 5. Known gaps — do not mark complete

1. **Manual browser QA is still pending:** isometric rendering, camera bounds/scroll, collision alignment, desktop and phone layouts, actor depth, FIRE tap/drag, keyboard aim, touch movement, local and network modes. User reports no major visible complaints so far; this is useful feedback but not a substitute for browser/device verification.
2. **Offline Fireball combat lifecycle is incomplete:** obstacle collision is implemented, but offline mode has no opponent/combatant target, so local damage, knockback, death, and respawn are not yet wired.
3. **Online obstacle collision needs gameplay verification:** authoritative player movement and Fireballs now use the same circular obstacle geometry as the offline scene; confirm sliding, edge behavior, and projectile impacts in a live multi-client session.
4. **WebSocket hosting/configuration is incomplete:** `NetworkClient.js` currently connects to `ws(s)://<current-hostname>:2567`. Vercel hosts the frontend; it does not host the persistent Node WebSocket server. A separate persistent host and explicit server URL configuration are required.
5. No repeatable desktop/phone frame-time or memory baseline has been captured. Do not claim performance improvements without same-device before/after measurements.
6. Object pools, texture atlases, DPR caps, and spatial partitioning remain profiling-driven backlog items.
7. Do not invent exact Warlock Arena 0.88/0.88b mechanics or numeric balance values. The balance JSON distinguishes confirmed 0.88 values, references from other versions, and estimates.

## 6. Recovery procedure

1. Check branch and recent commits: `git status --short --branch` and `git log -8 --oneline --decorate`.
2. Fetch remote: `git fetch origin`; inspect `git status -sb`. Never reset/rebase/force-push blindly.
3. Read `HANDOFF.md`, `ROADMAP.md`, `GAME_DESIGN.md`, and `docs/PERFORMANCE.md` as relevant.
4. Confirm the exact branch HEAD and PR #1 head SHA.
5. Run `npm install`, `npm test`, `npm run build`; for server changes also run `node --check server/index.js`.
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
4. Decide/add an offline opponent or training target model before wiring offline damage, knockback, death, and respawn.
5. Choose persistent WebSocket hosting and configure an explicit client server URL; then test multi-client sessions.
6. Capture desktop and representative-phone frame-time/memory baselines before further performance tuning.

---

**Maintenance rule:** update this file only with verified repository, CI, and deployment evidence. A requested action, code draft, or deployment in progress is not a completed task.
