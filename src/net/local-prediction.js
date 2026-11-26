const MAX_PREDICTION_DELTA_MS = 50;
const DEFAULT_CORRECTION_TIME_MS = 100;

export function createLocalPredictionState() {
  return {
    initialized: false,
    correctionX: 0,
    correctionY: 0
  };
}

export function reconcileLocalPrediction(state, predicted, authoritative) {
  if (!state || typeof state !== 'object' ||
      !predicted || !authoritative ||
      !Number.isFinite(predicted.x) || !Number.isFinite(predicted.y) ||
      !Number.isFinite(authoritative.x) || !Number.isFinite(authoritative.y)) {
    return null;
  }

  if (!state.initialized) {
    state.initialized = true;
    state.correctionX = 0;
    state.correctionY = 0;
    return { x: authoritative.x, y: authoritative.y };
  }

  state.correctionX = authoritative.x - predicted.x;
  state.correctionY = authoritative.y - predicted.y;
  return null;
}

export function stepLocalPrediction(
  state,
  position,
  direction,
  deltaMs,
  { speed, world, obstacles, radius = 15, correctionTimeMs = DEFAULT_CORRECTION_TIME_MS },
  resolvePosition
) {
  if (!state || typeof state !== 'object' ||
      !position || !direction || !world || !Array.isArray(obstacles) ||
      typeof resolvePosition !== 'function' ||
      ![position.x, position.y, direction.x, direction.y, deltaMs, speed, radius, correctionTimeMs]
        .every(Number.isFinite) ||
      deltaMs < 0 || speed < 0 || radius < 0 || correctionTimeMs <= 0) {
    throw new TypeError('invalid local prediction arguments');
  }

  const elapsed = Math.min(deltaMs, MAX_PREDICTION_DELTA_MS);
  const directionLength = Math.hypot(direction.x, direction.y);
  const scale = directionLength > 1 ? 1 / directionLength : 1;
  const predicted = resolvePosition(
    position.x + direction.x * scale * speed * elapsed / 1000,
    position.y + direction.y * scale * speed * elapsed / 1000,
    radius,
    world,
    obstacles
  );

  const blend = 1 - Math.exp(-elapsed / correctionTimeMs);
  const corrected = resolvePosition(
    predicted.x + state.correctionX * blend,
    predicted.y + state.correctionY * blend,
    radius,
    world,
    obstacles
  );
  state.correctionX *= 1 - blend;
  state.correctionY *= 1 - blend;
  return corrected;
}
