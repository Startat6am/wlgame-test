import test from 'node:test';
import assert from 'node:assert/strict';
import { getReconnectDelay } from './reconnect.js';

test('reconnect delay grows exponentially and is capped with bounded jitter', () => {
  assert.equal(getReconnectDelay(0, () => 0), 800);
  assert.equal(getReconnectDelay(0, () => 0.5), 1000);
  assert.equal(getReconnectDelay(1, () => 1), 2400);
  assert.equal(getReconnectDelay(20, () => 0.5), 15000);
});

test('reconnect delay rejects invalid attempts', () => {
  assert.throws(() => getReconnectDelay(-1), TypeError);
  assert.throws(() => getReconnectDelay(1.5), TypeError);
});
