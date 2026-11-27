import { resolveWebSocketUrl } from './websocket-url.js';
import { getReconnectDelay } from './reconnect.js';

export class NetworkClient {
  constructor(onState, onStatus, onWelcome, onCombat) {
    this.onState = onState;
    this.onStatus = onStatus;
    this.onWelcome = onWelcome;
    this.onCombat = onCombat;
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.intentionalClose = false;
  }

  connect() {
    this.intentionalClose = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)) return;
    this.clearReconnectTimer();

    const configuredUrl = import.meta.env.VITE_WS_SERVER_URL;
    if (window.location.protocol === 'https:' && !configuredUrl?.trim()) {
      this.onStatus('Локальная игра');
      return;
    }

    let url;
    try {
      url = resolveWebSocketUrl(window.location, configuredUrl);
    } catch {
      this.onStatus('Локальная игра');
      return;
    }

    this.onStatus(this.reconnectAttempts > 0 ? 'Переподключение…' : 'Подключение…');
    try {
      const socket = new WebSocket(url);
      this.socket = socket;
      socket.addEventListener('open', () => {
        if (this.socket !== socket) return;
        this.connected = true;
        this.reconnectAttempts = 0;
        this.onStatus('Сервер подключён');
      });
      socket.addEventListener('message', (event) => {
        if (this.socket !== socket) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'welcome' && typeof message.id === 'string') {
            this.playerId = message.id;
            this.onWelcome?.(message.id);
          }
          if (message.type === 'snapshot') this.onState(message);
          if (message.type === 'combat') this.onCombat?.(message);
        } catch {
          // Ignore malformed packets; server remains authoritative.
        }
      });
      socket.addEventListener('close', () => {
        if (this.socket !== socket) return;
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        if (this.intentionalClose) {
          this.onStatus('Локальная игра');
          return;
        }
        this.scheduleReconnect();
      });
      socket.addEventListener('error', () => {
        if (this.socket !== socket) return;
        this.connected = false;
        this.onStatus('Связь потеряна');
        // The close event schedules the retry for both network and duration-limit disconnects.
      });
    } catch {
      this.socket = null;
      this.connected = false;
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.intentionalClose || this.reconnectTimer !== null) return;
    const delay = getReconnectDelay(this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.onStatus('Переподключение…');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  sendInput(x, y) {
    this.send({ type: 'input', x, y });
  }

  castFireball(angle, originX, originY) {
    this.send({ type: 'cast', ability: 'fireball', angle, originX, originY });
  }

  send(message) {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  disconnect() {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    const socket = this.socket;
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.onStatus('Локальная игра');
    socket?.close();
  }
}