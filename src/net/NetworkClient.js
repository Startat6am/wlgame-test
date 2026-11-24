export class NetworkClient {
  constructor(onState, onStatus) {
    this.onState = onState;
    this.onStatus = onStatus;
    this.socket = null;
    this.connected = false;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.hostname}:2567`;
    try {
      this.socket = new WebSocket(url);
      this.socket.addEventListener('open', () => {
        this.connected = true;
        this.onStatus('Сервер подключён');
      });
      this.socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'snapshot') this.onState(message.players ?? []);
        } catch {
          // Ignore malformed packets; server state is never trusted blindly.
        }
      });
      this.socket.addEventListener('close', () => {
        this.connected = false;
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
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({
      type: 'input',
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y))
    }));
  }

  disconnect() {
    this.socket?.close();
  }
}