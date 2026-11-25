export function resolveWebSocketUrl(location, configuredUrl = '') {
  if (typeof configuredUrl === 'string' && configuredUrl.trim()) {
    let parsed;
    try {
      parsed = new URL(configuredUrl.trim());
    } catch {
      throw new TypeError('VITE_WS_SERVER_URL must be a valid WebSocket URL');
    }
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
      throw new TypeError('VITE_WS_SERVER_URL must use ws:// or wss://');
    }
    return parsed.toString();
  }

  if (!location || typeof location.hostname !== 'string' || typeof location.protocol !== 'string') {
    throw new TypeError('A browser location with protocol and hostname is required');
  }
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.hostname}:2567`;
}
