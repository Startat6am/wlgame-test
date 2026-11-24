import Phaser from 'phaser';

const DEAD_ZONE = 8;
const MAX_RADIUS = 54;

export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.pointerId = null;
    this.origin = new Phaser.Math.Vector2(92, scene.scale.height - 104);
    this.vector = new Phaser.Math.Vector2();
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(1000);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.scale.on('resize', this.onResize, this);
  }

  onDown(pointer) {
    if (!pointer.wasTouch || this.pointerId !== null) return;
    if (pointer.x > this.scene.scale.width * 0.48 || pointer.y < this.scene.scale.height * 0.35) return;
    this.pointerId = pointer.id;
    this.origin.set(
      Phaser.Math.Clamp(pointer.x, 66, this.scene.scale.width * 0.42),
      Phaser.Math.Clamp(pointer.y, this.scene.scale.height * 0.52, this.scene.scale.height - 70)
    );
    this.onMove(pointer);
  }

  onMove(pointer) {
    if (pointer.id !== this.pointerId) return;
    const dx = pointer.x - this.origin.x;
    const dy = pointer.y - this.origin.y;
    const length = Math.hypot(dx, dy);
    const scale = length > MAX_RADIUS ? MAX_RADIUS / length : 1;
    const x = dx * scale;
    const y = dy * scale;
    this.vector.set(x, y);
    if (length < DEAD_ZONE) this.vector.set(0, 0);
  }

  onUp(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.vector.set(0, 0);
  }

  onResize(gameSize) {
    if (this.pointerId === null) {
      this.origin.set(92, gameSize.height - 104);
    }
  }

  update() {
    const g = this.graphics;
    g.clear();
    if (!this.scene.sys.game.device.input.touch) return;
    const active = this.pointerId !== null;
    g.fillStyle(0x07100b, 0.28);
    g.fillCircle(this.origin.x, this.origin.y, MAX_RADIUS + 12);
    g.lineStyle(2, 0xd8d2ad, 0.35);
    g.strokeCircle(this.origin.x, this.origin.y, MAX_RADIUS);
    g.fillStyle(0xc7b98a, active ? 0.58 : 0.3);
    g.fillCircle(this.origin.x + this.vector.x, this.origin.y + this.vector.y, 23);
  }

  destroy() {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
    this.scene.scale.off('resize', this.onResize, this);
    this.graphics.destroy();
  }
}