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
