import { randomUUID } from 'node:crypto';
import { GameSimulation, GAME_CONFIG } from './game-simulation.js';
import { getSnapshotDeliveryDecision } from '../src/net/websocket-protocol.js';
import {
  REDIS_ROOM_LEASE_TTL_MS,
  RedisRoomCoordinator
} from './redis-room-coordinator.js';

const INSTANCE_RETRY_MS = 500;
const LEASE_RENEW_MS = 1000;
const MAX_EVENTS_PER_TICK = 100;

export class VercelRoomRuntime {
  constructor({
    redis,
    coordinator = new RedisRoomCoordinator(redis),
    roomId = 'default',
    instanceId = randomUUID(),
    simulation = new GameSimulation(),
    now = () => Date.now(),
    setIntervalImpl = setInterval,
    clearIntervalImpl = clearInterval,
    onError = () => {}
  }) {
    if (!redis || typeof redis.subscribe !== 'function') throw new TypeError('redis.subscribe is required');
    if (!coordinator || typeof coordinator.acquireLease !== 'function') throw new TypeError('coordinator is required');
    if (typeof roomId !== 'string' || !roomId) throw new TypeError('roomId is required');
    this.redis = redis;
    this.coordinator = coordinator;
    this.roomId = roomId;
    this.instanceId = instanceId;
    this.simulation = simulation;
    this.now = now;
    this.setIntervalImpl = setIntervalImpl;
    this.clearIntervalImpl = clearIntervalImpl;
    this.onError = onError;
    this.localSockets = new Map();
    this.leaseToken = null;
    this.leaseEpoch = 0;
    this.lastLeaseRenewAt = 0;
    this.nextLeaseAttemptAt = 0;
    this.lastEventId = '0-0';
    this.highestSnapshotEpoch = 0;
    this.ticking = false;
    this.started = false;
    this.stopping = false;
    this.timer = null;
    this.subscriptionAbort = null;
    this.subscriptionTask = null;
    this.subscriptionReady = null;
  }

  async start() {
    if (this.started) return this.subscriptionReady;
    this.started = true;
    this.stopping = false;
    try {
      await this.connectSubscription();
    } catch (error) {
      this.started = false;
      throw error;
    }
    this.timer = this.setIntervalImpl(() => {
      this.tickOnce().catch((error) => this.onError(error));
    }, 1000 / GAME_CONFIG.tickRate);
  }

  async connectSubscription() {
    let resolveReady;
    let rejectReady;
    let ready = false;
    this.subscriptionReady = new Promise((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    this.subscriptionTask = (async () => {
      while (!this.stopping) {
        const controller = new AbortController();
        this.subscriptionAbort = controller;
        try {
          await this.redis.subscribe(this.coordinator.keys(this.roomId).channel, {
            signal: controller.signal,
            onReady: () => {
              ready = true;
              resolveReady();
            },
            onMessage: (event) => this.handlePublishedEvent(event)
          });
          if (!this.stopping) throw new Error('Redis snapshot subscription ended unexpectedly');
        } catch (error) {
          if (this.stopping) break;
          this.onError(error);
          if (!ready) {
            rejectReady(error);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    })();
    await this.subscriptionReady;
  }

  async attach(socket) {
    const playerId = randomUUID();
    const local = { socket, backpressure: {} };
    this.localSockets.set(playerId, local);
    let joined = false;
    let left = false;
    let eventChain = Promise.resolve();

    socket.on('message', (raw) => {
      eventChain = eventChain.then(() => this.coordinator.appendEvent(this.roomId, {
        type: 'input',
        playerId,
        raw: raw.toString(),
        receivedAt: this.now()
      })).catch((error) => this.onError(error));
    });

    const leave = () => {
      if (left) return;
      left = true;
      this.localSockets.delete(playerId);
      if (!joined) return;
      eventChain = eventChain.then(() => this.coordinator.appendEvent(this.roomId, {
        type: 'leave', playerId, receivedAt: this.now()
      })).catch((error) => this.onError(error));
    };
    socket.on('close', leave);
    socket.on('error', leave);

    try {
      await this.start();
      eventChain = eventChain.then(() => this.coordinator.appendEvent(this.roomId, {
        type: 'join', playerId, receivedAt: this.now()
      }));
      await eventChain;
      joined = true;
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'welcome', id: playerId }));
      } else {
        leave();
      }
    } catch (error) {
      this.localSockets.delete(playerId);
      socket.close(1011, 'Realtime backend unavailable');
      throw error;
    }
    return playerId;
  }

  handlePublishedEvent(event) {
    if (!event || event.type !== 'tick' || !Number.isInteger(event.epoch)) return;
    if (event.epoch < this.highestSnapshotEpoch) return;
    if (event.instanceId === this.instanceId) return;
    this.highestSnapshotEpoch = event.epoch;
    this.broadcastTick(event);
  }

  broadcastTick(event) {
    const payload = JSON.stringify(event.snapshot);
    for (const [playerId, local] of this.localSockets) {
      const socket = local.socket;
      if (socket.readyState !== 1) continue;
      const delivery = getSnapshotDeliveryDecision(local.backpressure, socket.bufferedAmount);
      if (delivery.disconnect) {
        socket.close(1013, 'Slow consumer');
        continue;
      }
      if (delivery.skip) continue;
      socket.send(payload);
      for (const combat of event.combatEvents || []) {
        if (combat.playerId !== playerId) continue;
        const { playerId: ignored, ...message } = combat;
        socket.send(JSON.stringify({ type: 'combat', ...message }));
      }
    }
  }

  applyInputEvent(event) {
    if (event.type === 'join') {
      if (!this.simulation.players.has(event.playerId)) this.simulation.addPlayer(null, event.playerId);
      return;
    }
    if (event.type === 'leave') {
      this.simulation.removePlayer(event.playerId);
      return;
    }
    if (event.type === 'input') {
      const player = this.simulation.players.get(event.playerId);
      if (player) this.simulation.handleMessage(player, event.raw, Number.isFinite(event.receivedAt) ? event.receivedAt : this.now());
    }
  }

  async tickOnce() {
    if (this.ticking || this.stopping) return false;
    this.ticking = true;
    const now = this.now();
    try {
      if (!this.leaseToken) {
        if (now < this.nextLeaseAttemptAt) return false;
        this.nextLeaseAttemptAt = now + INSTANCE_RETRY_MS;
        const lease = await this.coordinator.acquireLease(this.roomId, this.instanceId, REDIS_ROOM_LEASE_TTL_MS);
        if (!lease) return false;
        this.leaseToken = lease.token;
        this.leaseEpoch = lease.epoch;
        this.lastLeaseRenewAt = now;
        const recovered = await this.coordinator.loadState(this.roomId);
        if (recovered) {
          this.simulation.restoreState(recovered);
          this.lastEventId = recovered.lastEventId || '0-0';
        } else {
          this.simulation = new GameSimulation({ now: this.now });
          this.lastEventId = '0-0';
        }
        this.highestSnapshotEpoch = Math.max(this.highestSnapshotEpoch, this.leaseEpoch);
      } else if (now - this.lastLeaseRenewAt >= LEASE_RENEW_MS) {
        const renewed = await this.coordinator.renewLease(
          this.roomId, this.leaseToken, REDIS_ROOM_LEASE_TTL_MS
        );
        if (!renewed) {
          this.leaseToken = null;
          this.nextLeaseAttemptAt = now + INSTANCE_RETRY_MS;
          return false;
        }
        this.lastLeaseRenewAt = now;
      }

      const entries = await this.coordinator.readEvents(this.roomId, this.lastEventId, MAX_EVENTS_PER_TICK);
      for (const entry of entries) {
        this.applyInputEvent(entry.event);
        this.lastEventId = entry.id;
      }

      const combatEvents = this.simulation.step(now);
      const event = {
        type: 'tick',
        instanceId: this.instanceId,
        epoch: this.leaseEpoch,
        snapshot: this.simulation.createSnapshot(),
        combatEvents
      };
      const state = { ...this.simulation.serializeState(), lastEventId: this.lastEventId };
      const committed = await this.coordinator.commitTick(this.roomId, this.leaseToken, state, event);
      if (!committed) {
        this.leaseToken = null;
        this.nextLeaseAttemptAt = now + INSTANCE_RETRY_MS;
        return false;
      }
      this.highestSnapshotEpoch = Math.max(this.highestSnapshotEpoch, this.leaseEpoch);
      this.broadcastTick(event);
      return true;
    } catch (error) {
      this.onError(error);
      this.leaseToken = null;
      this.nextLeaseAttemptAt = now + INSTANCE_RETRY_MS;
      return false;
    } finally {
      this.ticking = false;
    }
  }

  async stop() {
    this.stopping = true;
    if (this.timer !== null) {
      this.clearIntervalImpl(this.timer);
      this.timer = null;
    }
    this.subscriptionAbort?.abort();
    if (this.leaseToken) {
      await this.coordinator.releaseLease(this.roomId, this.leaseToken).catch((error) => this.onError(error));
      this.leaseToken = null;
    }
    this.started = false;
  }
}
