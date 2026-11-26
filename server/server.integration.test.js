import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import WebSocket from 'ws';

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('server did not start: ' + output)), 5000);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      const match = output.match(/listening on :([0-9]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error('server exited before listening (code ' + code + '): ' + output));
    });
  });
}

function waitForMessage(socket, predicate, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('timed out waiting for WebSocket message'));
    }, timeoutMs);
    function onMessage(raw) {
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return; }
      if (!predicate(message)) return;
      clearTimeout(timeout);
      socket.off('message', onMessage);
      resolve(message);
    }
    socket.on('message', onMessage);
  });
}

test('WebSocket server survives malformed input, rate-limits floods, and rejects oversized frames', async () => {
  const child = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const clients = [];
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  try {
    const port = await waitForServer(child);
    const socket = new WebSocket('ws://127.0.0.1:' + port);
    clients.push(socket);
    await once(socket, 'open');

    const welcomePromise = waitForMessage(socket, (message) => message.type === 'welcome');
    const firstSnapshotPromise = waitForMessage(socket, (message) => message.type === 'snapshot');
    const welcome = await welcomePromise;
    const firstSnapshot = await firstSnapshotPromise;
    const initial = firstSnapshot.players.find((player) => player.id === welcome.id);
    assert.ok(initial);

    socket.send('{not-json');
    const afterMalformed = await waitForMessage(socket, (message) =>
      message.type === 'snapshot' && message.players.some((player) => player.id === welcome.id));
    assert.ok(afterMalformed.players.some((player) => player.id === welcome.id));
    assert.equal(socket.readyState, WebSocket.OPEN);

    for (let i = 0; i < 30; i += 1) {
      socket.send(JSON.stringify({ type: 'input', x: 1, y: 0 }));
    }
    socket.send(JSON.stringify({ type: 'input', x: -1, y: 0 }));

    const deadline = Date.now() + 2000;
    let moved = false;
    while (Date.now() < deadline && !moved) {
      const snapshot = await waitForMessage(socket, (message) =>
        message.type === 'snapshot' && message.players.some((player) => player.id === welcome.id));
      const current = snapshot.players.find((player) => player.id === welcome.id);
      moved = current.x > initial.x + 2;
    }
    assert.equal(moved, true, 'accepted movement should continue right after the excess reverse input is dropped');

    const oversized = new WebSocket('ws://127.0.0.1:' + port);
    clients.push(oversized);
    await once(oversized, 'open');
    const closed = once(oversized, 'close');
    oversized.send('x'.repeat(1025));
    const [code] = await closed;
    assert.equal(code, 1009, 'ws maxPayload should close oversized frames');
    assert.equal(child.exitCode, null, 'server process should remain alive');
  } finally {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
        client.terminate();
      }
    }
    child.kill('SIGTERM');
    if (child.exitCode === null) {
      await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 1000))]);
    }
    if (child.exitCode !== null && child.exitCode !== 0 && child.signalCode !== 'SIGTERM') {
      assert.fail('server exited unexpectedly: ' + stderr);
    }
  }
});
