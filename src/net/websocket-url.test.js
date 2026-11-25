import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWebSocketUrl } from './websocket-url.js';

test('uses explicit secure WebSocket URL when configured', () => {
  assert.equal(
    resolveWebSocketUrl({ protocol: 'https:', hostname: 'game.example' }, 'wss://arena.example/ws'),
    'wss://arena.example/ws'
  );
});

test('falls back to same-host WebSocket on HTTPS and HTTP', () => {
  assert.equal(
    resolveWebSocketUrl({ protocol: 'https:', hostname: 'game.example' }),
    'wss://game.example:2567'
  );
  assert.equal(
    resolveWebSocketUrl({ protocol: 'http:', hostname: 'localhost' }),
    'ws://localhost:2567'
  );
});

test('blank configuration uses the development fallback', () => {
  assert.equal(
    resolveWebSocketUrl({ protocol: 'https:', hostname: 'game.example' }, '  '),
    'wss://game.example:2567'
  );
});

test('rejects non-WebSocket and malformed configured URLs', () => {
  assert.throws(
    () => resolveWebSocketUrl({ protocol: 'https:', hostname: 'game.example' }, 'https://arena.example'),
    /must use ws:// or wss:///
  );
  assert.throws(
    () => resolveWebSocketUrl({ protocol: 'https:', hostname: 'game.example' }, 'not a URL'),
    /valid WebSocket URL/
  );
});

test('rejects missing browser location when no explicit URL exists', () => {
  assert.throws(() => resolveWebSocketUrl(null), TypeError);
});
