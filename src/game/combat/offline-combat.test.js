import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAINING_TARGET,
  createTrainingTarget,
  hitTrainingTarget,
  updateTrainingTarget
} from './offline-combat.js';

const world = { width: 1600, height: 1000 };

test('training target starts at full health and the expected spawn', () => {
  const target = createTrainingTarget();
  assert.equal(target.x, TRAINING_TARGET.x);
  assert.equal(target.y, TRAINING_TARGET.y);
  assert.equal(target.health, 100);
  assert.equal(target.alive, true);
});

test('fireball damage reduces health and applies directional knockback', () => {
  const target = createTrainingTarget();
  const hit = hitTrainingTarget(target, 8, 1, 0, 1000);
  assert.equal(hit.dealt, 8);
  assert.equal(hit.killed, false);
  assert.equal(hit.target.health, 92);
  assert.ok(hit.target.vx > 260);
  assert.equal(hit.target.vy, 0);
});

test('lethal damage marks target dead and schedules respawn', () => {
  const target = { ...createTrainingTarget(), health: 8 };
  const hit = hitTrainingTarget(target, 8, 0, -1, 500);
  assert.equal(hit.killed, true);
  assert.equal(hit.target.alive, false);
  assert.equal(hit.target.respawnAt, 500 + TRAINING_TARGET.respawnDelayMs);
});

test('dead target ignores hits and respawns after delay', () => {
  const target = { ...createTrainingTarget(), health: 0, alive: false, respawnAt: 2000 };
  assert.equal(hitTrainingTarget(target, 8, 1, 0, 1000).dealt, 0);
  assert.equal(updateTrainingTarget(target, 16, 1999, world), target);
  const respawned = updateTrainingTarget(target, 16, 2000, world);
  assert.equal(respawned.alive, true);
  assert.equal(respawned.health, respawned.maxHealth);
  assert.equal(respawned.x, TRAINING_TARGET.x);
  assert.equal(respawned.vx, 0);
});

test('target knockback decays and remains inside world bounds', () => {
  const target = { ...createTrainingTarget(), x: 1599, vx: 500, vy: 0 };
  const moved = updateTrainingTarget(target, 100, 100, world);
  assert.equal(moved.x, 1600 - target.radius);
  assert.ok(moved.vx < target.vx);
});


test('target knockback resolves against static arena obstacles', () => {
  const target = { ...createTrainingTarget(), x: 100, y: 100, vx: -500, vy: 0 };
  const obstacles = [{ x: 70, y: 100, radius: 20 }];
  const moved = updateTrainingTarget(target, 100, 100, world, obstacles);
  assert.ok(Math.hypot(moved.x - 70, moved.y - 100) >= target.radius + 20 - 1e-9);
});
