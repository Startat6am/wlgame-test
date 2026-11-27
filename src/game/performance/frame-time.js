export function createFrameTimeHistory(capacity = 120) {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new TypeError('capacity must be a positive integer');
  }
  return {
    samples: new Float64Array(capacity),
    nextIndex: 0,
    count: 0
  };
}

export function recordFrameTime(history, deltaMs) {
  if (!history || !(history.samples instanceof Float64Array) ||
      !Number.isInteger(history.nextIndex) || !Number.isInteger(history.count)) {
    throw new TypeError('history must be a frame-time history');
  }
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new TypeError('deltaMs must be a finite non-negative number');
  }
  history.samples[history.nextIndex] = deltaMs;
  history.nextIndex = (history.nextIndex + 1) % history.samples.length;
  history.count = Math.min(history.count + 1, history.samples.length);
  return history;
}

export function getFrameTimeStats(history) {
  if (!history || !(history.samples instanceof Float64Array) ||
      !Number.isInteger(history.count) || history.count < 0 ||
      history.count > history.samples.length) {
    throw new TypeError('history must be a frame-time history');
  }
  if (history.count === 0) return null;

  const sorted = Array.from(history.samples.subarray(0, history.count)).sort((a, b) => a - b);
  const percentile = (p) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
  return {
    count: sorted.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: sorted[sorted.length - 1]
  };
}
