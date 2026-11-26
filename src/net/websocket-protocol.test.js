import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSnapshotDeliveryDecision,
  parseClientMessage,
  SLOW_CLIENT_DISCONNECT_BYTES,
  SLOW_CLIENT_MAX_TICKS,
  SNAPSHOT_SKIP_BYTES
} from './websocket-protocol.js';

function makePlayer() {
  return { inputRate: {}, castRate: {} };
}

test('parses and normalizes valid movement input', () => {
  const command = parseClientMessage(Buffer.from('{"type":"input","x":3,"y":4}'), makePlayer(), 100);
  assert.deepEqual(command, {
    type: 'input', x: 1 / Math.hypot(1, 1), y: 1 / Math.hypot(1, 1)
  });
});

test('rejects malformed, oversized, unknown, and non-finite messages', () => {
  const player = makePlayer();
  assert.equal(parseClientMessage('{bad json', player, 100), null);
  assert.equal(parseClientMessage('x'.repeat(1025), player, 100), null);
  assert.equal(parseClientMessage('{"type":"unknown"}', player, 100), null);
  assert.equal(parseClientMessage('{"type":"input","x":"NaN","y":0}', player, 100), null);
  assert.equal(parseClientMessage('{"type":"cast","ability":"fireball","angle":"Infinity"}', player, 100), null);
});

test('enforces per-player input and cast message limits', () => {
  const player = makePlayer();
  for (let i = 0; i < 30; i += 1) {
    assert.deepEqual(parseClientMessage('{"type":"input","x":1,"y":0}', player, 100), {
      type: 'input', x: 1, y: 0
    });
  }
  assert.equal(parseClientMessage('{"type":"input","x":1,"y":0}', player, 100), null);

  for (let i = 0; i < 3; i += 1) {
    assert.deepEqual(parseClientMessage('{"type":"cast","ability":"fireball","angle":1}', player, 200), {
      type: 'cast', ability: 'fireball', angle: 1
    });
  }
  assert.equal(parseClientMessage('{"type":"cast","ability":"fireball","angle":1}', player, 200), null);
});

test('skips snapshots for a moderately backed-up client', () => {
  const state = {};
  assert.deepEqual(getSnapshotDeliveryDecision(state, SNAPSHOT_SKIP_BYTES + 1), {
    skip: true, disconnect: false, consecutiveSlowTicks: 0
  });
});

test('disconnects a persistently slow client after 40 server ticks', () => {
  const state = {};
  for (let i = 0; i < SLOW_CLIENT_MAX_TICKS - 1; i += 1) {
    const decision = getSnapshotDeliveryDecision(state, SLOW_CLIENT_DISCONNECT_BYTES + 1);
    assert.equal(decision.disconnect, false);
  }
  const final = getSnapshotDeliveryDecision(state, SLOW_CLIENT_DISCONNECT_BYTES + 1);
  assert.deepEqual(final, {
    skip: true, disconnect: true, consecutiveSlowTicks: SLOW_CLIENT_MAX_TICKS
  });
});

test('resets slow-client streak when the queue drains', () => {
  const state = {};
  getSnapshotDeliveryDecision(state, SLOW_CLIENT_DISCONNECT_BYTES + 1);
  getSnapshotDeliveryDecision(state, SLOW_CLIENT_DISCONNECT_BYTES + 1);
  assert.equal(getSnapshotDeliveryDecision(state, 0).consecutiveSlowTicks, 0);
  assert.equal(getSnapshotDeliveryDecision(state, SLOW_CLIENT_DISCONNECT_BYTES + 1).consecutiveSlowTicks, 1);
});

test('rejects invalid backpressure inputs', () => {
  assert.throws(() => getSnapshotDeliveryDecision(null, 0), TypeError);
  assert.throws(() => getSnapshotDeliveryDecision({}, -1), TypeError);
  assert.throws(() => getSnapshotDeliveryDecision({}, Infinity), TypeError);
});
