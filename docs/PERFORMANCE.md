# WLGame Performance Foundation

## Purpose

This document defines the performance strategy for WLGame. The goal is stable, predictable gameplay on desktop and mobile without changing Warlock Arena gameplay rules or guessing at optimizations before measuring them.

## Current implementation audit

Reviewed files:
- `src/game/scenes/ArenaScene.js`
- `src/game/input/TouchControls.js`
- `src/net/NetworkClient.js`
- `server/index.js`

Observed facts:
- The arena's static background, grid, obstacles, and decorative circles are created in `drawArena()`, not rebuilt in the frame loop. Preserve this.
- The mobile joystick graphics were cleared and redrawn on every scene update, even when the stick had not changed.
- Network input was sent from the render update loop. At 60 render FPS this could produce roughly 60 input messages per second, despite the server simulation running at 20 Hz.
- Local Fireball creates a new container and child display objects for each cast, then destroys them at range expiry. Pooling is a future optimization once projectile counts and allocation pressure are measured.
- Server projectile collision used `Math.hypot()` for a simple radius threshold. Squared-distance comparison is cheaper and equivalent for that threshold.
- Snapshot handling creates temporary Sets and updates display objects on every snapshot. This is acceptable at the current prototype scale; optimize only after profiling.
- The FPS label reports Phaser's actual FPS, but there is not yet a frame-time history, p95 frame time, memory telemetry, or per-system timing.

## Changes applied

### 1. Dirty-rendered touch joystick
The joystick now redraws only when its input state or screen anchor changes. On devices without touch input its graphics are hidden. This avoids clearing and redrawing unchanged graphics on every frame.

### 2. Network input cadence
The client now sends movement input at a 20 Hz cadence, matching the current server simulation rate, rather than sending once per rendered frame. The most recent input vector is sent on each cadence interval.

These changes reduce avoidable client-side work and network message volume without changing movement speed or server authority.

## Performance architecture

Keep three rates independent:
1. Rendering: driven by the display and device capability.
2. Client-side presentation/simulation: use fixed-step simulation where deterministic local physics is needed; interpolate presentation between simulation states.
3. Server simulation: currently 20 ticks/second. Evaluate 20–30 Hz only with latency and CPU measurements; do not increase it by assumption.

The online server remains authoritative for match state. Client interpolation must never become authority for damage, cooldowns, or hits.

## Optimization backlog

### Measurement first
- [ ] Record baseline FPS and frame-time percentiles on representative desktop and mobile devices.
- [ ] Add rolling frame-time samples and p50/p95/p99 reporting.
- [ ] Measure update, physics, render, and snapshot costs separately where instrumentation permits.
- [ ] Record memory after startup and after a long match.
- [ ] Create repeatable stress scenes for many players, projectiles, and effects.

### Client and rendering
- [ ] Verify WebGL renderer selection and fallback behavior on target browsers.
- [ ] Cap effective device pixel ratio on mobile after visual quality/performance comparison.
- [ ] Add texture atlases for production sprites and effects.
- [ ] Pool projectiles and short-lived effects if profiling confirms allocation/GC spikes.
- [ ] Bound particle counts and effect lifetimes.
- [ ] Avoid UI text/layout updates when values have not changed.
- [ ] Keep static arena graphics static; consider cached textures only if profiling shows a benefit.
- [ ] Handle background-tab visibility and resume without large simulation jumps.

### Simulation and collision
- [ ] Separate simulation cadence from render cadence where client-side simulation grows.
- [ ] Use squared-distance checks for simple circular collision thresholds.
- [ ] Introduce spatial partitioning only when player/projectile counts justify it.
- [ ] Ensure all time-based movement and effects use delta/fixed-step time consistently.
- [ ] Add tests for pooling lifecycle and collision equivalence.

### Networking
- [ ] Keep input cadence bounded and configurable.
- [ ] Consider change detection/deadbands only after confirming they do not impair responsive controls.
- [ ] Interpolate remote player snapshots.
- [ ] Measure snapshot size and serialization cost.
- [ ] Add backpressure/slow-client handling and message-rate limits.
- [ ] Test latency, jitter, packet loss, reconnect, and multiple simultaneous clients.

### Server
- [ ] Replace square-root distance checks with squared-distance checks where only a threshold is needed.
- [ ] Profile snapshot construction and JSON serialization.
- [ ] Add spatial partitioning if collision work grows toward O(projectiles × players) bottlenecks.
- [ ] Add load tests and event-loop lag monitoring.
- [ ] Keep server tick rate evidence-based.

## Performance targets (acceptance goals, not current measurements)

| Metric | Goal |
|---|---:|
| Modern desktop | stable 60 FPS |
| Target mobile devices | 60 FPS where supported |
| Low-end fallback | stable 30 FPS |
| Frame budget at 60 FPS | 16.7 ms |
| Frame budget at 30 FPS | 33.3 ms |
| Server simulation | current baseline 20 Hz |
| Long-session memory | no unbounded growth |

Use p95/p99 frame time in addition to average FPS. A high average FPS can hide periodic stalls.

## Rules

- Profile before introducing complex optimization.
- Preserve gameplay and server authority.
- Do not migrate engines or add ECS/WebGPU solely for fashion.
- Every optimization must have a before/after measurement and a regression check.
- Do not claim a performance gain until measured on the same device and scenario.
