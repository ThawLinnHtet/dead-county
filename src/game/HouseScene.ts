import Phaser from 'phaser';
import actorsUrl from './actors.png';
import femaleSurvivorUrl from './survivor-female.png';
import { drawFurniture } from './drawFurniture';
import { drawHouse } from './drawHouse';
import { drawScenery } from './drawScenery';
import type { GameCoordinator, GameState } from './gameCoordinator';
import groundUrl from './maps/ground.png';
import { groundTiles, mapHeight, mapWidth, project, tileHeight, tileWidth, zombieSpawn } from './world';

const outsideTerrainTiles = 7;

export class HouseScene extends Phaser.Scene {
  private readonly coordinator: GameCoordinator;
  private survivor!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private building!: ReturnType<typeof drawHouse>;
  private lastFrameAt: number | undefined;

  constructor(coordinator: GameCoordinator) {
    super('house-a');
    this.coordinator = coordinator;
  }

  preload() {
    this.load.spritesheet('ground', groundUrl, { frameWidth: tileWidth, frameHeight: tileHeight });
    this.load.spritesheet('actors', actorsUrl, { frameWidth: 40, frameHeight: 58 });
    this.load.spritesheet('survivor-female', femaleSurvivorUrl, { frameWidth: 40, frameHeight: 58 });
  }

  create() {
    this.lastFrameAt = undefined;
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

    const zombie = project(zombieSpawn);
    this.add.ellipse(zombie.x, zombie.y, 22, 8, 0x272721, .42).setDepth(zombie.y - .1);
    this.add.sprite(zombie.x, zombie.y, 'actors', 7).setOrigin(.5, 56 / 58).setDepth(zombie.y).setFlipX(true);

    this.shadow = this.add.ellipse(0, 0, 24, 8, 0x282721, .45);
    const initialState = this.coordinator.getState();
    const survivorTexture = initialState.survivor.characterId === 'survivor_female' ? 'survivor-female' : 'actors';
    this.survivor = this.add.sprite(0, 0, survivorTexture, 0).setOrigin(.5, 56 / 58);
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

    let wasPaused = false;
    const synchronizePause = () => {
      const paused = this.coordinator.getPauseState().isPaused;
      if (paused === wasPaused) return;
      wasPaused = paused;
      this.lastFrameAt = undefined;
      camera.setLerp(paused ? 0 : .14);
    };
    const unsubscribe = this.coordinator.subscribe(synchronizePause);
    synchronizePause();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      this.scale.off(Phaser.Scale.Events.RESIZE, resize);
    });
  }

  update(time: number) {
    if (this.coordinator.getPauseState().isPaused) return;

    const lastFrameAt = this.lastFrameAt;
    this.lastFrameAt = time;
    if (lastFrameAt === undefined) return;

    const elapsed = Math.min(Math.max(time - lastFrameAt, 0), 50);
    const state = this.coordinator.step(elapsed);
    this.drawSurvivor(state);
    this.drawOcclusion(state, Math.min(1, elapsed / 70));
  }

  private drawSurvivor({ survivor }: GameState) {
    const { x, y } = project(survivor.position);
    const frame = survivor.gait === 'idle' ? 0 : 1 + Math.floor(survivor.walkDistance * 6.6) % 6;
    this.survivor.setPosition(x, y).setDepth(y).setFlipX(survivor.facingLeft).setFrame(frame);
    this.shadow.setPosition(x, y - 1).setDepth(y - .1);
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
}
