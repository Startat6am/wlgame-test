import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 2567);
const TICK_RATE = 20;
const WORLD = { width: 1600, height: 1000 };
const SPEED = 230;
const FIREBALL = { damage: 8, cooldownMs: 1400, speed: 520, radius: 9, maxDistance: 520, baseKnockback: 260 };
const players = new Map();
const projectiles = new Map();
const server = new WebSocketServer({ port: PORT });

function sendSnapshot() {
  const payload = JSON.stringify({
    type: 'snapshot',
    players: [...players.values()].map(({ id, x, y, health, maxHealth, damagePoints, facingX, facingY }) => ({
      id, x, y, health, maxHealth, damagePoints, facingX, facingY
    })),
    projectiles: [...projectiles.values()].map(({ id, x, y }) => ({ id, x, y }))
  });
  for (const client of server.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}

function sendTo(player, payload) {
  if (player.socket.readyState === 1) player.socket.send(JSON.stringify(payload));
}

server.on('connection', (socket) => {
  const id = randomUUID();
  const player = {
    id, socket,
    x: 800 + (Math.random() - 0.5) * 260,
    y: 500 + (Math.random() - 0.5) * 180,
    inputX: 0, inputY: 0,
    facingX: 0, facingY: -1,
    vx: 0, vy: 0,
    health: 100, maxHealth: 100, damagePoints: 0,
    lastFireballAt: -Infinity
  };
  players.set(id, player);
  socket.send(JSON.stringify({ type: 'welcome', id }));

  socket.on('message', (raw) => {
    if (raw.length > 1024) return;
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }

    if (message.type === 'input') {
      const x = Number(message.x);
      const y = Number(message.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      player.inputX = Math.max(-1, Math.min(1, x));
      player.inputY = Math.max(-1, Math.min(1, y));
      if (Math.hypot(player.inputX, player.inputY) > 0.001) {
        player.facingX = player.inputX;
        player.facingY = player.inputY;
      }
      const length = Math.hypot(player.inputX, player.inputY);
      if (length > 1) { player.inputX /= length; player.inputY /= length; }
      return;
    }

    if (message.type === 'cast' && message.ability === 'fireball') {
      const angle = Number(message.angle);
      const now = Date.now();
      if (!Number.isFinite(angle) || now - player.lastFireballAt < FIREBALL.cooldownMs) return;
      player.lastFireballAt = now;
      const directionX = Math.cos(angle);
      const directionY = Math.sin(angle);
      const projectileId = randomUUID();
      projectiles.set(projectileId, {
        id: projectileId, ownerId: player.id,
        x: player.x + directionX * 24, y: player.y + directionY * 24,
        vx: directionX * FIREBALL.speed, vy: directionY * FIREBALL.speed,
        distance: 0, hitIds: new Set()
      });
    }
  });

  socket.on('close', () => players.delete(id));
  socket.on('error', () => players.delete(id));
});

setInterval(() => {
  const dt = 1 / TICK_RATE;
  const now = Date.now();

  for (const player of players.values()) {
    player.x += player.inputX * SPEED * dt + player.vx * dt;
    player.y += player.inputY * SPEED * dt + player.vy * dt;
    player.vx *= 0.88;
    player.vy *= 0.88;
    player.x = Math.max(24, Math.min(WORLD.width - 24, player.x));
    player.y = Math.max(24, Math.min(WORLD.height - 24, player.y));
  }

  for (const [id, projectile] of projectiles) {
    const stepX = projectile.vx * dt;
    const stepY = projectile.vy * dt;
    projectile.x += stepX;
    projectile.y += stepY;
    projectile.distance += Math.hypot(stepX, stepY);

    let consumed = false;
    for (const target of players.values()) {
      if (target.id === projectile.ownerId || projectile.hitIds.has(target.id)) continue;
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      if (dx * dx + dy * dy > 25 * 25) continue;

      projectile.hitIds.add(target.id);
      target.health = Math.max(0, target.health - FIREBALL.damage);
      target.damagePoints += FIREBALL.damage;
      const length = Math.hypot(projectile.vx, projectile.vy) || 1;
      const scale = 1 + target.damagePoints * 0.012;
      target.vx += (projectile.vx / length) * FIREBALL.baseKnockback * scale;
      target.vy += (projectile.vy / length) * FIREBALL.baseKnockback * scale;
      sendTo(target, { type: 'combat', event: 'hit', ability: 'fireball', damage: FIREBALL.damage });
      consumed = true;
      break;
    }

    if (consumed || projectile.distance >= FIREBALL.maxDistance ||
        projectile.x < 0 || projectile.x > WORLD.width ||
        projectile.y < 0 || projectile.y > WORLD.height) {
      projectiles.delete(id);
    }
  }

  // Prototype respawn keeps network matches playable until the lava/elimination rules land.
  for (const player of players.values()) {
    if (player.health <= 0) {
      player.health = player.maxHealth;
      player.damagePoints = 0;
      player.x = 800 + (Math.random() - 0.5) * 260;
      player.y = 500 + (Math.random() - 0.5) * 180;
      player.vx = 0;
      player.vy = 0;
      sendTo(player, { type: 'combat', event: 'respawn' });
    }
  }

  sendSnapshot();
}, 1000 / TICK_RATE);

server.on('listening', () => console.log(`WLGame WebSocket server listening on :${PORT}`));
