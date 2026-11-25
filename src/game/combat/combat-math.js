const DEFAULT_DAMAGE_POINT_SCALE = 0.012;

function nonNegativeFinite(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a finite non-negative number`);
  }
  return value;
}

export function applyDamage(combatant, amount) {
  if (!combatant || typeof combatant !== 'object') {
    throw new TypeError('combatant must be an object');
  }
  nonNegativeFinite(combatant.health, 'combatant.health');
  nonNegativeFinite(combatant.damagePoints ?? 0, 'combatant.damagePoints');
  nonNegativeFinite(amount, 'amount');

  const dealt = Math.min(combatant.health, amount);
  return {
    ...combatant,
    health: Math.max(0, combatant.health - dealt),
    damagePoints: (combatant.damagePoints ?? 0) + dealt,
    alive: combatant.health - dealt > 0
  };
}

export function calculateKnockback({
  baseKnockback,
  abilityMultiplier = 1,
  damagePoints = 0,
  damagePointScale = DEFAULT_DAMAGE_POINT_SCALE
}) {
  nonNegativeFinite(baseKnockback, 'baseKnockback');
  nonNegativeFinite(abilityMultiplier, 'abilityMultiplier');
  nonNegativeFinite(damagePoints, 'damagePoints');
  nonNegativeFinite(damagePointScale, 'damagePointScale');

  return baseKnockback * abilityMultiplier * (1 + damagePoints * damagePointScale);
}

export function calculateLavaDamage(damagePerSecond, elapsedMs) {
  nonNegativeFinite(damagePerSecond, 'damagePerSecond');
  nonNegativeFinite(elapsedMs, 'elapsedMs');
  return damagePerSecond * (elapsedMs / 1000);
}

export function isCooldownReady(nowMs, lastCastMs, cooldownSeconds) {
  nonNegativeFinite(nowMs, 'nowMs');
  nonNegativeFinite(lastCastMs, 'lastCastMs');
  nonNegativeFinite(cooldownSeconds, 'cooldownSeconds');
  return nowMs - lastCastMs >= cooldownSeconds * 1000;
}


export function segmentIntersectsCircle(startX, startY, endX, endY, centerX, centerY, radius) {
  for (const [value, name] of [
    [startX, 'startX'], [startY, 'startY'], [endX, 'endX'], [endY, 'endY'],
    [centerX, 'centerX'], [centerY, 'centerY']
  ]) {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  }
  nonNegativeFinite(radius, 'radius');

  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((centerX - startX) * dx + (centerY - startY) * dy) / lengthSquared));
  const closestX = startX + projection * dx;
  const closestY = startY + projection * dy;
  const offsetX = centerX - closestX;
  const offsetY = centerY - closestY;
  return offsetX * offsetX + offsetY * offsetY <= radius * radius;
}


export function resolveCircleCollision(x, y, movingRadius, centerX, centerY, obstacleRadius) {
  for (const [value, name] of [
    [x, 'x'], [y, 'y'], [centerX, 'centerX'], [centerY, 'centerY']
  ]) {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  }
  nonNegativeFinite(movingRadius, 'movingRadius');
  nonNegativeFinite(obstacleRadius, 'obstacleRadius');

  const dx = x - centerX;
  const dy = y - centerY;
  const minimumDistance = movingRadius + obstacleRadius;
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared >= minimumDistance * minimumDistance) {
    return { x, y, collided: false };
  }

  const distance = Math.sqrt(distanceSquared);
  const normalX = distance > 0 ? dx / distance : 1;
  const normalY = distance > 0 ? dy / distance : 0;
  return {
    x: centerX + normalX * minimumDistance,
    y: centerY + normalY * minimumDistance,
    collided: true
  };
}
