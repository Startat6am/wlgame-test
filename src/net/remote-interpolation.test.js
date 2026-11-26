import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRemoteInterpolationBuffer,
  pushRemotePlayerSample,
  sampleRemotePlayer
} from './remote-interpolation.js';

const player = (x, y, facingX = 1, facingY = 0) => ({
  id: 'remote-1', x, y, facingX, facingY
});

test('interpolates position and facing between timestamped snapshots', () => {
  const buffer = createRemoteInterpolationBuffer();
  pushRemotePlayerSample(buffer, player(0, 10, 1, 0), 100);
  pushRemotePlayerSample(buffer, player(100, 30, 0, 1), 200);
  assert.deepEqual(sampleRemotePlayer(buffer, 150), {
    at: 150, x: 50, y: 20, facingX: 0.5, facingY: 0.5
  });
});

test('holds the oldest or newest known sample outside the buffer range', () => {
  const buffer = createRemoteInterpolationBuffer();
  pushRemotePlayerSample(buffer, player(12, 24), 100);
  pushRemotePlayerSample(buffer, player(30, 40), 200);
  assert.equal(sampleRemotePlayer(buffer, 0).x, 12);
  assert.equal(sampleRemotePlayer(buffer, 500).x, 30);
});

test('replaces same-time samples and rejects out-of-order snapshots', () => {
  const buffer = createRemoteInterpolationBuffer();
  pushRemotePlayerSample(buffer, player(1, 2), 100);
  pushRemotePlayerSample(buffer, player(5, 6), 100);
  assert.equal(pushRemotePlayerSample(buffer, player(9, 9), 90), false);
  assert.equal(buffer.samples.length, 1);
  assert.equal(sampleRemotePlayer(buffer, 100).x, 5);
});

test('keeps only the configured number of recent samples', () => {
  const buffer = createRemoteInterpolationBuffer(2);
  pushRemotePlayerSample(buffer, player(1, 1), 10);
  pushRemotePlayerSample(buffer, player(2, 2), 20);
  pushRemotePlayerSample(buffer, player(3, 3), 30);
  assert.deepEqual(buffer.samples.map((sample) => sample.at), [20, 30]);
});

test('ignores malformed player samples and validates buffer size', () => {
  assert.throws(() => createRemoteInterpolationBuffer(1), TypeError);
  const buffer = createRemoteInterpolationBuffer();
  assert.equal(pushRemotePlayerSample(buffer, { id: 'x', x: NaN, y: 0 }, 10), false);
  assert.equal(sampleRemotePlayer(buffer, 10), null);
});
