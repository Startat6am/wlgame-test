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
    this.selectedAbility = null;
    this.aimPointerId = null;
    this.aimTarget = null;
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
    this.createSkillBar();

    this.network = new NetworkClient(
      (snapshot) => this.applySnapshot(snapshot),
      (status) => this.setConnectionStatus(status),
      null,
      (event) => this.handleCombatEvent(event)
    );
    this.network.connect();

    this.add.text(18, 14, 'WARLOCK ARENA', {
      fontFamily: 'Georgia, serif', fontSize: '14px', color: '#e4d7aa',
      stroke: '#10150f', strokeThickness: 4
    }).setScrollFactor(0).setDepth(900);
    this.healthLabel = this.add.text(18, 36, 'HP: 100 / 100', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#f0dca2'
    }).setScrollFactor(0).setDepth(900);

    this.aimGraphics = this.add.graphics().setDepth(850);
    this.input.on('pointerdown', this.onArenaPointerDown, this);
    this.input.on('pointermove', this.onArenaPointerMove, this);
    this.input.on('pointerup', this.onArenaPointerUp, this);
    this.input.on('pointerupoutside', this.onArenaPointerUp, this);

    this.events.once('shutdown', () => {
      this.touch.destroy();
      this.network.disconnect();
      this.input.off('pointerdown', this.onArenaPointerDown, this);
      this.input.off('pointermove', this.onArenaPointerMove, this);
      this.input.off('pointerup', this.onArenaPointerUp, this);
      this.input.off('pointerupoutside', this.onArenaPointerUp, this);
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

  createSkillBar() {
    // The same data-driven button pattern will host every implemented ability.
    this.skillButtons = new Map();
    this.createSkillButton('fireball', 'FIRE', 0xffa33a);
    this.layoutSkillBar();
    this.scale.on('resize', this.layoutSkillBar, this);
  }

  createSkillButton(id, label, color) {
    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(1100);
    const ring = this.add.circle(0, 0, 34, 0x111810, 0.92).setStrokeStyle(3, 0x89764b, 1);
    const icon = this.add.circle(0, 0, 24, color, 0.9).setStrokeStyle(2, 0xffe5a0, 0.9);
    const text = this.add.text(0, 1, label, {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
      color: '#20190f', align: 'center'
    }).setOrigin(0.5);
    const hit = this.add.circle(0, 0, 39, 0xffffff, 0.001).setInteractive();
    hit.on('pointerdown', (pointer) => {
      pointer.event?.stopPropagation?.();
      this.toggleAbility(id);
    });
    container.add([ring, icon, text, hit]);
    this.skillButtons.set(id, { container, ring, icon, text });
  }

  layoutSkillBar() {
    const { width, height } = this.scale;
    const portrait = height > width;
    const button = this.skillButtons?.get('fireball');
    if (button) button.container.setPosition(width - 62, height - (portrait ? 104 : 82));
  }

  toggleAbility(id) {
    this.selectedAbility = this.selectedAbility === id ? null : id;
    for (const [abilityId, view] of this.skillButtons) {
      const active = this.selectedAbility === abilityId;
      view.ring.setStrokeStyle(active ? 4 : 3, active ? 0xffdf78 : 0x89764b, 1);
      view.icon.setAlpha(active ? 1 : 0.78);
      view.container.setScale(active ? 1.08 : 1);
    }
    this.aimGraphics.clear();
  }

  isOverSkillButton(pointer) {
    const button = this.skillButtons.get('fireball');
    if (!button) return false;
    const p = button.container.getWorldTransformMatrix().transformPoint(0, 0);
    return Phaser.Math.Distance.Between(pointer.x, pointer.y, p.x, p.y) < 48;
  }

  onArenaPointerDown(pointer) {
    if (!this.selectedAbility || this.aimPointerId !== null || this.isOverSkillButton(pointer)) return;
    if (pointer.wasTouch && pointer.x < this.scale.width * 0.46) return;
    this.aimPointerId = pointer.id;
    this.aimTarget = { x: pointer.worldX, y: pointer.worldY };
    this.drawAim();
  }

  onArenaPointerMove(pointer) {
    if (pointer.id !== this.aimPointerId) return;
    this.aimTarget = { x: pointer.worldX, y: pointer.worldY };
    this.drawAim();
  }

  onArenaPointerUp(pointer) {
    if (pointer.id !== this.aimPointerId) return;
    const target = { x: pointer.worldX, y: pointer.worldY };
    const ability = this.selectedAbility;
    this.aimPointerId = null;
    this.aimTarget = null;
    this.aimGraphics.clear();
    if (ability === 'fireball') this.castFireball(target.x, target.y);
  }

  drawAim() {
    this.aimGraphics.clear();
    if (!this.aimTarget || !this.selectedAbility) return;
    this.aimGraphics.lineStyle(3, 0xffc15b, 0.85);
    this.aimGraphics.lineBetween(this.hero.x, this.hero.y, this.aimTarget.x, this.aimTarget.y);
    this.aimGraphics.fillStyle(0xffd27a, 0.9);
    this.aimGraphics.fillCircle(this.aimTarget.x, this.aimTarget.y, 7);
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
        if (Number.isFinite(player.facingX) && Number.isFinite(player.facingY) &&
            (player.facingX || player.facingY)) {
          this.hero.rotation = Math.atan2(player.facingY, player.facingX) + Math.PI / 2;
        }
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
      if (player.facingX || player.facingY) {
        view.sprite.rotation = Math.atan2(player.facingY, player.facingX) + Math.PI / 2;
      }
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
    if (event.event === 'hit') this.cameras.main.shake(100, 0.002);
    if (event.event === 'respawn') this.cameras.main.flash(180, 255, 220, 160);
  }

  castFireball(worldX, worldY) {
    const now = this.time.now;
    if (!this.network.connected || now - this.lastLocalCastAt < FIREBALL.cooldown.value * 1000) return;
    const angle = Phaser.Math.Angle.Between(this.hero.x, this.hero.y, worldX, worldY);
    this.network.castFireball(angle);
    this.lastLocalCastAt = now;
    this.selectedAbility = null;
    for (const view of this.skillButtons.values()) {
      view.ring.setStrokeStyle(3, 0x89764b, 1);
      view.icon.setAlpha(0.78);
      view.container.setScale(1);
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

    if (direction.lengthSq() > 0.001) {
      this.hero.rotation = Math.atan2(direction.y, direction.x) + Math.PI / 2;
    }
    if (this.network.connected) this.network.sendInput(direction.x, direction.y);
    else this.hero.setVelocity(direction.x * SPEED, direction.y * SPEED);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.toggleAbility('fireball');
    this.heroLabel.setPosition(this.hero.x, this.hero.y - 34);
    this.touch.update();
  }
}
