import Phaser from 'phaser';
import { TouchControls } from '../input/TouchControls.js';
import { NetworkClient } from '../../net/NetworkClient.js';

const WORLD = { width: 1600, height: 1000 };
const SPEED = 230;

export class ArenaScene extends Phaser.Scene {
  constructor() {
    super('ArenaScene');
  }

  create() {
    this.drawArena();
    this.createHero();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.touch = new TouchControls(this);
    this.networkPlayers = new Map();

    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.hero, true, 0.08, 0.08);
    this.physics.add.collider(this.hero, this.obstacles);

    this.network = new NetworkClient(
      (players) => this.applySnapshot(players),
      (status) => this.setConnectionStatus(status)
    );
    this.network.connect();

    this.add.text(18, 18, 'WARLOCK ARENA · TEST GROUNDS', {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#e4d7aa',
      stroke: '#10150f',
      strokeThickness: 4
    }).setScrollFactor(0).setDepth(900);

    this.add.text(18, 42, 'Перемещайтесь по арене и исследуйте управление', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#c0c7ad'
    }).setScrollFactor(0).setDepth(900);

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
      const rock = this.add.circle(x, y, radius, 0x20291f, 1)
        .setStrokeStyle(5, 0x657253, 0.9);
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
    this.add.text(0, 0, 'Warlock', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#f1e6bd',
      stroke: '#172017',
      strokeThickness: 3
    }).setOrigin(0.5, 1).setDepth(11).setName('hero-label');
  }

  applySnapshot(players) {
    const remote = players.find((player) => player.id === this.network.playerId);
    if (remote && this.network.connected) {
      this.hero.setPosition(remote.x, remote.y);
    }
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

    if (this.network.connected) {
      this.network.sendInput(direction.x, direction.y);
    } else {
      this.hero.setVelocity(direction.x * SPEED, direction.y * SPEED);
    }

    const label = this.children.getByName('hero-label');
    if (label) label.setPosition(this.hero.x, this.hero.y - 34);
    this.touch.update();
  }
}