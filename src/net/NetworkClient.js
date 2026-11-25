import { resolveWebSocketUrl } from './websocket-url.js';

export class NetworkClient {
  constructor(onState, onStatus, onWelcome, onCombat) {
    this.onState = onState;
    this.onStatus = onStatus;
    this.onWelcome = onWelcome;
    this.onCombat = onCombat;
    this.socket = null;
    this.connected = false;
    this.playerId = null;
  }

  connect() {
    let url;
    try {
      url = resolveWebSocketUrl(window.location, import.meta.env.VITE_WS_SERVER_URL);
    } catch {
      this.onStatus('Локальная игра');
      return;
    }
    try {
      this.socket = new WebSocket(url);
      this.socket.addEventListener('open', () => {
        this.connected = true;
        this.onStatus('Сервер подключён');
      });
      this.socket.addEventListener('message', (event) => {
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
      this.socket.addEventListener('close', () => {
        this.connected = false;
        this.playerId = null;
        this.onStatus('Локальная игра');
      });
      this.socket.addEventListener('error', () => {
        this.connected = false;
        this.onStatus('Локальная игра');
      });
    } catch {
      this.onStatus('Локальная игра');
    }
  }

  sendInput(x, y) {
    this.send({ type: 'input', x, y });
  }

  castFireball(angle) {
    this.send({ type: 'cast', ability: 'fireball', angle });
  }

  send(message) {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  disconnect() {
    this.socket?.close();
  }
}