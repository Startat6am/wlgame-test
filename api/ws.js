import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { UpstashRedisRest } from '../server/upstash-redis-rest.js';
import { VercelRoomRuntime } from '../server/vercel-room-runtime.js';

const server = createServer((_request, response) => {
  response.writeHead(426, { 'content-type': 'text/plain' });
  response.end('Upgrade to WebSocket required');
});
const webSocketServer = new WebSocketServer({ server, maxPayload: 1024 });

let runtime;

function getRuntime() {
  if (runtime) return runtime;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Vercel WebSocket backend is not configured');
  const redis = new UpstashRedisRest({ url, token });
  runtime = new VercelRoomRuntime({
    redis,
    roomId: process.env.WLGAME_ROOM_ID || 'default',
    onError: (error) => console.error('[wlgame-ws]', error)
  });
  return runtime;
}

webSocketServer.on('connection', (socket) => {
  try {
    getRuntime().attach(socket).catch((error) => {
      console.error('[wlgame-ws] connection setup failed', error);
      if (socket.readyState === 1) socket.close(1011, 'Realtime backend unavailable');
    });
  } catch (error) {
    console.error('[wlgame-ws] configuration error', error);
    socket.close(1011, 'Realtime backend not configured');
  }
});

export default server;
