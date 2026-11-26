import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWebSocketUrl } from './websocket-url.js';

test('uses explicit secure WebSocket URL when configured', () => {
  assert.equal(
    resolveWebSocketUrl({ protocol: 'https:', hostname: 'game.example', host: 'game.example' }, 'wss://arena.example/ws'),
    'wss://arena.example/ws'
  );
});

test('uses Vercel same-origin WebSocket route on HTTPS and local port in development', () => {
  assert.equal(
    resolveWebSocketUrl({ protocol: 'https:', hostname: 'game.example', host: 'game.example:8443' }),
    'wss://game.example:8443/api/ws'
  );
  assert.equal(
    resolveWebSocketUrl({ protocol: 'http:', hostname: 'localhost' }),
    'ws://localhost:2567'
  );
});

test('blank configuration uses the environment-appropriate fallback', () => {
  assert.equal(
    resolveWebSocketUrl({ protocol: 'https:', hostname: 'game.example', host: 'game.example' }, '  '),
    'wss://game.example/api/ws'
  );
});

test('rejects non-WebSocket and malformed configured URLs', () => {
  assert.throws(
    () => resolveWebSocketUrl({ protocol: 'https:', hostname: 'game.example' }, 'https://arena.example'),
    (error) => error instanceof TypeError && error.message.includes('must use ws:// or wss://')
  );
  assert.throws(
    () => resolveWebSocketUrl({ protocol: 'https:', hostname: 'game.example' }, 'not a URL'),
    /valid WebSocket URL/
  );
});

test('rejects missing browser location when no explicit URL exists', () => {
  assert.throws(() => resolveWebSocketUrl(null), TypeError);
});
