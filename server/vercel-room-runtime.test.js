import test from 'node:test';
import assert from 'node:assert/strict';
import { VercelRoomRuntime } from './vercel-room-runtime.js';

function makeCoordinator({ events = [], recovered = null, commitResult = true } = {}) {
  const calls = [];
  return {
    calls,
    keys: () => ({ channel: 'room:snapshots' }),
    acquireLease: async (...args) => { calls.push(['acquire', ...args]); return { token: 'leader:1', epoch: 1 }; },
    loadState: async () => recovered,
    readEvents: async (...args) => { calls.push(['read', ...args]); return events; },
    commitTick: async (...args) => {
      calls.push(['commit', ...args]);
      return commitResult;
    },
    renewLease: async () => true,
    releaseLease: async () => true,
    appendEvent: async () => '1-0'
  };
}

function makeRuntime(coordinator, now = () => 1000) {
  return new VercelRoomRuntime({
    redis: { subscribe: async () => {} },
    coordinator,
    roomId: 'test-room',
    instanceId: 'test-instance',
    now,
    setIntervalImpl: () => 1,
    clearIntervalImpl: () => {}
  });
}

test('room leader replays ordered join/input events and commits one authoritative tick', async () => {
  const coordinator = makeCoordinator({
    events: [
      { id: '1-0', event: { type: 'join', playerId: 'p1' } },
      { id: '2-0', event: { type: 'input', playerId: 'p1', raw: JSON.stringify({ type: 'input', x: 1, y: 0 }), receivedAt: 1000 } }
    ]
  });
  const runtime = makeRuntime(coordinator);
  assert.equal(await runtime.tickOnce(), true);
  assert.equal(runtime.simulation.players.has('p1'), true);
  const committed = coordinator.calls.find((call) => call[0] === 'commit');
  assert.equal(committed[2], 'leader:1');
  assert.equal(committed[3].lastEventId, '2-0');
  assert.equal(committed[4].type, 'tick');
  assert.equal(committed[4].snapshot.players[0].id, 'p1');
  assert.ok(committed[4].snapshot.players[0].x > 800);
});

test('new leader restores simulation and resumes from persisted stream cursor', async () => {
  const firstCoordinator = makeCoordinator({
    events: [{ id: '7-0', event: { type: 'join', playerId: 'p1' } }]
  });
  const first = makeRuntime(firstCoordinator);
  await first.tickOnce();
  const firstCommit = firstCoordinator.calls.find((call) => call[0] === 'commit');
  const savedState = firstCommit[3];

  const nextCoordinator = makeCoordinator({ recovered: savedState });
  nextCoordinator.acquireLease = async () => ({ token: 'leader:2', epoch: 2 });
  const next = makeRuntime(nextCoordinator, () => 1050);
  assert.equal(await next.tickOnce(), true);
  assert.equal(next.simulation.players.has('p1'), true);
  assert.equal(nextCoordinator.calls.find((call) => call[0] === 'read')[2], '7-0');
  assert.equal(next.leaseEpoch, 2);
});

test('leader stops publishing when its fenced state commit is rejected', async () => {
  const coordinator = makeCoordinator({ commitResult: false });
  coordinator.readEvents = async () => [];
  const runtime = makeRuntime(coordinator);
  assert.equal(await runtime.tickOnce(), false);
  assert.equal(runtime.leaseToken, null);
});
