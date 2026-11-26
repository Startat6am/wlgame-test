export function getReconnectDelay(attempt, random = Math.random) {
  if (!Number.isInteger(attempt) || attempt < 0) throw new TypeError('attempt must be a non-negative integer');
  if (typeof random !== 'function') throw new TypeError('random must be a function');
  const jitter = Math.max(0, Math.min(1, Number(random()) || 0));
  const base = Math.min(1000 * (2 ** Math.min(attempt, 10)), 15000);
  return Math.round(base * (0.8 + jitter * 0.4));
}
