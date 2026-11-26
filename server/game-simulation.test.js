import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSimulation, GAME_CONFIG } from './game-simulation.js';

function createSimulation() {
  let id = 0;
  return new GameSimulation({
    random: () => 0.5,
    createId: () => `player-${++id}`,
    now: () => 1000
  });
}

test('simulation owns player state and advances normalized input at the fixed tick rate', () => {
  const simulation = createSimulation();
  const player = simulation.addPlayer({ readyState: 1 });
  assert.equal(player.x, 800);
  assert.equal(player.y, 500);

  assert.equal(simulation.handleMessage(player, JSON.stringify({ type: 'input', x: 1, y: 0 }), 1000), true);
  simulation.step(1050);
  assert.equal(player.x, 800 + GAME_CONFIG.speed / GAME_CONFIG.tickRate);
  assert.equal(player.y, 500);

  const snapshot = simulation.createSnapshot();
  assert.deepEqual(snapshot.players[0], {
    id: 'player-1', x: player.x, y: player.y,
    health: 100, maxHealth: 100, damagePoints: 0, facingX: 1, facingY: 0
  });
  assert.equal('socket' in snapshot.players[0], false);
});

test('simulation validates casts, applies cooldown, and removes owned projectiles on disconnect', () => {
  const simulation = createSimulation();
  const player = simulation.addPlayer({ readyState: 1 });
  const cast = JSON.stringify({ type: 'cast', ability: 'fireball', angle: 0 });

  assert.equal(simulation.handleMessage(player, cast, 1000), true);
  assert.equal(simulation.projectiles.size, 1);
  assert.equal(simulation.handleMessage(player, cast, 1100), false);
  assert.equal(simulation.projectiles.size, 1);

  simulation.removePlayer(player.id);
  assert.equal(simulation.players.has(player.id), false);
  assert.equal(simulation.projectiles.size, 0);
});
