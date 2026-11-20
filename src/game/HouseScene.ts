import Phaser from 'phaser';
import actorsUrl from './actors.png';
import { drawFurniture } from './drawFurniture';
import { drawHouse } from './drawHouse';
import { drawScenery } from './drawScenery';
import type { GameCoordinator, GameState } from './gameCoordinator';
import groundUrl from './maps/ground.png';
import { groundTiles, mapHeight, mapWidth, project, tileHeight, tileWidth } from './world';

const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight']);
const outsideTerrainTiles = 7;

export class HouseScene extends Phaser.Scene {
  private readonly coordinator: GameCoordinator;
  private readonly heldKeys = new Set<string>();
  private readonly zombieArt = new Map<string, {
    sprite: Phaser.GameObjects.Sprite;
    shadow: Phaser.GameObjects.Ellipse;
  }>();
  private survivor!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private building!: ReturnType<typeof drawHouse>;

  constructor(coordinator: GameCoordinator) {
    super('house-a');
    this.coordinator = coordinator;
  }

  preload() {
    this.load.spritesheet('ground', groundUrl, { frameWidth: tileWidth, frameHeight: tileHeight });
    this.load.spritesheet('actors', actorsUrl, { frameWidth: 40, frameHeight: 58 });
  }

  create() {
    for (let y = -outsideTerrainTiles; y < mapHeight + outsideTerrainTiles; y += 1) {
      for (let x = -outsideTerrainTiles; x < mapWidth + outsideTerrainTiles; x += 1) {
        const { x: worldX, y: worldY } = project({ x, y });
        const offMap = x < 0 || x >= mapWidth || y < 0 || y >= mapHeight;
        const tile = offMap ? 1 + (Math.abs(x + y * 7) % 5 === 0 ? 1 : 0) : groundTiles[y * mapWidth + x]!;
        this.add.image(worldX, worldY, 'ground', tile - 1).setOrigin(.5, 0).setDepth(-6000);
      }
    }

    drawScenery(this);
    this.building = drawHouse(this);
    drawFurniture(this);

    this.shadow = this.add.ellipse(0, 0, 24, 8, 0x282721, .45);
    this.survivor = this.add.sprite(0, 0, 'actors', 0).setOrigin(.5, 56 / 58);
    const initialState = this.coordinator.getState();
    this.zombieArt.clear();
    this.drawZombies(initialState);
    this.drawSurvivor(initialState);
    this.drawOcclusion(initialState, 1);

    const camera = this.cameras.main;
    const resize = (size: Phaser.Structs.Size) => {
      camera.setZoom(1.25 * Phaser.Math.Clamp(Math.min(size.width / 1280, size.height / 720), .7, 1.2));
    };
    resize(this.scale.gameSize);
    camera.setBounds(-mapHeight * tileWidth / 2, -tileHeight * 4,
      (mapWidth + mapHeight) * tileWidth / 2, (mapWidth + mapHeight) * tileHeight / 2 + tileHeight * 6);
    camera.startFollow(this.survivor, true, .14, .14, 0, 28);
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);

    const keyboard = this.input.keyboard;
    keyboard?.addCapture(['W', 'A', 'S', 'D', 'SHIFT']);
    keyboard?.on('keydown', this.onKeyDown);
    keyboard?.on('keyup', this.onKeyUp);
    this.game.events.on(Phaser.Core.Events.BLUR, this.clearMovement);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.clearMovement);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown', this.onKeyDown);
      keyboard?.off('keyup', this.onKeyUp);
      this.game.events.off(Phaser.Core.Events.BLUR, this.clearMovement);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.clearMovement);
      this.scale.off(Phaser.Scale.Events.RESIZE, resize);
      this.clearMovement();
    });
  }

  update(_time: number, delta: number) {
    const elapsed = Math.min(delta, 50);
    const state = this.coordinator.step(elapsed);
    this.drawSurvivor(state);
    this.drawZombies(state);
    this.drawOcclusion(state, Math.min(1, elapsed / 70));
  }

  private drawSurvivor({ survivor }: GameState) {
    const { x, y } = project(survivor.position);
    const frame = survivor.gait === 'idle' ? 0 : 1 + Math.floor(survivor.walkDistance * 6.6) % 6;
    const lean = survivor.gait === 'sprint' ? survivor.facingLeft ? -8 : 8 : 0;
    this.survivor.setPosition(x, y).setDepth(y).setFlipX(survivor.facingLeft).setFrame(frame).setAngle(lean);
    this.shadow.setPosition(x, y - 1).setDepth(y - .1);
  }

  private drawZombies({ zombies }: GameState) {
    for (const zombie of zombies) {
      let art = this.zombieArt.get(zombie.id);
      if (!art) {
        art = {
          sprite: this.add.sprite(0, 0, 'actors', 7).setOrigin(.5, 56 / 58),
          shadow: this.add.ellipse(0, 0, 22, 8, 0x272721, .42),
        };
        this.zombieArt.set(zombie.id, art);
      }

      const { x, y } = project(zombie.position);
      const stride = zombie.walkDistance * 11;
      const sway = zombie.moving ? 4 * Math.sin(stride) : 0;
      art.sprite.setPosition(x, y).setDepth(y).setFlipX(zombie.facingLeft).setAngle(sway);
      art.shadow.setPosition(x, y - 1).setDepth(y - .1);
    }
  }

  private drawOcclusion(state: GameState, blend: number) {
    for (const { art, houseId } of this.building.roofArt) {
      const target = houseId === state.occupiedHouseId ? 0 : 1;
      this.fade(art, target, blend);
    }
    for (const { art, houseId } of this.building.nearWalls) {
      const target = houseId === state.occupiedHouseId ? 0 : 1;
      this.fade(art, target, blend);
    }
  }

  private fade(art: Phaser.GameObjects.Graphics, target: number, blend: number) {
    const next = Phaser.Math.Linear(art.alpha, target, blend);
    const alpha = Math.abs(next - target) < .01 ? target : next;
    art.setVisible(alpha > 0).setAlpha(alpha);
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || !movementKeys.has(event.code) || event.altKey || event.ctrlKey || event.metaKey) return;
    this.heldKeys.add(event.code);
    this.updateMovement();
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (this.heldKeys.delete(event.code)) this.updateMovement();
  };

  private readonly clearMovement = () => {
    this.heldKeys.clear();
    this.updateMovement();
  };

  private updateMovement() {
    this.coordinator.setMovement({
      x: Number(this.heldKeys.has('KeyD')) - Number(this.heldKeys.has('KeyA')),
      y: Number(this.heldKeys.has('KeyS')) - Number(this.heldKeys.has('KeyW')),
    }, this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight'));
  }
}
