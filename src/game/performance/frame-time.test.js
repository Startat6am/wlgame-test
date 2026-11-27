import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFrameTimeHistory,
  recordFrameTime,
  getFrameTimeStats
} from './frame-time.js';

test('frame-time history reports percentiles and maximum', () => {
  const history = createFrameTimeHistory(8);
  [10, 20, 30, 40].forEach((delta) => recordFrameTime(history, delta));
  assert.deepEqual(getFrameTimeStats(history), {
    count: 4, p50: 20, p95: 40, p99: 40, max: 40
  });
});

test('frame-time history keeps only the newest samples after wrapping', () => {
  const history = createFrameTimeHistory(3);
  [10, 20, 30, 40, 50].forEach((delta) => recordFrameTime(history, delta));
  assert.deepEqual(getFrameTimeStats(history), {
    count: 3, p50: 40, p95: 50, p99: 50, max: 50
  });
});

test('empty history has no statistics', () => {
  assert.equal(getFrameTimeStats(createFrameTimeHistory()), null);
});

test('history rejects invalid capacity and frame times', () => {
  assert.throws(() => createFrameTimeHistory(0), TypeError);
  assert.throws(() => recordFrameTime(createFrameTimeHistory(), -1), TypeError);
  assert.throws(() => recordFrameTime(createFrameTimeHistory(), Infinity), TypeError);
});
