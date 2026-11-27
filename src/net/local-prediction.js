const MAX_PREDICTION_DELTA_MS = 50;
const DEFAULT_CORRECTION_TIME_MS = 350;
const MAX_IDLE_CORRECTION_DISTANCE = 3;

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

  // Keep the newest server error as a pending correction. Applying it while
  // the player is actively moving makes 20 Hz snapshots fight render-frame
  // prediction and produces visible micro-teleports.
  const correctionX = authoritative.x - predicted.x;
  const correctionY = authoritative.y - predicted.y;
  // Large differences are stale movement snapshots, not harmless drift.
  // Applying them after release visibly pulls the hero back to an old position.
  if (Math.hypot(correctionX, correctionY) <= MAX_IDLE_CORRECTION_DISTANCE) {
    state.correctionX = correctionX;
    state.correctionY = correctionY;
  } else {
    state.correctionX = 0;
    state.correctionY = 0;
  }
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

  // Never steer the locally controlled character toward delayed server
  // snapshots while the movement stick/keys are held. Reconcile only after
  // input is released, using a deliberately slow, collision-safe blend.
  if (directionLength <= 0.001) {
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

  return predicted;
}
