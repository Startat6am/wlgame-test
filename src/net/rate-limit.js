/** Fixed-window limiter with caller-owned state for deterministic tests. */
export function consumeRateLimit(state, now, limit, windowMs) {
  if (!state || typeof state !== 'object') throw new TypeError('state must be an object');
  if (!Number.isFinite(now) || now < 0) throw new TypeError('now must be a non-negative finite number');
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError('limit must be a positive integer');
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new TypeError('windowMs must be positive');

  if (!Number.isFinite(state.windowStartedAt) || now - state.windowStartedAt >= windowMs || now < state.windowStartedAt) {
    state.windowStartedAt = now;
    state.count = 0;
  }
  if (!Number.isInteger(state.count) || state.count < 0) state.count = 0;
  if (state.count >= limit) return false;
  state.count += 1;
  return true;
}
