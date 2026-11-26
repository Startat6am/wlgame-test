import test from 'node:test';
import assert from 'node:assert/strict';
import { UpstashRedisRest } from './upstash-redis-rest.js';

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    body: null
  };
}

test('sends authenticated Redis commands as JSON arrays', async () => {
  let request;
  const redis = new UpstashRedisRest({
    url: 'https://redis.example/',
    token: 'secret',
    fetchImpl: async (...args) => {
      request = args;
      return response({ result: 'OK' });
    }
  });
  assert.equal(await redis.command(['SET', 'key', 'value']), 'OK');
  assert.equal(request[0], 'https://redis.example');
  assert.equal(request[1].headers.Authorization, 'Bearer secret');
  assert.deepEqual(JSON.parse(request[1].body), ['SET', 'key', 'value']);
});

test('publishes JSON payloads through the REST Pub/Sub endpoint', async () => {
  let request;
  const redis = new UpstashRedisRest({
    url: 'https://redis.example',
    token: 'secret',
    fetchImpl: async (...args) => {
      request = args;
      return response({ result: 1 });
    }
  });
  assert.equal(await redis.publish('wlgame:room one', { type: 'tick', n: 1 }), 1);
  assert.equal(request[0], 'https://redis.example/publish/wlgame%3Aroom%20one');
  assert.deepEqual(JSON.parse(request[1].body), { type: 'tick', n: 1 });
});

test('parses Upstash SSE subscribe and message frames, preserving JSON commas', async () => {
  const encoder = new TextEncoder();
  const chunks = [
    'data: subscribe,room,1\n\n',
    'data: message,room,{"type":"snapshot","players":[{"id":"a,b"}]}\n\n'
  ];
  const redis = new UpstashRedisRest({
    url: 'https://redis.example',
    token: 'secret',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      body: new ReadableStream({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
          controller.close();
        }
      })
    })
  });
  let ready = false;
  const messages = [];
  await redis.subscribe('room', {
    onReady: () => { ready = true; },
    onMessage: (message) => messages.push(message)
  });
  assert.equal(ready, true);
  assert.deepEqual(messages, [{ type: 'snapshot', players: [{ id: 'a,b' }] }]);
});

test('rejects invalid credentials, commands, and Redis error responses', async () => {
  assert.throws(() => new UpstashRedisRest({ url: 'http://redis.example', token: 'x' }), TypeError);
  assert.throws(() => new UpstashRedisRest({ url: 'https://redis.example', token: '' }), TypeError);
  const redis = new UpstashRedisRest({
    url: 'https://redis.example',
    token: 'secret',
    fetchImpl: async () => response({ error: 'ERR bad command' })
  });
  await assert.rejects(redis.command([]), TypeError);
  await assert.rejects(redis.command(['BAD']), /ERR bad command/);
});
