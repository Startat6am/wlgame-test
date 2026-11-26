import test from 'node:test';
import assert from 'node:assert/strict';
import { RedisRoomCoordinator } from './redis-room-coordinator.js';

function fakeRedis(results = []) {
  const calls = [];
  return {
    calls,
    command: async (args) => {
      calls.push(args);
      return results.shift();
    },
    publish: async (channel, event) => {
      calls.push(['PUBLISH', channel, event]);
      return 1;
    }
  };
}

test('room keys are namespaced and lease acquisition uses an atomic epoch token', async () => {
  const redis = fakeRedis([['instance-a:7', 7]]);
  const coordinator = new RedisRoomCoordinator(redis);
  const lease = await coordinator.acquireLease('lobby-1', 'instance-a');
  assert.deepEqual(lease, { token: 'instance-a:7', epoch: 7 });
  assert.deepEqual(redis.calls[0].slice(0, 4), [
    'EVAL', redis.calls[0][1], '2', 'wlgame:room:lobby-1:lease'
  ]);
  assert.equal(redis.calls[0][4], 'wlgame:room:lobby-1:epoch');
});

test('renew and release are compare-token operations', async () => {
  const redis = fakeRedis([1, 0]);
  const coordinator = new RedisRoomCoordinator(redis);
  assert.equal(await coordinator.renewLease('arena', 'owner:3'), true);
  assert.equal(await coordinator.releaseLease('arena', 'other:4'), false);
  assert.equal(redis.calls[0][0], 'EVAL');
  assert.equal(redis.calls[1][0], 'EVAL');
});

test('state commits are fenced by the current lease token and include snapshot publication', async () => {
  const redis = fakeRedis([1]);
  const coordinator = new RedisRoomCoordinator(redis);
  const state = { version: 1, players: [], projectiles: [] };
  const event = { type: 'snapshot', tick: 20 };
  assert.equal(await coordinator.commitTick('arena', 'leader:2', state, event), true);
  const command = redis.calls[0];
  assert.equal(command[0], 'EVAL');
  assert.equal(command[3], 'wlgame:room:arena:lease');
  assert.equal(command[4], 'wlgame:room:arena:state');
  assert.equal(command[5], 'wlgame:room:arena:events');
  assert.equal(JSON.parse(command[7]).version, 1);
  assert.deepEqual(JSON.parse(command[9]), event);
});

test('loads versioned state and publishes validated room inputs', async () => {
  const state = { version: 1, players: [], projectiles: [] };
  const redis = fakeRedis([JSON.stringify(state)]);
  const coordinator = new RedisRoomCoordinator(redis);
  assert.deepEqual(await coordinator.loadState('arena'), state);
  await coordinator.publishInput('arena', { type: 'join', playerId: 'p1' });
  assert.deepEqual(redis.calls[1], ['PUBLISH', 'wlgame:room:arena:events', { type: 'join', playerId: 'p1' }]);
});

test('rejects invalid room identifiers and malformed persisted state', async () => {
  const redis = fakeRedis(['{"version":2,"players":[],"projectiles":[]}']);
  const coordinator = new RedisRoomCoordinator(redis);
  assert.throws(() => coordinator.keys('../unsafe'), TypeError);
  await assert.rejects(coordinator.loadState('arena'), TypeError);
  await assert.rejects(coordinator.acquireLease('arena', ''), TypeError);
});
