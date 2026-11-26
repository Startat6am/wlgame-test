import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDamage,
  calculateKnockback,
  calculateLavaDamage,
  isCooldownReady,
  segmentIntersectsCircle,
  resolveCircleCollision,
  resolveCircleAgainstArena
} from './combat-math.js';

test('damage reduces health and accumulates damage points', () => {
  assert.deepEqual(applyDamage({ health: 100, damagePoints: 0 }, 12), {
    health: 88,
    damagePoints: 12,
    alive: true
  });
});

test('damage cannot reduce health below zero or add overkill to damage points', () => {
  assert.deepEqual(applyDamage({ health: 5, damagePoints: 7 }, 12), {
    health: 0,
    damagePoints: 12,
    alive: false
  });
});

test('knockback grows with accumulated damage points', () => {
  assert.equal(calculateKnockback({
    baseKnockback: 100,
    abilityMultiplier: 1,
    damagePoints: 30,
    damagePointScale: 0.012
  }), 136);
});

test('ability multiplier scales knockback', () => {
  assert.equal(calculateKnockback({
    baseKnockback: 100,
    abilityMultiplier: 0.5,
    damagePoints: 0
  }), 50);
});

test('lava damage is proportional to elapsed time', () => {
  assert.equal(calculateLavaDamage(9, 500), 4.5);
});

test('cooldown becomes ready at its exact boundary', () => {
  assert.equal(isCooldownReady(8000, 6000, 2), true);
  assert.equal(isCooldownReady(7999, 6000, 2), false);
});

test('invalid negative values are rejected', () => {
  assert.throws(() => calculateKnockback({ baseKnockback: -1 }), TypeError);
  assert.throws(() => calculateLavaDamage(9, -1), TypeError);
});


test('swept projectile segment detects a circle hit without tunneling', () => {
  assert.equal(segmentIntersectsCircle(0, 0, 100, 0, 50, 0, 8), true);
  assert.equal(segmentIntersectsCircle(0, 0, 100, 0, 50, 8, 8), true);
  assert.equal(segmentIntersectsCircle(0, 0, 100, 0, 50, 8.01, 8), false);
});

test('segment-circle collision handles endpoints and zero-length movement', () => {
  assert.equal(segmentIntersectsCircle(0, 0, 10, 0, 0, 0, 1), true);
  assert.equal(segmentIntersectsCircle(5, 5, 5, 5, 5, 5, 0), true);
  assert.equal(segmentIntersectsCircle(5, 5, 5, 5, 7, 5, 1), false);
});

test('segment-circle collision rejects invalid inputs', () => {
  assert.throws(() => segmentIntersectsCircle(0, 0, Infinity, 0, 0, 0, 1), TypeError);
  assert.throws(() => segmentIntersectsCircle(0, 0, 1, 0, 0, 0, -1), TypeError);
});


test('circle collision pushes players out of overlapping obstacles', () => {
  assert.deepEqual(resolveCircleCollision(5, 0, 15, 0, 0, 20), {
    x: 35, y: 0, collided: true
  });
});

test('circle collision leaves separated bodies unchanged', () => {
  assert.deepEqual(resolveCircleCollision(40, 0, 15, 0, 0, 20), {
    x: 40, y: 0, collided: false
  });
});

test('circle collision resolves coincident centers deterministically', () => {
  assert.deepEqual(resolveCircleCollision(0, 0, 15, 0, 0, 20), {
    x: 35, y: 0, collided: true
  });
});


test('arena collision clamps a moving circle to every world boundary', () => {
  assert.deepEqual(resolveCircleAgainstArena(-20, 2000, 15, { width: 100, height: 80 }, []), {
    x: 15, y: 65, collided: true
  });
});

test('arena collision allows tangential movement along an obstacle edge', () => {
  const result = resolveCircleAgainstArena(15, 60, 15, { width: 200, height: 200 }, [
    { x: 50, y: 50, radius: 20 }
  ]);
  assert.ok(Math.hypot(result.x - 50, result.y - 50) >= 35 - 1e-9);
  assert.equal(result.x, 15);
  assert.equal(result.y, 60, 'tangential movement should remain unobstructed');
});

test('arena collision resolves a corner formed by two overlapping obstacles', () => {
  const obstacles = [
    { x: 50, y: 50, radius: 20 },
    { x: 95, y: 50, radius: 20 }
  ];
  const result = resolveCircleAgainstArena(72, 50, 15, { width: 200, height: 200 }, obstacles, 8);
  for (const obstacle of obstacles) {
    assert.ok(Math.hypot(result.x - obstacle.x, result.y - obstacle.y) >= 35 - 1e-8);
  }
});

test('arena collision rejects a world smaller than the moving circle', () => {
  assert.throws(() => resolveCircleAgainstArena(0, 0, 20, { width: 30, height: 30 }, []), RangeError);
});
