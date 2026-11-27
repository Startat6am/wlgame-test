const ACQUIRE_LEASE_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current then return nil end
local epoch = redis.call('INCR', KEYS[2])
local token = ARGV[1] .. ':' .. tostring(epoch)
redis.call('SET', KEYS[1], token, 'PX', ARGV[2])
return { token, epoch }
`;

const RENEW_LEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return 0
`;

const RELEASE_LEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

const COMMIT_TICK_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
redis.call('PUBLISH', KEYS[3], ARGV[4])
redis.call('XTRIM', KEYS[4], 'MINID', '~', ARGV[5])
return 1
`;

function validateRoomId(roomId) {
  if (typeof roomId !== 'string' || !/^[a-zA-Z0-9:_-]{1,64}$/.test(roomId)) {
    throw new TypeError('roomId must contain 1-64 safe identifier characters');
  }
}

export class RedisRoomCoordinator {
  constructor(redis, { prefix = 'wlgame', stateTtlSeconds = 120 } = {}) {
    if (!redis || typeof redis.command !== 'function' || typeof redis.publish !== 'function') {
      throw new TypeError('redis must provide command() and publish()');
    }
    if (typeof prefix !== 'string' || !/^[a-zA-Z0-9:_-]{1,32}$/.test(prefix)) {
      throw new TypeError('prefix must contain 1-32 safe identifier characters');
    }
    if (!Number.isInteger(stateTtlSeconds) || stateTtlSeconds < 10) {
      throw new TypeError('stateTtlSeconds must be an integer >= 10');
    }
    this.redis = redis;
    this.prefix = prefix;
    this.stateTtlSeconds = stateTtlSeconds;
  }

  keys(roomId) {
    validateRoomId(roomId);
    const base = `${this.prefix}:room:${roomId}`;
    return {
      lease: `${base}:lease`,
      epoch: `${base}:epoch`,
      state: `${base}:state`,
      channel: `${base}:snapshots`,
      inputStream: `${base}:inputs`
    };
  }

  async acquireLease(roomId, instanceId, ttlMs = 3000) {
    const keys = this.keys(roomId);
    if (typeof instanceId !== 'string' || !instanceId || instanceId.length > 128) {
      throw new TypeError('instanceId is required');
    }
    if (!Number.isInteger(ttlMs) || ttlMs < 500) throw new TypeError('ttlMs must be >= 500');
    const result = await this.redis.command([
      'EVAL', ACQUIRE_LEASE_SCRIPT, '2', keys.lease, keys.epoch, instanceId, String(ttlMs)
    ]);
    if (!Array.isArray(result) || result.length !== 2) return null;
    return { token: String(result[0]), epoch: Number(result[1]) };
  }

  async renewLease(roomId, token, ttlMs = 3000) {
    const keys = this.keys(roomId);
    const result = await this.redis.command([
      'EVAL', RENEW_LEASE_SCRIPT, '1', keys.lease, token, String(ttlMs)
    ]);
    return result === 1;
  }

  async releaseLease(roomId, token) {
    const keys = this.keys(roomId);
    const result = await this.redis.command([
      'EVAL', RELEASE_LEASE_SCRIPT, '1', keys.lease, token
    ]);
    return result === 1;
  }

  async loadState(roomId) {
    const keys = this.keys(roomId);
    const raw = await this.redis.command(['GET', keys.state]);
    if (raw === null || raw === undefined) return null;
    const state = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!state || state.version !== 1 || !Array.isArray(state.players) || !Array.isArray(state.projectiles)) {
      throw new TypeError('stored room state has an unsupported shape');
    }
    return state;
  }

  async appendEvent(roomId, event) {
    const keys = this.keys(roomId);
    return this.redis.command([
      'XADD', keys.inputStream, '*', 'event', JSON.stringify(event)
    ]);
  }

  async readEvents(roomId, lastEventId = '0-0', count = 100) {
    const keys = this.keys(roomId);
    if (typeof lastEventId !== 'string' || !/^\d+-\d+$/.test(lastEventId)) {
      throw new TypeError('lastEventId must be a Redis stream ID');
    }
    if (!Number.isInteger(count) || count < 1 || count > 500) {
      throw new TypeError('count must be an integer between 1 and 500');
    }
    const result = await this.redis.command([
      'XREAD', 'COUNT', String(count), 'STREAMS', keys.inputStream, lastEventId
    ]);
    const entries = Array.isArray(result?.[0]?.[1]) ? result[0][1] : [];
    return entries.map(([id, fields]) => {
      if (typeof id !== 'string' || !Array.isArray(fields)) return null;
      const eventIndex = fields.indexOf('event');
      if (eventIndex < 0 || typeof fields[eventIndex + 1] !== 'string') return null;
      try {
        return { id, event: JSON.parse(fields[eventIndex + 1]) };
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  async commitTick(roomId, token, state, event) {
    const keys = this.keys(roomId);
    const result = await this.redis.command([
      'EVAL', COMMIT_TICK_SCRIPT, '4',
      keys.lease, keys.state, keys.channel, keys.inputStream,
      token, JSON.stringify(state), String(this.stateTtlSeconds), JSON.stringify(event), state.lastEventId || '0-0'
    ]);
    return result === 1;
  }

  async publishInput(roomId, event) {
    return this.appendEvent(roomId, event);
  }
}

export const REDIS_ROOM_LEASE_TTL_MS = 3000;
export const REDIS_ROOM_STATE_TTL_SECONDS = 120;
