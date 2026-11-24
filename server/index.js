import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 2567);
const TICK_RATE = 20;
const WORLD = { width: 1600, height: 1000 };
const SPEED = 230;
const players = new Map();

const server = new WebSocketServer({ port: PORT });

function sendSnapshot() {
  const payload = JSON.stringify({
    type: 'snapshot',
    players: [...players.values()].map(({ id, x, y }) => ({ id, x, y }))
  });
  for (const client of server.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}

server.on('connection', (socket) => {
  const id = randomUUID();
  const player = { id, x: 800 + (Math.random() - 0.5) * 100, y: 500, inputX: 0, inputY: 0 };
  players.set(id, player);
  socket.send(JSON.stringify({ type: 'welcome', id }));

  socket.on('message', (raw) => {
    if (raw.length > 1024) return;
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (message.type !== 'input') return;
    const x = Number(message.x);
    const y = Number(message.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    player.inputX = Math.max(-1, Math.min(1, x));
    player.inputY = Math.max(-1, Math.min(1, y));
    const length = Math.hypot(player.inputX, player.inputY);
    if (length > 1) {
      player.inputX /= length;
      player.inputY /= length;
    }
  });

  socket.on('close', () => players.delete(id));
  socket.on('error', () => players.delete(id));
});

setInterval(() => {
  const dt = 1 / TICK_RATE;
  for (const player of players.values()) {
    player.x = Math.max(24, Math.min(WORLD.width - 24, player.x + player.inputX * SPEED * dt));
    player.y = Math.max(24, Math.min(WORLD.height - 24, player.y + player.inputY * SPEED * dt));
  }
  sendSnapshot();
}, 1000 / TICK_RATE);

server.on('listening', () => {
  console.log(`WLGame WebSocket server listening on :${PORT}`);
});