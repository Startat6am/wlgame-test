import { randomUUID } from 'node:crypto';
import { resolveCircleAgainstArena, segmentIntersectsCircle } from '../src/game/combat/combat-math.js';
import { ARENA_OBSTACLES } from '../src/game/data/arena.js';
import { parseClientMessage } from '../src/net/websocket-protocol.js';

export const GAME_CONFIG = Object.freeze({
  tickRate: 20,
  world: Object.freeze({ width: 1600, height: 1000 }),
  speed: 230,
  fireball: Object.freeze({
    damage: 8, cooldownMs: 1400, speed: 520, radius: 9,
    maxDistance: 520, baseKnockback: 130
  }),
  playerRadius: 15
});

const OBSTACLES = ARENA_OBSTACLES;

export class GameSimulation {
  constructor({ now = () => Date.now(), random = Math.random, createId = randomUUID } = {}) {
    this.now = now;
    this.random = random;
    this.createId = createId;
    this.players = new Map();
    this.projectiles = new Map();
  }

  addPlayer(socket) {
    const id = this.createId();
    const player = {
      id, socket,
      x: 800 + (this.random() - 0.5) * 260,
      y: 500 + (this.random() - 0.5) * 180,
      inputX: 0, inputY: 0,
      facingX: 0, facingY: -1,
      vx: 0, vy: 0,
      health: 100, maxHealth: 100, damagePoints: 0,
      lastFireballAt: -Infinity,
      inputRate: {}, castRate: {}
    };
    this.players.set(id, player);
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
    for (const [projectileId, projectile] of this.projectiles) {
      if (projectile.ownerId === id) this.projectiles.delete(projectileId);
    }
  }

  handleMessage(player, raw, now = this.now()) {
    if (!player || this.players.get(player.id) !== player) return false;
    const message = parseClientMessage(raw, player, now);
    if (!message) return false;

    if (message.type === 'input') {
      player.inputX = message.x;
      player.inputY = message.y;
      if (Math.hypot(player.inputX, player.inputY) > 0.001) {
        player.facingX = player.inputX;
        player.facingY = player.inputY;
      }
      return true;
    }

    if (message.type === 'cast' && message.ability === 'fireball') {
      if (now - player.lastFireballAt < GAME_CONFIG.fireball.cooldownMs) return false;
      player.lastFireballAt = now;
      const directionX = Math.cos(message.angle);
      const directionY = Math.sin(message.angle);
      const projectileId = this.createId();
      this.projectiles.set(projectileId, {
        id: projectileId, ownerId: player.id,
        x: player.x + directionX * 24, y: player.y + directionY * 24,
        vx: directionX * GAME_CONFIG.fireball.speed,
        vy: directionY * GAME_CONFIG.fireball.speed,
        distance: 0, hitIds: new Set()
      });
      return true;
    }
    return false;
  }

  step(now = this.now()) {
    const dt = 1 / GAME_CONFIG.tickRate;
    const { world, speed, playerRadius, fireball } = GAME_CONFIG;
    const combatEvents = [];

    for (const player of this.players.values()) {
      const resolved = resolveCircleAgainstArena(
        player.x + player.inputX * speed * dt + player.vx * dt,
        player.y + player.inputY * speed * dt + player.vy * dt,
        playerRadius, world, OBSTACLES
      );
      player.x = resolved.x;
      player.y = resolved.y;
      player.vx *= 0.88;
      player.vy *= 0.88;
    }

    for (const [id, projectile] of this.projectiles) {
      const stepX = projectile.vx * dt;
      const stepY = projectile.vy * dt;
      projectile.x += stepX;
      projectile.y += stepY;
      projectile.distance += Math.hypot(stepX, stepY);

      let consumed = OBSTACLES.some((obstacle) =>
        segmentIntersectsCircle(
          projectile.x - stepX, projectile.y - stepY,
          projectile.x, projectile.y,
          obstacle.x, obstacle.y, obstacle.radius + fireball.radius
        )
      );
      for (const target of this.players.values()) {
        if (consumed) break;
        if (target.id === projectile.ownerId || projectile.hitIds.has(target.id)) continue;
        const dx = target.x - projectile.x;
        const dy = target.y - projectile.y;
        if (dx * dx + dy * dy > 25 * 25) continue;

        projectile.hitIds.add(target.id);
        target.health = Math.max(0, target.health - fireball.damage);
        target.damagePoints += fireball.damage;
        const length = Math.hypot(projectile.vx, projectile.vy) || 1;
        const scale = 1 + target.damagePoints * 0.012;
        target.vx += (projectile.vx / length) * fireball.baseKnockback * scale;
        target.vy += (projectile.vy / length) * fireball.baseKnockback * scale;
        combatEvents.push({ playerId: target.id, event: 'hit', ability: 'fireball', damage: fireball.damage });
        consumed = true;
      }

      if (consumed || projectile.distance >= fireball.maxDistance ||
          projectile.x < 0 || projectile.x > world.width ||
          projectile.y < 0 || projectile.y > world.height) {
        this.projectiles.delete(id);
      }
    }

    // Prototype respawn keeps network matches playable until elimination rules land.
    for (const player of this.players.values()) {
      if (player.health <= 0) {
        player.health = player.maxHealth;
        player.damagePoints = 0;
        player.x = 800 + (this.random() - 0.5) * 260;
        player.y = 500 + (this.random() - 0.5) * 180;
        player.vx = 0;
        player.vy = 0;
        combatEvents.push({ playerId: player.id, event: 'respawn' });
      }
    }

    return combatEvents;
  }

  createSnapshot() {
    return {
      type: 'snapshot',
      players: [...this.players.values()].map(({ id, x, y, health, maxHealth, damagePoints, facingX, facingY }) => ({
        id, x, y, health, maxHealth, damagePoints, facingX, facingY
      })),
      projectiles: [...this.projectiles.values()].map(({ id, x, y }) => ({ id, x, y }))
    };
  }
}
