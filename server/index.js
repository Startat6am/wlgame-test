import { WebSocketServer } from 'ws';
import { GameSimulation, GAME_CONFIG } from './game-simulation.js';
import { getSnapshotDeliveryDecision } from '../src/net/websocket-protocol.js';

const PORT = Number(process.env.PORT ?? 2567);
const server = new WebSocketServer({ port: PORT, maxPayload: 1024 });
const simulation = new GameSimulation();

server.on('connection', (socket) => {
  const player = simulation.addPlayer(socket);
  socket.send(JSON.stringify({ type: 'welcome', id: player.id }));

  socket.on('message', (raw) => simulation.handleMessage(player, raw));
  const removePlayer = () => simulation.removePlayer(player.id);
  socket.on('close', removePlayer);
  socket.on('error', removePlayer);
});

setInterval(() => {
  const combatEvents = simulation.step();
  for (const event of combatEvents) {
    const player = simulation.players.get(event.playerId);
    if (player?.socket.readyState === 1) {
      const { playerId, ...payload } = event;
      player.socket.send(JSON.stringify({ type: 'combat', ...payload }));
    }
  }

  const payload = JSON.stringify(simulation.createSnapshot());
  for (const client of server.clients) {
    if (client.readyState !== 1) continue;
    // Skip stale snapshots while the socket drains; disconnect clients that
    // remain critically backed up for two seconds (40 server ticks).
    const delivery = getSnapshotDeliveryDecision(client, client.bufferedAmount);
    if (delivery.disconnect) {
      client.close(1013, 'Slow consumer');
      continue;
    }
    if (delivery.skip) continue;
    client.send(payload);
  }
}, 1000 / GAME_CONFIG.tickRate);

server.on('listening', () => console.log(`WLGame WebSocket server listening on :${server.address().port}`));
