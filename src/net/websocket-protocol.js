import { consumeRateLimit } from './rate-limit.js';

const MAX_MESSAGE_BYTES = 1024;

export function parseClientMessage(raw, player, now) {
  if (!player || !Number.isFinite(now)) return null;
  const byteLength = typeof raw === 'string' ? Buffer.byteLength(raw) : raw?.length;
  if (!Number.isInteger(byteLength) || byteLength > MAX_MESSAGE_BYTES) return null;

  let message;
  try {
    message = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
  } catch {
    return null;
  }
  if (!message || typeof message !== 'object' || Array.isArray(message)) return null;

  if (message.type === 'input') {
    if (!consumeRateLimit(player.inputRate, now, 30, 1000)) return null;
    const x = Number(message.x);
    const y = Number(message.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    let inputX = Math.max(-1, Math.min(1, x));
    let inputY = Math.max(-1, Math.min(1, y));
    const length = Math.hypot(inputX, inputY);
    if (length > 1) {
      inputX /= length;
      inputY /= length;
    }
    return { type: 'input', x: inputX, y: inputY };
  }

  if (message.type === 'cast' && message.ability === 'fireball') {
    if (!consumeRateLimit(player.castRate, now, 3, 1000)) return null;
    const angle = Number(message.angle);
    if (!Number.isFinite(angle)) return null;
    return { type: 'cast', ability: 'fireball', angle };
  }

  return null;
}

export const SNAPSHOT_SKIP_BYTES = 64 * 1024;
export const SLOW_CLIENT_DISCONNECT_BYTES = 256 * 1024;
export const SLOW_CLIENT_MAX_TICKS = 40;

export function getSnapshotDeliveryDecision(state, bufferedAmount) {
  if (!state || typeof state !== 'object') throw new TypeError('state must be an object');
  if (!Number.isFinite(bufferedAmount) || bufferedAmount < 0) {
    throw new TypeError('bufferedAmount must be a non-negative finite number');
  }

  if (bufferedAmount > SLOW_CLIENT_DISCONNECT_BYTES) {
    state.slowSnapshotTicks = Number.isInteger(state.slowSnapshotTicks) && state.slowSnapshotTicks >= 0
      ? state.slowSnapshotTicks + 1
      : 1;
    return {
      skip: true,
      disconnect: state.slowSnapshotTicks >= SLOW_CLIENT_MAX_TICKS,
      consecutiveSlowTicks: state.slowSnapshotTicks
    };
  }

  state.slowSnapshotTicks = 0;
  return {
    skip: bufferedAmount > SNAPSHOT_SKIP_BYTES,
    disconnect: false,
    consecutiveSlowTicks: 0
  };
}
