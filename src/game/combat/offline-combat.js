import { applyDamage, calculateKnockback, resolveCircleAgainstArena } from './combat-math.js';

export const TRAINING_TARGET = Object.freeze({
  x: 800,
  y: 300,
  radius: 18,
  maxHealth: 100,
  respawnDelayMs: 1800,
  knockback: 130
});

export function createTrainingTarget() {
  return {
    x: TRAINING_TARGET.x,
    y: TRAINING_TARGET.y,
    vx: 0,
    vy: 0,
    radius: TRAINING_TARGET.radius,
    health: TRAINING_TARGET.maxHealth,
    maxHealth: TRAINING_TARGET.maxHealth,
    damagePoints: 0,
    alive: true,
    respawnAt: null
  };
}

export function hitTrainingTarget(target, damage, directionX, directionY, nowMs) {
  if (!target?.alive) return { target, dealt: 0, killed: false };
  if (![directionX, directionY, nowMs].every(Number.isFinite)) {
    throw new TypeError('direction and time must be finite numbers');
  }
  const length = Math.hypot(directionX, directionY);
  if (length === 0) throw new TypeError('hit direction must be non-zero');

  const updated = applyDamage(target, damage);
  const impulse = calculateKnockback({
    baseKnockback: TRAINING_TARGET.knockback,
    damagePoints: updated.damagePoints
  });
  const killed = !updated.alive;
  return {
    target: {
      ...target,
      ...updated,
      vx: target.vx + directionX / length * impulse,
      vy: target.vy + directionY / length * impulse,
      respawnAt: killed ? nowMs + TRAINING_TARGET.respawnDelayMs : null
    },
    dealt: target.health - updated.health,
    killed
  };
}

export function updateTrainingTarget(target, deltaMs, nowMs, world, obstacles = []) {
  if (!Number.isFinite(deltaMs) || deltaMs < 0 || !Number.isFinite(nowMs)) {
    throw new TypeError('deltaMs and nowMs must be finite and non-negative');
  }
  if (!target.alive) {
    if (nowMs < target.respawnAt) return target;
    return createTrainingTarget();
  }

  const dt = Math.min(deltaMs, 100) / 1000;
  const damping = Math.pow(0.12, dt);
  const resolved = resolveCircleAgainstArena(
    target.x + target.vx * dt, target.y + target.vy * dt, target.radius, world, obstacles
  );
  const { x, y } = resolved;
  return { ...target, x, y, vx: target.vx * damping, vy: target.vy * damping };
}
