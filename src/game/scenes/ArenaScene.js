import Phaser from 'phaser';
import balance from '../data/ability-balance.json';
import { TouchControls } from '../input/TouchControls.js';
import { NetworkClient } from '../../net/NetworkClient.js';
import { WORLD, ISO_VIEW, worldToScreen, screenToWorld, screenVectorToWorld, projectedAngle } from '../geometry/isometric.js';
import { segmentIntersectsCircle } from '../combat/combat-math.js';
import { ARENA_OBSTACLES } from '../data/arena.js';
import { createTrainingTarget, hitTrainingTarget, updateTrainingTarget } from '../combat/offline-combat.js';

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
    this.skillButtonPointerId = null;
    this.skillButtonOrigin = null;
    this.skillButtonAim = null;
    this.lastSkillPointerPosition = null;
    this.localProjectiles = [];
    this.nextFpsUpdate = 0;
    this.networkInputAccumulator = 0;
  }

  create() {
    this.drawArena();
    this.createHero();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.touch = new TouchControls(this);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBounds(0, 0, ISO_VIEW.width, ISO_VIEW.height);
    this.cameras.main.startFollow(this.heroVisual, true, 0.08, 0.08);
    this.physics.add.collider(this.hero, this.obstacles);
    this.createSkillBar();

    this.network = new NetworkClient(
      (snapshot) => this.applySnapshot(snapshot),
      (status) => this.setConnectionStatus(status),
      null,
      (event) => this.handleCombatEvent(event)
    );
    this.network.connect();
    this.trainingTarget = createTrainingTarget();
    this.createTrainingTargetView();

    this.add.text(18, 14, 'WARLOCK ARENA', {
      fontFamily: 'Georgia, serif', fontSize: '14px', color: '#e4d7aa',
      stroke: '#10150f', strokeThickness: 4
    }).setScrollFactor(0).setDepth(900);
    this.healthLabel = this.add.text(18, 36, 'HP: 100 / 100', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#f0dca2'
    }).setScrollFactor(0).setDepth(900);
    this.fpsLabel = this.add.text(this.scale.width - 18, 14, 'FPS: --', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#cbd9ad',
      stroke: '#10150f', strokeThickness: 3
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(900);

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
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(0x344332, 0x344332, 0x263527, 0x263527, 1);
    g.fillRect(0, 0, ISO_VIEW.width, ISO_VIEW.height);

    // Diamond-shaped arena and diagonal tile grid.
    const corners = [
      worldToScreen(0, 0), worldToScreen(WORLD.width, 0),
      worldToScreen(WORLD.width, WORLD.height), worldToScreen(0, WORLD.height)
    ];
    g.fillStyle(0x3b5038, 1);
    g.fillPoints(corners.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
    g.lineStyle(1, 0xa7b48a, 0.13);
    for (let x = 0; x <= WORLD.width; x += 80) {
      const a = worldToScreen(x, 0);
      const b = worldToScreen(x, WORLD.height);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    for (let y = 0; y <= WORLD.height; y += 80) {
      const a = worldToScreen(0, y);
      const b = worldToScreen(WORLD.width, y);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    g.lineStyle(14, 0x171f17, 0.95);
    g.strokePoints(corners.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
    g.lineStyle(3, 0xb4a477, 0.65);
    g.strokePoints(corners.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);

    this.obstacles = this.physics.add.staticGroup();
    const rocks = ARENA_OBSTACLES.map(({ x, y, radius }) => [x, y, radius]);
    this.obstacleCircles = rocks.map(([x, y, radius]) => ({ x, y, radius }));
    rocks.forEach(([x, y, radius]) => {
      const p = worldToScreen(x, y);
      const rock = this.add.circle(x, y, radius, 0x20291f, 0).setStrokeStyle(0);
      this.physics.add.existing(rock, true);
      this.obstacles.add(rock);
      rock.setVisible(false);
      this.add.ellipse(p.x, p.y + radius * 0.54, radius * 2.2, radius * 1.14, 0x151d16, 0.48)
        .setDepth(p.y + radius * 0.54 - 1);
      this.add.ellipse(p.x, p.y, radius * 2.12, radius * 1.08, 0x20291f, 1)
        .setStrokeStyle(5, 0x657253, 0.95).setDepth(p.y + radius * 0.54);
      this.add.ellipse(p.x - radius * 0.16, p.y - radius * 0.12, radius * 0.7, radius * 0.32, 0x89906b, 0.22)
        .setDepth(p.y + radius * 0.54 + 1);
    });
    const center = worldToScreen(800, 500);
    this.add.ellipse(center.x, center.y, 225, 92, 0x9b8752, 0.06)
      .setStrokeStyle(3, 0xc6b77e, 0.3).setDepth(center.y - 2);
    this.add.ellipse(center.x, center.y, 177, 72, 0x000000, 0)
      .setStrokeStyle(1, 0xc6b77e, 0.2).setDepth(center.y - 1);
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

    // Keep physics/network coordinates Cartesian; render the actor on the isometric plane.
    this.hero = this.physics.add.sprite(800, 500, 'warlock-hero');
    this.hero.setCircle(15, 5, 8);
    this.hero.setCollideWorldBounds(true);
    this.hero.setVisible(false);
    const p = worldToScreen(this.hero.x, this.hero.y);
    this.heroVisual = this.add.image(p.x, p.y, 'warlock-hero').setOrigin(0.5, 1).setDepth(p.y + 1);
    this.heroLabel = this.add.text(p.x, p.y - 46, 'Warlock', {
      fontFamily: 'Georgia, serif', fontSize: '12px', color: '#f1e6bd',
      stroke: '#172017', strokeThickness: 3
    }).setOrigin(0.5, 1).setDepth(p.y + 2);
  }

  createTrainingTargetView() {
    const p = worldToScreen(this.trainingTarget.x, this.trainingTarget.y);
    this.trainingTargetShadow = this.add.ellipse(p.x, p.y + 7, 48, 20, 0x101810, 0.5).setDepth(p.y - 1);
    this.trainingTargetSprite = this.add.image(p.x, p.y, 'warlock-hero')
      .setOrigin(0.5, 1).setTint(0x9aa7bd).setDepth(p.y + 1);
    this.trainingTargetLabel = this.add.text(p.x, p.y - 48, 'Training target · 100 HP', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#dbe6ff',
      stroke: '#172017', strokeThickness: 3
    }).setOrigin(0.5, 1).setDepth(p.y + 2);
  }

  updateTrainingTargetView() {
    if (!this.trainingTargetSprite) return;
    const target = this.trainingTarget;
    const p = worldToScreen(target.x, target.y);
    this.trainingTargetSprite.setPosition(p.x, p.y)
      .setDepth(p.y + 1).setAlpha(target.alive ? 1 : 0.35);
    this.trainingTargetShadow.setPosition(p.x, p.y + 7).setDepth(p.y - 1);
    this.trainingTargetLabel.setPosition(p.x, p.y - 48).setDepth(p.y + 2)
      .setText(target.alive ? `Training target · ${Math.ceil(target.health)} HP` : 'Training target · respawning');
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
    container.add([ring, icon, text]);
    this.skillButtons.set(id, { container, ring, icon, text, baseIconX: 0, baseIconY: 0 });
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
    const x = this.scale.width - 62;
    const y = this.scale.height - (this.scale.height > this.scale.width ? 104 : 82);
    return Phaser.Math.Distance.Between(pointer.x, pointer.y, x, y) < 48;
  }

  pointerToWorld(pointer) {
    const camera = this.cameras.main;
    return screenToWorld(pointer.x + camera.scrollX, pointer.y + camera.scrollY);
  }

  onArenaPointerDown(pointer) {
    // Handle the skill button in screen coordinates; this avoids container hit-test
    // differences between mouse and touch input on mobile browsers.
    if (this.isOverSkillButton(pointer)) {
      // FIRE behaves like a small aim stick: press, drag to choose direction,
      // release to cast. A stationary tap fires in the hero's facing direction.
      this.skillButtonPointerId = pointer.id;
      this.skillButtonOrigin = { x: pointer.x, y: pointer.y };
      this.skillButtonAim = null;
      this.lastSkillPointerPosition = null;
      const facingAngle = this.hero.rotation - Math.PI / 2;
      this.drawFireballGuide({ x: Math.cos(facingAngle), y: Math.sin(facingAngle) });
      return;
    }
    if (!this.selectedAbility || this.aimPointerId !== null) return;
    if (pointer.wasTouch && pointer.x < this.scale.width * 0.46) return;
    this.aimPointerId = pointer.id;
    this.aimTarget = this.pointerToWorld(pointer);
    this.drawAim();
  }

  updateSkillButtonAim(pointer, force = false) {
    if (!this.skillButtonOrigin) return;
    if (!force && this.lastSkillPointerPosition &&
        pointer.x === this.lastSkillPointerPosition.x && pointer.y === this.lastSkillPointerPosition.y) return;
    this.lastSkillPointerPosition = { x: pointer.x, y: pointer.y };
    const dx = pointer.x - this.skillButtonOrigin.x;
    const dy = pointer.y - this.skillButtonOrigin.y;
    const distance = Math.hypot(dx, dy);
    const maxOffset = 18;
    const scale = distance > maxOffset ? maxOffset / distance : 1;
    const button = this.skillButtons.get('fireball');
    if (button) {
      button.icon.setPosition(dx * scale, dy * scale);
      button.text.setPosition(dx * scale, dy * scale + 1);
    }

    // Recalculate aim for every non-zero pointer offset. Do not clamp it
    // against arena bounds or obstacles: aiming through blocked space is valid.
    if (distance > 0.001) {
      const direction = screenVectorToWorld(dx, dy);
      const length = Math.hypot(direction.x, direction.y) || 1;
      this.skillButtonAim = { x: direction.x / length, y: direction.y / length };
    } else {
      this.skillButtonAim = null;
    }
    const facingAngle = this.hero.rotation - Math.PI / 2;
    this.drawFireballGuide(this.skillButtonAim ?? { x: Math.cos(facingAngle), y: Math.sin(facingAngle) });
  }

  onArenaPointerMove(pointer) {
    if (pointer.id === this.skillButtonPointerId && this.skillButtonOrigin) {
      this.updateSkillButtonAim(pointer);
      return;
    }
    if (pointer.id !== this.aimPointerId) return;
    this.aimTarget = this.pointerToWorld(pointer);
    this.drawAim();
  }

  onArenaPointerUp(pointer) {
    if (pointer.id === this.skillButtonPointerId) {
      // Re-sample the release coordinates so the projectile uses the exact final
      // joystick direction, even if no pointermove event arrived for the last motion.
      this.updateSkillButtonAim(pointer, true);
      const draggedAim = this.skillButtonAim;
      const angle = this.hero.rotation - Math.PI / 2;
      this.skillButtonPointerId = null;
      this.skillButtonOrigin = null;
      this.skillButtonAim = null;
      this.lastSkillPointerPosition = null;
      this.aimGraphics.clear();
      const button = this.skillButtons.get('fireball');
      if (button) {
        button.icon.setPosition(button.baseIconX, button.baseIconY);
        button.text.setPosition(button.baseIconX, button.baseIconY + 1);
      }
      // Drag angle is measured on the projected screen; tap direction is already in world space.
      const aim = draggedAim ?? { x: Math.cos(angle), y: Math.sin(angle) };
      const targetX = this.hero.x + aim.x * FIREBALL.range.value;
      const targetY = this.hero.y + aim.y * FIREBALL.range.value;
      this.castFireball(targetX, targetY);
      return;
    }
    if (pointer.id !== this.aimPointerId) return;
    const target = this.pointerToWorld(pointer);
    const ability = this.selectedAbility;
    this.aimPointerId = null;
    this.aimTarget = null;
    this.aimGraphics.clear();
    if (ability === 'fireball') this.castFireball(target.x, target.y);
  }

  drawFireballGuide(direction) {
    this.aimGraphics.clear();
    const origin = worldToScreen(this.hero.x, this.hero.y);
    const projected = worldToScreen(this.hero.x + direction.x, this.hero.y + direction.y);
    const dx = projected.x - origin.x;
    const dy = projected.y - origin.y;
    const length = Math.hypot(dx, dy) || 1;
    const endX = origin.x + dx / length * 100;
    const endY = origin.y + dy / length * 100;
    this.aimGraphics.lineStyle(4, 0xffd28a, 0.28);
    this.aimGraphics.lineBetween(origin.x, origin.y, endX, endY);
    this.aimGraphics.lineStyle(1.5, 0xffedc2, 0.48);
    this.aimGraphics.lineBetween(origin.x, origin.y, endX, endY);
    this.aimGraphics.fillStyle(0xffedc2, 0.38);
    this.aimGraphics.fillCircle(endX, endY, 4);
  }

  drawAim() {
    this.aimGraphics.clear();
    if (!this.aimTarget || !this.selectedAbility) return;
    const hero = worldToScreen(this.hero.x, this.hero.y);
    const target = worldToScreen(this.aimTarget.x, this.aimTarget.y);
    this.aimGraphics.lineStyle(3, 0xffc15b, 0.85);
    this.aimGraphics.lineBetween(hero.x, hero.y, target.x, target.y);
    this.aimGraphics.fillStyle(0xffd27a, 0.9);
    this.aimGraphics.fillCircle(target.x, target.y, 7);
  }

  createRemotePlayer(player) {
    const p = worldToScreen(player.x, player.y);
    const sprite = this.add.image(p.x, p.y, 'warlock-hero').setOrigin(0.5, 1).setTint(0xd58c70).setDepth(p.y + 1);
    const label = this.add.text(p.x, p.y - 42, 'Opponent', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#ffd1bd',
      stroke: '#172017', strokeThickness: 3
    }).setOrigin(0.5, 1).setDepth(p.y + 2);
    return { sprite, label, health: player.health, maxHealth: player.maxHealth };
  }

  applySnapshot(snapshot) {
    const players = snapshot.players ?? [];
    const seenPlayers = new Set();
    for (const player of players) {
      if (player.id === this.network.playerId) {
        this.hero.setPosition(player.x, player.y);
        const heroScreen = worldToScreen(player.x, player.y);
        this.heroVisual?.setPosition(heroScreen.x, heroScreen.y).setDepth(heroScreen.y + 1);
        this.heroLabel?.setPosition(heroScreen.x, heroScreen.y - 46).setDepth(heroScreen.y + 2);
        if (Number.isFinite(player.facingX) && Number.isFinite(player.facingY) &&
            (player.facingX || player.facingY)) {
          this.hero.rotation = Math.atan2(player.facingY, player.facingX) + Math.PI / 2;
          this.heroVisual.rotation = projectedAngle(player.facingX, player.facingY) + Math.PI / 2;
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
      const p = worldToScreen(player.x, player.y);
      view.sprite.setPosition(p.x, p.y).setDepth(p.y + 1);
      if (player.facingX || player.facingY) {
        view.sprite.rotation = projectedAngle(player.facingX, player.facingY) + Math.PI / 2;
      }
      view.label.setPosition(p.x, p.y - 42).setDepth(p.y + 2);
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
        const p = worldToScreen(projectile.x, projectile.y);
        view = this.add.circle(p.x, p.y, 8, 0xffa33a, 1)
          .setStrokeStyle(2, 0xffe5a0, 0.9).setDepth(p.y + 20);
        this.projectileViews.set(projectile.id, view);
      }
      const p = worldToScreen(projectile.x, projectile.y);
      view.setPosition(p.x, p.y).setDepth(p.y + 20);
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

  spawnLocalFireball(angle) {
    const direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
    const startX = this.hero.x + direction.x * 26;
    const startY = this.hero.y + direction.y * 26;
    const start = worldToScreen(startX, startY);
    const projectile = this.add.container(start.x, start.y).setDepth(start.y + 30);
    projectile.add([
      this.add.circle(0, 0, 15, 0xff6a1a, 0.22),
      this.add.circle(0, 0, 10, 0xff8b27, 0.95).setStrokeStyle(2, 0xffe7a0, 1),
      this.add.circle(-2, -2, 4, 0xfff3bd, 1)
    ]);
    this.localProjectiles.push({
      view: projectile, x: startX, y: startY,
      velocityX: direction.x * FIREBALL.projectileSpeed.value,
      velocityY: direction.y * FIREBALL.projectileSpeed.value,
      travelled: 0
    });
  }

  updateLocalProjectiles(delta) {
    const maxRange = FIREBALL.range.value;
    for (let i = this.localProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.localProjectiles[i];
      const previousX = projectile.x;
      const previousY = projectile.y;
      const stepX = projectile.velocityX * delta / 1000;
      const stepY = projectile.velocityY * delta / 1000;
      projectile.x += stepX;
      projectile.y += stepY;
      const p = worldToScreen(projectile.x, projectile.y);
      projectile.view.setPosition(p.x, p.y).setDepth(p.y + 30);
      projectile.travelled += Math.hypot(stepX, stepY);
      const targetHit = this.trainingTarget?.alive && segmentIntersectsCircle(
        previousX, previousY, projectile.x, projectile.y,
        this.trainingTarget.x, this.trainingTarget.y, this.trainingTarget.radius + 10
      );
      if (targetHit) {
        const hit = hitTrainingTarget(
          this.trainingTarget, FIREBALL.damage.value,
          projectile.velocityX, projectile.velocityY, this.time.now
        );
        this.trainingTarget = hit.target;
        this.cameras.main.shake(90, 0.0015);
        if (hit.killed) this.cameras.main.flash(140, 220, 230, 255);
      }
      const hitObstacle = this.obstacleCircles.some((obstacle) =>
        segmentIntersectsCircle(
          previousX, previousY, projectile.x, projectile.y,
          obstacle.x, obstacle.y, obstacle.radius + 10
        )
      );
      const outsideArena = projectile.x < 0 || projectile.x > WORLD.width ||
        projectile.y < 0 || projectile.y > WORLD.height;
      if (targetHit || hitObstacle || outsideArena || projectile.travelled >= maxRange) {
        projectile.view.destroy();
        this.localProjectiles.splice(i, 1);
      }
    }
  }

  castFireball(worldX, worldY) {
    const now = this.time.now;
    if (now - this.lastLocalCastAt < FIREBALL.cooldown.value * 1000) return;
    const angle = Phaser.Math.Angle.Between(this.hero.x, this.hero.y, worldX, worldY);
    if (this.network.connected) this.network.castFireball(angle);
    else this.spawnLocalFireball(angle);
    this.lastLocalCastAt = now;
    this.selectedAbility = null;
    for (const view of this.skillButtons.values()) {
      view.ring.setStrokeStyle(3, 0x89764b, 1);
      view.icon.setAlpha(0.78);
      view.container.setScale(1);
    }
  }

  setConnectionStatus(status) {
    const connected = status === 'Сервер подключён';
    if (connected && this.trainingTargetSprite) {
      this.trainingTargetSprite.destroy();
      this.trainingTargetShadow.destroy();
      this.trainingTargetLabel.destroy();
      this.trainingTargetSprite = null;
      this.trainingTargetShadow = null;
      this.trainingTargetLabel = null;
    } else if (!connected && !this.trainingTargetSprite && this.trainingTarget) {
      this.createTrainingTargetView();
    }
    const label = document.getElementById('connection-label');
    const dot = document.getElementById('connection-dot');
    if (label) label.textContent = status;
    if (dot) dot.classList.toggle('online', status === 'Сервер подключён');
  }

  update(_time, delta) {
    // FIRE aim is updated from local pointer events; do not poll/redraw every frame.
    // Release samples the final pointer coordinates before casting.
    if (this.trainingTarget && !this.network.connected) {
      this.trainingTarget = updateTrainingTarget(this.trainingTarget, delta, this.time.now, WORLD, this.obstacleCircles);
      this.updateTrainingTargetView();
    }
    this.updateLocalProjectiles(delta);
    if (this.time.now >= this.nextFpsUpdate) {
      const actualFps = this.game.loop.actualFps;
      this.fpsLabel.setText(`FPS: ${Number.isFinite(actualFps) ? Math.round(actualFps) : '--'}`);
      this.fpsLabel.setPosition(this.scale.width - 18, 14);
      this.nextFpsUpdate = this.time.now + 250;
    }
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    let screenX = Number(right) - Number(left);
    let screenY = Number(down) - Number(up);
    if (this.touch.vector.lengthSq() > 0) {
      screenX = this.touch.vector.x / 54;
      screenY = this.touch.vector.y / 54;
    }
    const worldDirection = screenVectorToWorld(screenX, screenY);
    const direction = new Phaser.Math.Vector2(worldDirection.x, worldDirection.y);
    if (direction.lengthSq() > 1) direction.normalize();

    if (direction.lengthSq() > 0.001) {
      this.hero.rotation = Math.atan2(direction.y, direction.x) + Math.PI / 2;
      this.heroVisual.rotation = projectedAngle(direction.x, direction.y) + Math.PI / 2;
    }
    if (this.network.connected) {
      // Match the input send rate to the server's 20 Hz simulation, not render FPS.
      this.networkInputAccumulator += Math.min(delta, 100);
      if (this.networkInputAccumulator >= 50) {
        this.networkInputAccumulator %= 50;
        this.network.sendInput(direction.x, direction.y);
      }
    } else {
      this.hero.setVelocity(direction.x * SPEED, direction.y * SPEED);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.toggleAbility('fireball');
    const heroScreen = worldToScreen(this.hero.x, this.hero.y);
    this.heroVisual.setPosition(heroScreen.x, heroScreen.y).setDepth(heroScreen.y + 1);
    this.heroLabel.setPosition(heroScreen.x, heroScreen.y - 46).setDepth(heroScreen.y + 2);
    this.touch.update();
  }
}
