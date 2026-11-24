import test from 'node:test';
import assert from 'node:assert/strict';
import { worldToScreen, screenToWorld, screenVectorToWorld, projectedAngle } from './isometric.js';

test('isometric projection round-trips arena coordinates', () => {
  for (const point of [{ x: 0, y: 0 }, { x: 800, y: 500 }, { x: 1600, y: 1000 }, { x: 123, y: 876 }]) {
    const projected = worldToScreen(point.x, point.y);
    const restored = screenToWorld(projected.x, projected.y);
    assert.ok(Math.abs(restored.x - point.x) < 1e-9);
    assert.ok(Math.abs(restored.y - point.y) < 1e-9);
  }
});

test('screen movement vectors map back to the intended projected direction', () => {
  for (const vector of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
    const world = screenVectorToWorld(vector.x, vector.y);
    const projectedX = (world.x - world.y) * 0.75;
    const projectedY = (world.x + world.y) * 0.38;
    assert.ok(Math.abs(projectedX - vector.x) < 1e-9);
    assert.ok(Math.abs(projectedY - vector.y) < 1e-9);
  }
});

test('projected facing angle is finite and maps screen-up to screen-up', () => {
  const angle = projectedAngle(-1, -1);
  assert.ok(Number.isFinite(angle));
  assert.ok(Math.abs(angle + Math.PI / 2) < 1e-9);
});
