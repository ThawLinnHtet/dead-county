import Phaser from 'phaser';
import actorsUrl from './actors.png';
import {
  actorFrameHeight, actorFrameWidth, actorOrigin, createSurvivorDirectionTexture, createZombieWalkTexture,
  survivorDirectionKey, zombieLooks, zombieWalkFrame, zombieWalkKey,
} from './actorMotion';
import { batConfig, damageCueMs, shoveConfig } from './combat';
import type { FootSurface, GameAudio } from './gameAudio';
import { drawBat, drawBatAim, drawBiteArms, drawDamageCue, drawShove } from './combatArt';
import femaleSurvivorUrl from './survivor-female.png';
import { drawFurniture } from './drawFurniture';
import { drawHouse } from './drawHouse';
import { drawScenery, drawTerrainDetail } from './drawScenery';
import type { GameCoordinator, GameOverResult, GameState, InteractionTarget } from './gameCoordinator';
import { itemDefinitions } from './items';
import { createImpactArt } from './impactArt';
import { doorKnockIntervalMs, doorStrain, openingCenter } from './shelter';
import { isArtInView } from './isometricDrawing';
import { createTerrainTexture, terrainFrame, terrainTextureKey } from './terrainTexture';
import { contains, details, furniture, groundTiles, hasLineOfSight, houses, mapHeight, mapWidth,
  openings, project, tileHeight, tileWidth, unproject } from './world';
import type { WorldPoint, WorldRect } from './world';
import { neighborhoodDarkness } from './survival';
import zombieVariantsUrl from './zombie-variants.png';
import { zombieConfig } from './zombie';

const outsideTerrainTiles = 7;
const groundChunkSize = 8;
const survivorDeathAnimationMs = 210;
const soundCueMs = 720;
const doorRattleMs = 170;
type InteractionPromptPosition = { target: InteractionTarget; x: number; y: number };
type SoundCue = { angle: number; volume: number; timeMs: number };
const tiledFloors = details.filter(({ type }) => type === 'tile_floor');

function footSurface(position: WorldPoint, indoors: boolean): FootSurface {
  if (indoors) return tiledFloors.some((floor) => contains(floor, position)) ? 'tile' : 'wood';
  const tile = groundTiles[Math.floor(position.y) * mapWidth + Math.floor(position.x)];
  return tile === 3 || tile === 4 ? 'pavement' : 'grass';
}

function partitionCoversFeet({ x, y, width, height }: WorldRect, feet: WorldPoint) {
  const vertical = height > width;
  const nearEnd = project({ x: x + width, y: y + height });
  const farEnd = vertical ? project({ x: x + width, y }) : project({ x, y: y + height });
  if (feet.x < Math.min(nearEnd.x, farEnd.x) - 8 || feet.x > Math.max(nearEnd.x, farEnd.x) + 8) return false;
  const progress = Phaser.Math.Clamp((feet.x - farEnd.x) / (nearEnd.x - farEnd.x), 0, 1);
  const wallDepth = Phaser.Math.Linear(farEnd.y, nearEnd.y, progress);
  return feet.y < wallDepth && feet.y > wallDepth - 55;
}

export class HouseScene extends Phaser.Scene {
  private readonly coordinator: GameCoordinator;
  private readonly showInteractionPrompt: (prompt: InteractionPromptPosition | null) => void;
  private readonly finishDeathAnimation: (result: GameOverResult) => void;
  private readonly droppedItemArt = new Map<string, Phaser.GameObjects.Image>();
  private groundChunks: { art: Phaser.GameObjects.Container; left: number; right: number; top: number; bottom: number }[] = [];
  private readonly zombieArt = new Map<string, {
    sprite: Phaser.GameObjects.Sprite;
    shadow: Phaser.GameObjects.Ellipse;
    effects: Phaser.GameObjects.Graphics;
    idleOffset: number;
  }>();
  private survivor!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private survivorEffects!: Phaser.GameObjects.Graphics;
  private survivorPack!: Phaser.GameObjects.Graphics;
  private aimArc!: Phaser.GameObjects.Graphics;
  private aimBracket!: Phaser.GameObjects.Graphics;
  private soundArt!: Phaser.GameObjects.Graphics;
  private impactArt!: ReturnType<typeof createImpactArt>;
  private soundCue: SoundCue | null = null;
  private doorRattles = new Map<string, number>();
  private pointer: Pick<MouseEvent, 'clientX' | 'clientY'> | null = null;
  private building!: ReturnType<typeof drawHouse>;
  private furnishings!: ReturnType<typeof drawFurniture>;
  private displayedOpenings?: GameState['closedOpeningIds'];
  private lastFrameAt: number | undefined;
  private timeSinceSurvivorDeath = 0;

  constructor(
    coordinator: GameCoordinator,
    showInteractionPrompt: (prompt: InteractionPromptPosition | null) => void,
    finishDeathAnimation: (result: GameOverResult) => void,
    private readonly reduceMotion: boolean,
    private readonly audio: GameAudio,
  ) {
    super('house-a');
    this.coordinator = coordinator;
    this.showInteractionPrompt = showInteractionPrompt;
    this.finishDeathAnimation = finishDeathAnimation;
  }

  preload() {
    for (const kind of Object.keys(itemDefinitions)) {
      this.load.image(kind, '/assets/items/' + kind + '.png');
    }
    this.load.spritesheet('actors', actorsUrl, { frameWidth: actorFrameWidth, frameHeight: actorFrameHeight });
    this.load.spritesheet('survivor-female', femaleSurvivorUrl, { frameWidth: actorFrameWidth, frameHeight: actorFrameHeight });
    this.load.spritesheet('zombie-variants', zombieVariantsUrl, { frameWidth: actorFrameWidth, frameHeight: actorFrameHeight });
  }

  create() {
    this.lastFrameAt = undefined;
    this.displayedOpenings = undefined;
    this.timeSinceSurvivorDeath = 0;
    this.soundCue = null;
    this.pointer = null;
    this.doorRattles.clear();
    createTerrainTexture(this.textures);
    this.createGround();

    drawScenery(this);
    this.building = drawHouse(this);
    this.furnishings = drawFurniture(this);

    this.shadow = this.add.ellipse(0, 0, 24, 8, 0x282721, .45);
    this.survivorEffects = this.add.graphics();
    this.survivorPack = this.add.graphics();
    this.aimArc = this.add.graphics().setDepth(-4650);
    this.aimBracket = this.add.graphics();
    this.soundArt = this.add.graphics();
    this.impactArt = createImpactArt(this, this.reduceMotion);
    const initialState = this.coordinator.getState();
    this.audio.setEnvironment(initialState.occupiedHouseId !== null, neighborhoodDarkness(initialState.activeTimeMs) > .55);
    const survivorTexture = initialState.survivor.characterId === 'survivor_female' ? 'survivor-female' : 'actors';
    this.survivor = this.add.sprite(0, 0, survivorTexture, 0).setOrigin(.5, actorOrigin);
    createSurvivorDirectionTexture(this.textures);
    createZombieWalkTexture(this.textures);
    this.zombieArt.clear();
    this.drawZombies(initialState);
    this.drawSurvivor(initialState);
    this.drawOcclusion(initialState, 1);

    const camera = this.cameras.main;
    const resize = (size: Phaser.Structs.Size) => {
      const { width, height } = this.scale.displaySize;
      const density = size.width / width;
      camera.setZoom(density * 1.25 * Phaser.Math.Clamp(Math.min(width / 1280, height / 720), .7, 1.2));
    };
    resize(this.scale.gameSize);
    camera.setBounds(-mapHeight * tileWidth / 2, -tileHeight * 4,
      (mapWidth + mapHeight) * tileWidth / 2, (mapWidth + mapHeight) * tileHeight / 2 + tileHeight * 6);
    camera.startFollow(this.survivor, true, .14, .14, 0, 28);
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);

    let wasPaused = false;
    let displayedDrops: GameState['droppedItems'] | undefined;
    let displayedWeaponId = initialState.survivor.equippedWeaponId;
    let displayedPackId = initialState.survivor.equippedPackId;
    const synchronizeWorld = () => {
      const state = this.coordinator.getState();
      const paused = this.coordinator.getPauseState().isPaused;
      if (state.droppedItems !== displayedDrops) {
        this.drawDroppedItems(state.droppedItems);
        displayedDrops = state.droppedItems;
      }
      if (state.survivor.equippedWeaponId !== displayedWeaponId || state.survivor.equippedPackId !== displayedPackId) {
        if (paused) this.drawSurvivor(state);
        displayedWeaponId = state.survivor.equippedWeaponId;
        displayedPackId = state.survivor.equippedPackId;
      }
      if (paused === wasPaused) return;
      wasPaused = paused;
      this.lastFrameAt = undefined;
      camera.setLerp(paused ? 0 : .14);
      if (paused) {
        this.pointer = null;
        this.showInteractionPrompt(null);
        drawBatAim(this.aimArc, this.aimBracket, null);
      }
    };
    this.droppedItemArt.clear();
    const unsubscribe = this.coordinator.subscribe(synchronizeWorld);
    synchronizeWorld();
    const { canvas } = this.game;
    canvas.addEventListener('mousedown', this.onWorldPress, true);
    canvas.addEventListener('pointermove', this.onWorldMove);
    canvas.addEventListener('pointerleave', this.onWorldLeave);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('mouseup', this.onWorldRelease);
    window.addEventListener('pointercancel', this.onWorldRelease);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      canvas.removeEventListener('mousedown', this.onWorldPress, true);
      canvas.removeEventListener('pointermove', this.onWorldMove);
      canvas.removeEventListener('pointerleave', this.onWorldLeave);
      canvas.removeEventListener('contextmenu', this.onContextMenu);
      window.removeEventListener('mouseup', this.onWorldRelease);
      window.removeEventListener('pointercancel', this.onWorldRelease);
      unsubscribe();
      this.scale.off(Phaser.Scale.Events.RESIZE, resize);
    });
  }

  update(time: number) {
    this.cullGround();
    if (this.coordinator.getPauseState().isPaused) return;

    const lastFrameAt = this.lastFrameAt;
    this.lastFrameAt = time;
    if (lastFrameAt === undefined) return;

    const elapsed = Math.min(Math.max(time - lastFrameAt, 0), 50);
    const terminalState = this.coordinator.getState();
    if (terminalState.gameOver) {
      if (this.timeSinceSurvivorDeath >= survivorDeathAnimationMs) return;
      this.timeSinceSurvivorDeath = Math.min(this.timeSinceSurvivorDeath + elapsed, survivorDeathAnimationMs);
      this.drawSurvivor(terminalState);
      this.impactArt.draw(terminalState.activeTimeMs + this.timeSinceSurvivorDeath);
      if (this.timeSinceSurvivorDeath === survivorDeathAnimationMs) this.finishDeathAnimation(terminalState.gameOver);
      return;
    }

    if (this.pointer && this.coordinator.isReady()) this.coordinator.aimAt(this.getWorldPointer(this.pointer));
    const state = this.coordinator.step(elapsed);
    this.updateWorldFeedback(terminalState, state);
    this.impactArt.draw(state.activeTimeMs);
    this.drawSurvivor(state);
    this.drawZombies(state);
    drawBatAim(this.aimArc, this.aimBracket, this.pointer ? this.coordinator.getBatAimPreview() : null);
    this.drawOcclusion(state, Math.min(1, elapsed / 70));
    this.drawSoundCue(state);
    this.drawInteractionPrompt();
    if (state.gameOver) {
      this.cameras.main.setLerp(0);
      if (this.reduceMotion) {
        this.timeSinceSurvivorDeath = survivorDeathAnimationMs;
        this.finishDeathAnimation(state.gameOver);
      }
    }
  }

  private createGround() {
    this.groundChunks = [];
    const maxX = mapWidth + outsideTerrainTiles;
    const maxY = mapHeight + outsideTerrainTiles;
    for (let row = -outsideTerrainTiles; row < maxY; row += groundChunkSize) {
      for (let column = -outsideTerrainTiles; column < maxX; column += groundChunkSize) {
        const endX = Math.min(maxX, column + groundChunkSize);
        const endY = Math.min(maxY, row + groundChunkSize);
        const tiles: Phaser.GameObjects.GameObject[] = [];
        const detail = this.add.graphics();
        for (let y = row; y < endY; y += 1) {
          for (let x = column; x < endX; x += 1) {
            const point = project({ x, y });
            const offMap = x < 0 || x >= mapWidth || y < 0 || y >= mapHeight;
            const tile = offMap ? 1 + Number(Math.abs(x + y * 7) % 5 === 0) : groundTiles[y * mapWidth + x]!;
            tiles.push(this.add.image(point.x, point.y, terrainTextureKey, terrainFrame(tile, x, y)).setOrigin(.5, 0));
            if (!offMap) drawTerrainDetail(detail, x, y, tile);
          }
        }
        this.groundChunks.push({
          art: this.add.container(0, 0, [...tiles, detail]).setDepth(-6000),
          left: project({ x: column, y: endY }).x - tileWidth,
          right: project({ x: endX, y: row }).x + tileWidth,
          top: project({ x: column, y: row }).y - tileHeight,
          bottom: project({ x: endX, y: endY }).y + tileHeight,
        });
      }
    }
  }

  private cullGround() {
    const view = this.cameras.main.worldView;
    for (const { art, left, right, top, bottom } of this.groundChunks) {
      art.setVisible(right >= view.left && left <= view.right && bottom >= view.top && top <= view.bottom);
    }
  }

  private onContextMenu = (event: Event) => event.preventDefault();

  private onWorldPress = (event: MouseEvent) => {
    if (event.defaultPrevented || this.coordinator.getPauseState().isPaused || this.coordinator.getState().gameOver) return;
    const target = this.getWorldPointer(event);
    if (event.button === 2) {
      this.pointer = { clientX: event.clientX, clientY: event.clientY };
      this.coordinator.setReady(true);
      this.coordinator.aimAt(target);
    } else if (event.button === 0) this.coordinator.startBatSwing(target);
  };

  playOpeningFeedback(target: Extract<InteractionTarget, { kind: 'opening' }>, locked: boolean) {
    this.audio.opening(target.object.type, !target.closed, locked);
  }

  private onWorldRelease = (event: MouseEvent) => {
    if (event.button === 2 || event.type === 'pointercancel') this.coordinator.setReady(false);
  };

  private onWorldMove = (event: PointerEvent) => {
    if (!this.isWorldMouseEvent(event)) return;
    this.pointer = { clientX: event.clientX, clientY: event.clientY };
    this.coordinator.aimAt(this.getWorldPointer(event));
  };

  private onWorldLeave = () => {
    this.pointer = null;
    this.coordinator.aimAt(null);
  };

  private isWorldMouseEvent(event: PointerEvent) {
    return event.isPrimary && event.pointerType === 'mouse' && !event.defaultPrevented
      && !this.coordinator.getPauseState().isPaused && !this.coordinator.getState().gameOver;
  }

  private getWorldPointer(event: Pick<MouseEvent, 'clientX' | 'clientY'>) {
    const bounds = this.game.canvas.getBoundingClientRect();
    const size = this.scale.gameSize;
    const point = this.cameras.main.getWorldPoint(
      (event.clientX - bounds.left) * size.width / bounds.width,
      (event.clientY - bounds.top) * size.height / bounds.height,
    );
    return unproject(point);
  }

  private drawInteractionPrompt() {
    const target = this.coordinator.getInteractionTarget();
    if (!target) {
      this.showInteractionPrompt(null);
      return;
    }
    const point = project(target.position);
    const camera = this.cameras.main;
    const { width, height } = this.scale.displaySize;
    const xScale = width / this.scale.gameSize.width;
    const yScale = height / this.scale.gameSize.height;
    const offset = target.kind === 'opening'
      ? (target.object.type === 'door' ? 67 : 49)
      : (target.kind === 'container' ? 37 : target.kind === 'bed' ? 24 : 13);
    this.showInteractionPrompt({
      target,
      x: (point.x - camera.worldView.x) * camera.zoom * xScale,
      y: Phaser.Math.Clamp((point.y - offset - camera.worldView.y) * camera.zoom * yScale, 36, camera.height * yScale),
    });
  }

  private drawDroppedItems(drops: GameState['droppedItems']) {
    const present = new Set(drops.map(({ item }) => item.id));
    for (const [id, art] of this.droppedItemArt) {
      if (present.has(id)) continue;
      art.destroy();
      this.droppedItemArt.delete(id);
    }
    for (const { item, position } of drops) {
      if (this.droppedItemArt.has(item.id)) continue;
      const { x, y } = project(position);
      const art = this.add.image(x, y, item.kind).setDepth(y + .06).setScale(.75, .56);
      this.droppedItemArt.set(item.id, art);
    }
  }

  private drawSurvivor({ survivor, activeTimeMs, sleep }: GameState) {
    const feet = project(survivor.position);
    const { x, y } = feet;
    const { attack } = survivor;
    const fallen = survivor.health === 0;
    const bed = sleep && furniture.find(({ name, type }) => name === sleep.bedId && type === 'bed');
    const idle = !fallen && !attack && (survivor.gait === 'idle' || !!bed);
    const ready = this.coordinator.isReady();
    const stride = Math.floor(survivor.walkDistance * (ready ? 8.1 : 6.6)) % 6;
    const frame = fallen || idle || attack ? 0 : 1 + (survivor.steppingBack ? 5 - stride : stride);
    const side = survivor.facingLeft ? -1 : 1;
    const breath = idle && !this.reduceMotion ? Math.sin(activeTimeMs / 420) : 0;
    const crouching = this.coordinator.isSneaking();
    const height = (bed ? .78 : crouching ? .86 : ready ? .94 : 1) + breath * .022;
    const timing = attack?.kind === 'shove' ? shoveConfig : batConfig;
    let lean = (survivor.gait === 'sprint' ? 8 : breath * 1.35) * side;
    if (survivor.steppingBack) lean = -4 * side;
    if (bed) lean = -Math.atan2(tileWidth, tileHeight) * 180 / Math.PI;
    if (fallen) lean = -side * Phaser.Math.Linear(28, 83, this.timeSinceSurvivorDeath / survivorDeathAnimationMs);
    else if (attack?.phase === 'windup') lean = -11 * side * (1 - attack.remainingMs / timing.windupMs);
    else if (attack?.phase === 'contact') lean = Phaser.Math.Linear(11, 21, 1 - attack.remainingMs / timing.contactMs) * side;
    else if (attack?.phase === 'recovery') lean = 21 * side * attack.remainingMs / timing.recoveryMs;
    const biteAge = survivor.lastBiteAtMs === null
      ? Infinity : activeTimeMs + this.timeSinceSurvivorDeath - survivor.lastBiteAtMs;
    const hurt = biteAge < damageCueMs;
    if (hurt && !fallen && !this.reduceMotion) lean -= side * 13 * (1 - biteAge / damageCueMs);
    const aim = project(survivor.facing);
    const female = survivor.characterId === 'survivor_female';
    const straight = !!bed || Math.abs(aim.y) > Math.abs(aim.x) * .95;
    const quarterRear = !straight && aim.y < -Math.abs(aim.x) * .17;
    const directional = straight || quarterRear;
    const texture = directional ? survivorDirectionKey : female ? 'survivor-female' : 'actors';
    const view = quarterRear ? 2 : Number(!bed && aim.y < 0);
    const spriteFrame = directional ? (Number(female) * 3 + view) * 7 + frame : frame;
    if (this.survivor.texture.key !== texture) this.survivor.setTexture(texture, spriteFrame);
    else this.survivor.setFrame(spriteFrame);
    const spriteFeet = bed ? project({ x: bed.x + bed.width - .18, y: bed.y + bed.height / 2 }) : feet;
    const depth = bed ? project({ x: bed.x + bed.width, y: bed.y + bed.height }).y + .06 : y;
    this.survivor.setPosition(spriteFeet.x, spriteFeet.y - (bed ? 20 : 0)).setDepth(depth)
      .setFlipX(!straight && survivor.facingLeft).setAngle(lean).setScale(bed ? .74 : 1, height);
    if (hurt) this.survivor.setTint(0xeaa18a);
    else if (fallen) this.survivor.setTint(0x9d8174);
    else this.survivor.clearTint();
    this.shadow.setPosition(x, y - 1).setDepth(y - .1).setVisible(!bed);
    const rear = aim.y < 0 && directional;
    const pack = this.survivorPack.clear().setPosition(x, y).setAngle(lean).setScale(1, height)
      .setDepth(y + (rear || straight ? .01 : -.01));
    if (!fallen && !bed && survivor.equippedPackId) {
      if (straight && !rear) {
        pack.lineStyle(3, 0x544432).lineBetween(-6, -35, -5, -22).lineBetween(6, -35, 5, -22);
        pack.lineStyle(1, 0xa98d62).lineBetween(-6, -34, -5, -24).lineBetween(6, -34, 5, -24);
      } else {
        const left = straight ? -8 : -side * 10 - 7;
        pack.fillStyle(0x32291e).fillRoundedRect(left, -37, 16, 18, 3);
        pack.fillStyle(0x927750).fillRoundedRect(left + 2, -35, 12, 14, 2);
        pack.fillStyle(0x695235).fillRect(left + 2, -29, 12, 3);
        pack.fillStyle(0xbc9b67).fillRect(left + 7, -29, 3, 5);
      }
    }
    const art = this.survivorEffects.clear().setDepth(y + .03);
    if (!fallen && attack?.kind === 'shove') drawShove(art, feet, attack);
    else if (!fallen && !sleep && survivor.equippedWeaponId) {
      drawBat(art, feet, survivor.facingLeft, attack, lean, height, ready ? survivor.facing : undefined, female);
    }
    if (hurt) drawDamageCue(art, feet, biteAge, true, fallen);
  }

  private drawZombies({ zombies, survivor, activeTimeMs }: GameState) {
    for (const zombie of zombies) {
      let art = this.zombieArt.get(zombie.id);
      if (!art) {
        const look = zombieLooks[zombie.appearanceId];
        const sprite = this.add.sprite(0, 0, look.texture, look.frame);
        art = {
          sprite: sprite.setOrigin(.5, actorOrigin),
          shadow: this.add.ellipse(0, 0, 22, 8, 0x272721, .42),
          effects: this.add.graphics(),
          idleOffset: this.zombieArt.size * 853,
        };
        this.zombieArt.set(zombie.id, art);
      }

      const visible = this.coordinator.canSee(zombie.position);
      art.sprite.setVisible(visible);
      art.shadow.setVisible(visible);
      art.effects.setVisible(visible);
      if (!visible) continue;

      const feet = project(zombie.position);
      const { x, y } = feet;
      const { attack } = zombie;
      const dead = zombie.health === 0;
      const hitAge = zombie.lastBatHitAtMs === null
        ? Infinity : activeTimeMs - zombie.lastBatHitAtMs;
      const hurt = hitAge < damageCueMs;
      const side = zombie.facingLeft ? -1 : 1;
      const walking = zombie.moving && !attack && !dead;
      const idle = !walking && !attack && !dead && !this.reduceMotion;
      const idleTime = activeTimeMs + art.idleOffset;
      const sway = idle ? Math.sin(idleTime / 560) + .4 * Math.sin(idleTime / 242) : 0;
      const height = idle ? 1 + .022 * Math.sin(idleTime / 390) : 1;
      let lean = walking ? 1.5 * side : 2 * sway;
      if (dead) lean = -side * Phaser.Math.Linear(25, 85, Math.min(1, hitAge / 210));
      else if (attack?.kind === 'stagger') lean = -side * 29 * attack.remainingMs / shoveConfig.staggerMs;
      else if (attack?.phase === 'windup') lean = -side * (9 + 9 * (1 - attack.remainingMs / zombieConfig.bite.windupMs));
      else if (attack?.phase === 'contact') lean = 23 * side;
      else if (attack?.phase === 'recovery') lean = 23 * side * attack.remainingMs / zombieConfig.bite.recoveryMs;
      if (hurt && !dead && !this.reduceMotion) {
        const recoil = Math.sign(x - project(survivor.position).x) || -side;
        lean += recoil * 25 * (1 - hitAge / damageCueMs) ** 2;
      }
      const look = zombieLooks[zombie.appearanceId];
      const texture = walking ? zombieWalkKey : look.texture;
      const frame = walking ? zombieWalkFrame(zombie.appearanceId, zombie.walkDistance) : look.frame;
      if (art.sprite.texture.key !== texture) art.sprite.setTexture(texture, frame);
      else art.sprite.setFrame(frame);
      art.sprite.setPosition(x, y).setDepth(y).setFlipX(zombie.facingLeft).setAngle(lean).setScale(1, height);
      if (hurt && hitAge < 85) art.sprite.setTint(0xd69b82);
      else if (dead) art.sprite.setTint(0x9d8174);
      else art.sprite.clearTint();
      art.shadow.setPosition(x, y - 1).setDepth(y - .1);
      art.effects.clear().setDepth(y + .03);
      if (attack && attack.kind !== 'stagger') drawBiteArms(art.effects, feet, attack, lean);
      if (hurt) drawDamageCue(art.effects, feet, hitAge, false, dead);
      else if (attack?.kind === 'stagger' && attack.remainingMs > shoveConfig.staggerMs - 130) {
        drawDamageCue(art.effects, feet, (shoveConfig.staggerMs - attack.remainingMs) * 1.6, false, false);
      }
    }
  }

  private updateWorldFeedback(previous: GameState, next: GameState) {
    const { survivor, activeTimeMs } = next;
    const survivorFeet = project(survivor.position);
    const panAt = (position: GameState['survivor']['position']) =>
      Phaser.Math.Clamp((project(position).x - survivorFeet.x) / 180, -.9, .9);
    const stepped = (a: number, b: number, stride: number) => Math.floor(a / stride) !== Math.floor(b / stride);
    const indoors = next.occupiedHouseId !== null;
    this.audio.setEnvironment(indoors, neighborhoodDarkness(activeTimeMs) > .55);
    if (previous.survivor.attack?.phase === 'windup' && survivor.attack?.phase === 'contact' && !survivor.attack.kind) {
      this.audio.swing();
    }
    let blockers: typeof openings | undefined;
    const clear = (from: WorldPoint, to: WorldPoint) => {
      blockers ??= openings.filter(({ name }) => next.closedOpeningIds.includes(name));
      return hasLineOfSight(from, to, blockers);
    };
    if (survivor.lastBiteAtMs !== null && survivor.lastBiteAtMs !== previous.survivor.lastBiteAtMs) {
      const attacker = next.zombies.find(({ attack }, index) => attack?.phase === 'contact' && attack.damageApplied
        && previous.zombies[index]?.attack?.phase === 'windup');
      const source = attacker?.position ?? {
        x: survivor.position.x + survivor.facing.x, y: survivor.position.y + survivor.facing.y,
      };
      this.impactArt.hit(survivor.position, source, survivor.lastBiteAtMs, 'bite', clear);
      this.audio.bite(panAt(source));
    }
    if (stepped(previous.survivor.walkDistance, survivor.walkDistance, .46)) {
      const heavy = survivor.gait === 'sprint';
      this.audio.footsteps(0, heavy ? .18 : survivor.gait === 'sneak' ? .036 : .093, heavy,
        footSurface(survivor.position, indoors));
    }
    for (const opening of openings) {
      if (opening.type !== 'door' || !previous.closedOpeningIds.includes(opening.name)) continue;
      const before = previous.doorDefenses[opening.name]?.pressureMs ?? 0;
      const current = next.doorDefenses[opening.name]?.pressureMs ?? 0;
      const forced = !next.closedOpeningIds.includes(opening.name);
      if (forced || (current > 0 && (before === 0 || stepped(before, current, doorKnockIntervalMs)))) {
        this.doorRattles.set(opening.name, activeTimeMs);
        const point = openingCenter(opening);
        const sound = this.coordinator.listenAt(point, 12);
        const strained = doorStrain(next.doorDefenses[opening.name]) !== 'intact';
        if (sound) this.audio.doorHit(panAt(point), (forced ? .34 : .26) * sound.volume, strained, forced);
      }
    }
    let strongest: SoundCue | null = null;
    for (const [index, zombie] of next.zombies.entries()) {
      const actorBefore = previous.zombies[index]!;
      if (zombie.lastBatHitAtMs !== null && zombie.lastBatHitAtMs !== actorBefore.lastBatHitAtMs) {
        this.impactArt.hit(zombie.position, survivor.position, zombie.lastBatHitAtMs, 'bat', clear);
        this.audio.impact(panAt(zombie.position));
      }
      if (zombie.health === 0) continue;
      const sound = this.coordinator.listenAt(zombie.position, 8);
      if (!sound || sound.volume <= .01) continue;
      const pan = panAt(zombie.position);
      const footstep = stepped(actorBefore.walkDistance, zombie.walkDistance, .57);
      if (footstep) this.audio.footsteps(pan, .095 * sound.volume, false,
        footSurface(zombie.position, houses.some((house) => contains(house, zombie.position))), sound.muffled);
      if (zombie.attack?.kind === 'stagger' && actorBefore.attack?.kind !== 'stagger') {
        this.audio.shoveHit(pan, .23 * sound.volume);
      }
      const offset = index * 911;
      const chasing = zombie.behavior.kind === 'chase';
      const cadence = chasing ? 2700 : 5100;
      const attackStarted = zombie.attack?.phase === 'windup' && zombie.attack.kind !== 'stagger'
        && actorBefore.attack?.phase !== 'windup';
      const groan = attackStarted || stepped(previous.activeTimeMs + offset, activeTimeMs + offset, cadence);
      if (groan) {
        const level = attackStarted ? .46 : chasing ? .36 : .29;
        this.audio.groan(pan, level * sound.volume, sound.muffled, index, attackStarted);
      }
      const cueVolume = sound.volume * (groan ? 1 : .65);
      if ((footstep || groan) && cueVolume > (strongest?.volume ?? .15) && !this.coordinator.canSee(zombie.position)) {
        const source = project(zombie.position);
        const angle = Math.atan2(source.y - survivorFeet.y, source.x - survivorFeet.x);
        const segment = Math.PI / 4;
        strongest = { angle: Math.round(angle / segment) * segment, volume: cueVolume, timeMs: activeTimeMs };
      }
    }
    if (strongest) this.soundCue = strongest;
  }

  private drawSoundCue({ survivor, activeTimeMs }: GameState) {
    const cue = this.soundCue;
    this.soundArt.clear();
    if (!cue || activeTimeMs - cue.timeMs >= soundCueMs) return;
    const { x, y } = project(survivor.position);
    const fade = this.reduceMotion ? 1 : 1 - (activeTimeMs - cue.timeMs) / soundCueMs;
    const opacity = fade * Math.min(1, .52 + cue.volume);
    this.soundArt.setDepth(y + 120);
    for (const radius of [44, 51]) {
      for (const [width, color] of [[4, 0x2a2119], [2, 0xe5ba82]] as const) {
        this.soundArt.lineStyle(width, color, opacity).beginPath();
        this.soundArt.arc(x, y - 10, radius, cue.angle - .21, cue.angle + .21);
        this.soundArt.strokePath();
      }
    }
  }

  private drawOcclusion(state: GameState, blend: number) {
    const view = this.cameras.main.worldView;
    const inView = (bounds: Parameters<typeof isArtInView>[1]) => blend === 1 || isArtInView(view, bounds);
    if (this.displayedOpenings !== state.closedOpeningIds) {
      for (const { id, panel, openLeaf } of this.building.openingArt) {
        const closed = state.closedOpeningIds.includes(id);
        panel.setVisible(closed);
        openLeaf?.setVisible(!closed);
      }
      this.displayedOpenings = state.closedOpeningIds;
    }
    for (const { id, panel, damage } of this.building.openingArt) {
      if (!damage) continue;
      const strain = doorStrain(state.doorDefenses[id]);
      const age = state.activeTimeMs - (this.doorRattles.get(id) ?? -Infinity);
      const rattle = !this.reduceMotion && age < doorRattleMs
        ? Math.sin(age / 17) * (strain === 'failing' ? 3.8 : 2.3) * (1 - age / doorRattleMs) : 0;
      panel.setX(rattle);
      damage.scuffs.setX(rattle).setVisible(strain !== 'intact');
      damage.cracks.setX(rattle).setVisible(strain === 'failing');
    }
    for (const { art, houseId } of this.building.signs) art.setVisible(houseId !== state.occupiedHouseId);
    for (const { art, bounds } of this.building.fixedWalls) art.setVisible(inView(bounds));
    for (const { art, houseId, bounds, porch } of this.building.roofArt) {
      if (!inView(bounds)) art.setVisible(false);
      else {
        const covered = porch && contains(porch, state.survivor.position);
        this.fade(art, Number(houseId !== state.occupiedHouseId && !covered), blend);
      }
    }
    for (const { art, houseId } of this.furnishings) {
      if (houseId) this.fade(art, Number(houseId === state.occupiedHouseId), blend);
    }
    const feet = project(state.survivor.position);
    for (const { art, houseId, bounds, footprint, partition } of this.building.nearWalls) {
      if (!inView(bounds)) art.setVisible(false);
      else {
        const cutaway = houseId === state.occupiedHouseId && (!partition || partitionCoversFeet(footprint, feet));
        this.fade(art, cutaway ? 0 : 1, blend);
      }
    }
  }

  private fade(art: Phaser.GameObjects.Graphics, target: number, blend: number) {
    const next = Phaser.Math.Linear(art.alpha, target, blend);
    const alpha = Math.abs(next - target) < .01 ? target : next;
    art.setVisible(alpha > 0).setAlpha(alpha);
  }
}
