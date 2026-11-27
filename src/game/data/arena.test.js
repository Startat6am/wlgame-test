import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_OBSTACLES } from './arena.js';

test('arena obstacle layout is shared, immutable, and contains valid circles', () => {
  assert.equal(ARENA_OBSTACLES.length, 9);
  assert.ok(Object.isFrozen(ARENA_OBSTACLES));
  for (const obstacle of ARENA_OBSTACLES) {
    assert.ok(Object.isFrozen(obstacle));
    assert.ok(Number.isFinite(obstacle.x));
    assert.ok(Number.isFinite(obstacle.y));
    assert.ok(Number.isFinite(obstacle.radius) && obstacle.radius > 0);
  }
});
