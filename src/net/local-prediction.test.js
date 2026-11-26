import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCircleAgainstArena } from '../game/combat/combat-math.js';
import {
  createLocalPredictionState,
  reconcileLocalPrediction,
  stepLocalPrediction
} from './local-prediction.js';

const world = { width: 1000, height: 1000 };
const options = { speed: 230, world, obstacles: [], radius: 15 };

test('initial authoritative position seeds local prediction once', () => {
  const state = createLocalPredictionState();
  const result = reconcileLocalPrediction(state, { x: 800, y: 500 }, { x: 620, y: 410 });
  assert.deepEqual(result, { x: 620, y: 410 });
  assert.equal(state.initialized, true);
});

test('local prediction advances every render frame without waiting for snapshots', () => {
  const state = createLocalPredictionState();
  state.initialized = true;
  const result = stepLocalPrediction(
    state, { x: 500, y: 500 }, { x: 1, y: 0 }, 1000 / 60,
    options, resolveCircleAgainstArena
  );
  assert.ok(Math.abs(result.x - (500 + 230 / 60)) < 0.001);
  assert.equal(result.y, 500);
});

test('server correction converges smoothly instead of snapping', () => {
  const state = createLocalPredictionState();
  state.initialized = true;
  reconcileLocalPrediction(state, { x: 103.8, y: 100 }, { x: 100, y: 100 });
  const first = stepLocalPrediction(
    state, { x: 103.8, y: 100 }, { x: 0, y: 0 }, 50,
    options, resolveCircleAgainstArena
  );
  const second = stepLocalPrediction(
    state, first, { x: 0, y: 0 }, 50,
    options, resolveCircleAgainstArena
  );
  assert.ok(first.x < 103.8 && first.x > 100);
  assert.ok(second.x < first.x && second.x > 100);
});

test('prediction clamps to arena bounds and caps long frame deltas', () => {
  const state = createLocalPredictionState();
  state.initialized = true;
  const result = stepLocalPrediction(
    state, { x: 985, y: 500 }, { x: 1, y: 0 }, 1000,
    { speed: 230, world: { width: 1000, height: 1000 }, obstacles: [], radius: 15 },
    resolveCircleAgainstArena
  );
  assert.equal(result.x, 985);
});
