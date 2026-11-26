function parsePubSubFrame(frame, expectedChannel) {
  const line = frame.split('\n').find((value) => value.startsWith('data:'));
  if (!line) return null;
  const data = line.slice(5).trimStart();
  if (data.startsWith('subscribe,')) return { type: 'ready' };
  if (!data.startsWith('message,')) return null;
  const channelSeparator = data.indexOf(',', 8);
  if (channelSeparator < 0) return null;
  const channel = data.slice(8, channelSeparator);
  if (channel !== expectedChannel) return null;
  const rawPayload = data.slice(channelSeparator + 1);
  try {
    return { type: 'message', payload: JSON.parse(rawPayload) };
  } catch {
    return null;
  }
}

export class UpstashRedisRest {
  constructor({ url, token, fetchImpl = fetch }) {
    if (typeof url !== 'string' || !/^https:\/\//.test(url)) throw new TypeError('A valid HTTPS Redis REST URL is required');
    if (typeof token !== 'string' || !token) throw new TypeError('A Redis REST token is required');
    if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
    this.url = url.replace(/\/+$/, '');
    this.token = token;
    this.fetch = fetchImpl;
  }

  async command(args) {
    if (!Array.isArray(args) || args.length < 1 || args.some((arg) => arg === undefined || arg === null)) {
      throw new TypeError('Redis command must be a non-empty argument array');
    }
    const response = await this.fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });
    if (!response.ok) throw new Error(`Upstash Redis command failed with HTTP ${response.status}`);
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.result;
  }

  async publish(channel, message) {
    if (typeof channel !== 'string' || !channel) throw new TypeError('channel is required');
    const response = await this.fetch(`${this.url}/publish/${encodeURIComponent(channel)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'text/plain'
      },
      body: typeof message === 'string' ? message : JSON.stringify(message)
    });
    if (!response.ok) throw new Error(`Upstash Redis publish failed with HTTP ${response.status}`);
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.result;
  }

  async subscribe(channel, { signal, onMessage, onReady = () => {} } = {}) {
    if (typeof channel !== 'string' || !channel) throw new TypeError('channel is required');
    if (typeof onMessage !== 'function') throw new TypeError('onMessage must be a function');
    const response = await this.fetch(`${this.url}/subscribe/${encodeURIComponent(channel)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'text/event-stream'
      },
      signal
    });
    if (!response.ok || !response.body) {
      throw new Error(`Upstash Redis subscribe failed with HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, boundary).replace(/\r/g, '');
          buffer = buffer.slice(boundary + 2);
          const event = parsePubSubFrame(frame, channel);
          if (event?.type === 'ready') onReady();
          if (event?.type === 'message') onMessage(event.payload);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
