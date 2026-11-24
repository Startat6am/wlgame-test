import Phaser from 'phaser';
import balance from '../data/ability-balance.json';
import { TouchControls } from '../input/TouchControls.js';
import { NetworkClient } from '../../net/NetworkClient.js';

const WORLD = { width: 1600, height: 1000 };
const SPEED = balance.baseline.movementSpeed.value;
const FIREBALL = balance.abilities.find((ability) => ability.id === 'fireball');

export class ArenaScene extends Phaser.Scene {
  constructor() {
    super('ArenaScene');
    this.remotePlayers = new Map();
    this.projectileViews = new Map();
    this.lastLocalCastAt = -Infinity;
  }

  create() {
    this.drawArena();
    this.createHero();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.touch = new TouchControls(this);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.hero, true, 0.08, 0.08);
    this.physics.add.collider(this.hero, this.obstacles);

    this.network = new NetworkClient(
      (snapshot) => this.applySnapshot(snapshot),
      (status) => this.setConnectionStatus(status),
      null,
      (event) => this.handleCombatEvent(event)
    );
    this.network.connect();

    this.add.text(18, 18, 'WARLOCK ARENA · TEST GROUNDS', {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#e4d7aa',
      stroke: '#10150f', strokeThickness: 4
    }).setScrollFactor(0).setDepth(900);
    this.add.text(18, 42, 'WASD / стрелки — движение · SPACE / клик — Fireball', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#c0c7ad'
    }).setScrollFactor(0).setDepth(900);
    this.healthLabel = this.add.text(18, 64, 'HP: 100 / 100', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#f0dca2'
    }).setScrollFactor(0).setDepth(900);

    this.input.on('pointerdown', (pointer) => {
      if (pointer.button === 0) this.castFireball(pointer.worldX, pointer.worldY);
    });

    this.events.once('shutdown', () => {
      this.touch.destroy();
      this.network.disconnect();
    });
  }

  drawArena() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x344332, 0x344332, 0x263527, 0x263527, 1);
    g.fillRect(0, 0, WORLD.width, WORLD.height);
    g.lineStyle(1, 0x9aa47a, 0.08);
    for (let x = 0; x <= WORLD.width; x += 64) g.lineBetween(x, 0, x, WORLD.height);
    for (let y = 0; y <= WORLD.height; y += 64) g.lineBetween(0, y, WORLD.width, y);
    g.lineStyle(12, 0x171f17, 0.9);
    g.strokeRect(8, 8, WORLD.width - 16, WORLD.height - 16);
    g.lineStyle(3, 0xb4a477, 0.55);
    g.strokeRect(22, 22, WORLD.width - 44, WORLD.height - 44);

    this.obstacles = this.physics.add.staticGroup();
    const rocks = [
      [390, 310, 76], [600, 220, 54], [850, 360, 90],
      [1160, 250, 68], [1280, 650, 82], [930, 770, 58],
      [480, 720, 88], [250, 560, 48], [710, 590, 42]
    ];
    rocks.forEach(([x, y, radius]) => {
      const rock = this.add.circle(x, y, radius, 0x20291f, 1).setStrokeStyle(5, 0x657253, 0.9);
      this.physics.add.existing(rock, true);
      this.obstacles.add(rock);
      this.add.circle(x - radius * 0.2, y - radius * 0.25, radius * 0.48, 0x89906b, 0.18);
    });
    this.add.circle(800, 500, 150, 0x9b8752, 0.05).setStrokeStyle(3, 0xc6b77e, 0.24);
    this.add.circle(800, 500, 118, 0x000000, 0).setStrokeStyle(1, 0xc6b77e, 0.18);
  }

  createHero() {
    const texture = this.make.graphics({ x: 0, y: 0, add: false });
    texture.fillStyle(0x151a15);
    texture.fillEllipse(20, 35, 34, 15);
    texture.fillStyle(0x9caa83);
    texture.fillCircle(20, 20, 13);
    texture.fillStyle(0x435d42);
    texture.fillRoundedRect(8, 23, 24, 17, 6);
    texture.fillStyle(0xb8a66e);
    texture.fillTriangle(7, 13, 20, -1, 33, 13);
    texture.generateTexture('warlock-hero', 40, 44);
    texture.destroy();

    this.hero = this.physics.add.sprite(800, 500, 'warlock-hero');
    this.hero.setCircle(15, 5, 8);
    this.hero.setCollideWorldBounds(true);
    this.hero.setDepth(10);
    this.heroLabel = this.add.text(0, 0, 'Warlock', {
      fontFamily: 'Georgia, serif', fontSize: '12px', color: '#f1e6bd',
      stroke: '#172017', strokeThickness: 3
    }).setOrigin(0.5, 1).setDepth(11);
  }

  createRemotePlayer(player) {
    const sprite = this.add.image(player.x, player.y, 'warlock-hero').setTint(0xd58c70).setDepth(9);
    const label = this.add.text(player.x, player.y - 34, 'Opponent', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#ffd1bd',
      stroke: '#172017', strokeThickness: 3
    }).setOrigin(0.5, 1).setDepth(11);
    return { sprite, label, health: player.health, maxHealth: player.maxHealth };
  }

  applySnapshot(snapshot) {
    const players = snapshot.players ?? [];
    const seenPlayers = new Set();
    for (const player of players) {
      if (player.id === this.network.playerId) {
        this.hero.setPosition(player.x, player.y);
        this.currentHealth = player.health;
        this.maxHealth = player.maxHealth;
        this.healthLabel?.setText(`HP: ${Math.ceil(player.health)} / ${player.maxHealth}`);
        continue;
      }
      seenPlayers.add(player.id);
      let view = this.remotePlayers.get(player.id);
      if (!view) {
        view = this.createRemotePlayer(player);
        this.remotePlayers.set(player.id, view);
      }
      view.sprite.setPosition(player.x, player.y);
      view.label.setPosition(player.x, player.y - 34);
      view.health = player.health;
    }
    for (const [id, view] of this.remotePlayers) {
      if (!seenPlayers.has(id)) {
        view.sprite.destroy();
        view.label.destroy();
        this.remotePlayers.delete(id);
      }
    }

    const seenProjectiles = new Set();
    for (const projectile of snapshot.projectiles ?? []) {
      seenProjectiles.add(projectile.id);
      let view = this.projectileViews.get(projectile.id);
      if (!view) {
        view = this.add.circle(projectile.x, projectile.y, 8, 0xffa33a, 1)
          .setStrokeStyle(2, 0xffe5a0, 0.9).setDepth(20);
        this.projectileViews.set(projectile.id, view);
      }
      view.setPosition(projectile.x, projectile.y);
    }
    for (const [id, view] of this.projectileViews) {
      if (!seenProjectiles.has(id)) {
        view.destroy();
        this.projectileViews.delete(id);
      }
    }
  }

  handleCombatEvent(event) {
    if (event.event === 'hit') {
      this.cameras.main.shake(100, 0.002);
    }
    if (event.event === 'respawn') {
      this.cameras.main.flash(180, 255, 220, 160);
    }
  }

  castFireball(worldX, worldY) {
    const now = this.time.now;
    if (!this.network.connected || now - this.lastLocalCastAt < FIREBALL.cooldown.value * 1000) return;
    const angle = Phaser.Math.Angle.Between(this.hero.x, this.hero.y, worldX, worldY);
    this.network.castFireball(angle);
    this.lastLocalCastAt = now;
  }

  setConnectionStatus(status) {
    const label = document.getElementById('connection-label');
    const dot = document.getElementById('connection-dot');
    if (label) label.textContent = status;
    if (dot) dot.classList.toggle('online', status === 'Сервер подключён');
  }

  update() {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    let x = Number(right) - Number(left);
    let y = Number(down) - Number(up);
    if (this.touch.vector.lengthSq() > 0) {
      x = this.touch.vector.x / 54;
      y = this.touch.vector.y / 54;
    }
    const direction = new Phaser.Math.Vector2(x, y);
    if (direction.lengthSq() > 1) direction.normalize();

    if (this.network.connected) this.network.sendInput(direction.x, direction.y);
    else this.hero.setVelocity(direction.x * SPEED, direction.y * SPEED);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      const pointer = this.input.activePointer;
      this.castFireball(pointer.worldX, pointer.worldY);
    }
    this.heroLabel.setPosition(this.hero.x, this.hero.y - 34);
    this.touch.update();
  }
}