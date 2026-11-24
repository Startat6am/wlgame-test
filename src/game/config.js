import Phaser from 'phaser';
import { ArenaScene } from './scenes/ArenaScene.js';

export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#172018',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  },
  input: {
    activePointers: 3
  },
  scene: [ArenaScene]
};