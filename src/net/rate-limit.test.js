import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeRateLimit } from './rate-limit.js';

test('rate limiter allows messages up to the configured limit', () => {
  const state = {};
  assert.equal(consumeRateLimit(state, 100, 2, 1000), true);
  assert.equal(consumeRateLimit(state, 200, 2, 1000), true);
  assert.equal(consumeRateLimit(state, 300, 2, 1000), false);
});

test('rate limiter resets at the exact window boundary', () => {
  const state = {};
  assert.equal(consumeRateLimit(state, 100, 1, 500), true);
  assert.equal(consumeRateLimit(state, 599, 1, 500), false);
  assert.equal(consumeRateLimit(state, 600, 1, 500), true);
});

test('rate limiter safely resets when the clock moves backwards', () => {
  const state = {};
  assert.equal(consumeRateLimit(state, 1000, 1, 500), true);
  assert.equal(consumeRateLimit(state, 900, 1, 500), true);
});

test('rate limiter rejects invalid configuration', () => {
  assert.throws(() => consumeRateLimit(null, 0, 1, 100), TypeError);
  assert.throws(() => consumeRateLimit({}, 0, 0, 100), TypeError);
  assert.throws(() => consumeRateLimit({}, 0, 1, 0), TypeError);
});
