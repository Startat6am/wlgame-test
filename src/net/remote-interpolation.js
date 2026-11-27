export const REMOTE_INTERPOLATION_DELAY_MS = 100;
const MAX_SAMPLES = 8;

export function createRemoteInterpolationBuffer(maxSamples = MAX_SAMPLES) {
  if (!Number.isInteger(maxSamples) || maxSamples < 2) {
    throw new TypeError('maxSamples must be an integer greater than one');
  }
  return { maxSamples, samples: [] };
}

export function pushRemotePlayerSample(buffer, player, receivedAt) {
  if (!buffer || !Array.isArray(buffer.samples)) throw new TypeError('buffer is invalid');
  if (!player || typeof player.id !== 'string' ||
      !Number.isFinite(player.x) || !Number.isFinite(player.y) ||
      !Number.isFinite(receivedAt)) return false;

  const sample = {
    at: receivedAt,
    x: player.x,
    y: player.y,
    facingX: Number.isFinite(player.facingX) ? player.facingX : 0,
    facingY: Number.isFinite(player.facingY) ? player.facingY : 0
  };
  const samples = buffer.samples;
  const last = samples[samples.length - 1];

  if (last && receivedAt < last.at) return false;
  if (last && receivedAt === last.at) samples[samples.length - 1] = sample;
  else samples.push(sample);

  if (samples.length > buffer.maxSamples) {
    samples.splice(0, samples.length - buffer.maxSamples);
  }
  return true;
}

export function sampleRemotePlayer(buffer, renderAt) {
  if (!buffer || !Array.isArray(buffer.samples) || !buffer.samples.length ||
      !Number.isFinite(renderAt)) return null;

  const samples = buffer.samples;
  if (renderAt <= samples[0].at) return { ...samples[0] };
  const last = samples[samples.length - 1];
  if (renderAt >= last.at) return { ...last };

  for (let i = 1; i < samples.length; i += 1) {
    const next = samples[i];
    if (renderAt > next.at) continue;
    const previous = samples[i - 1];
    const span = next.at - previous.at;
    const t = span > 0 ? (renderAt - previous.at) / span : 1;
    return {
      at: renderAt,
      x: previous.x + (next.x - previous.x) * t,
      y: previous.y + (next.y - previous.y) * t,
      facingX: previous.facingX + (next.facingX - previous.facingX) * t,
      facingY: previous.facingY + (next.facingY - previous.facingY) * t
    };
  }
  return { ...last };
}
