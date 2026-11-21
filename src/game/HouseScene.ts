import Phaser from 'phaser';
import actorsUrl from './actors.png';
import {
  actorFrameHeight, actorFrameWidth, actorOrigin, createSurvivorDirectionTexture, createZombieWalkTexture,
  survivorDirectionKey, zombieLooks, zombieWalkFrame, zombieWalkKey,
} from './actorMotion';
import { batConfig, damageCueMs, shoveConfig } from './combat';
import { createCombatAudio } from './combatAudio';
import { drawBat, drawBiteArms, drawDamageCue, drawShove } from './combatArt';
import femaleSurvivorUrl from './survivor-female.png';
import { drawFurniture } from './drawFurniture';
import { drawHouse } from './drawHouse';
import { drawScenery, drawTerrainDetail } from './drawScenery';
import type { GameCoordinator, GameOverResult, GameState, InteractionTarget } from './gameCoordinator';
import { itemDefinitions } from './items';
import { doorKnockIntervalMs, doorStrain, openingCenter } from './shelter';
import { isArtInView } from './isometricDrawing';
import groundUrl from './maps/ground.png';
import { contains, groundTiles, mapHeight, mapWidth, openings, project, tileHeight, tileWidth, unproject } from './world';
import zombieVariantsUrl from './zombie-variants.png';
import { zombieConfig } from './zombie';

const outsideTerrainTiles = 7;
const groundChunkSize = 8;
const survivorDeathAnimationMs = 210;
const soundCueMs = 720;
const doorRattleMs = 170;
type InteractionPromptPosition = { target: InteractionTarget; x: number; y: number };
type SoundCue = { angle: number; volume: number; timeMs: number };

export class HouseScene extends Phaser.Scene {
  private readonly coordinator: GameCoordinator;
  private readonly showInteractionPrompt: (prompt: InteractionPromptPosition | null) => void;
  private readonly finishDeathAnimation: (result: GameOverResult) => void;
  private readonly droppedItemArt = new Map<string, Phaser.GameObjects.Image>();
  private groundChunks: { art: Phaser.GameObjects.Container; left: number; right: number; top: number; bottom: number }[] = [];
  private readonly combatAudio = createCombatAudio();
  private readonly zombieArt = new Map<string, {
    sprite: Phaser.GameObjects.Sprite;
    shadow: Phaser.GameObjects.Ellipse;
    effects: Phaser.GameObjects.Graphics;
    lastHitAtMs: number | null;
    idleOffset: number;
  }>();
  private survivor!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private survivorEffects!: Phaser.GameObjects.Graphics;
  private soundArt!: Phaser.GameObjects.Graphics;
  private soundCue: SoundCue | null = null;
  private doorRattles = new Map<string, number>();
  private pointer: Pick<MouseEvent, 'clientX' | 'clientY'> | null = null;
  private building!: ReturnType<typeof drawHouse>;
  private displayedOpenings?: GameState['closedOpeningIds'];
  private lastFrameAt: number | undefined;
  private timeSinceSurvivorDeath = 0;

  constructor(
    coordinator: GameCoordinator,
    showInteractionPrompt: (prompt: InteractionPromptPosition | null) => void,
    finishDeathAnimation: (result: GameOverResult) => void,
    private readonly reduceMotion: boolean,
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
    this.load.spritesheet('ground', groundUrl, { frameWidth: tileWidth, frameHeight: tileHeight });
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
    this.createGround();

    drawScenery(this);
    this.building = drawHouse(this);
    drawFurniture(this);

    this.shadow = this.add.ellipse(0, 0, 24, 8, 0x282721, .45);
    this.survivorEffects = this.add.graphics();
    this.soundArt = this.add.graphics();
    const initialState = this.coordinator.getState();
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
      camera.setZoom(1.25 * Phaser.Math.Clamp(Math.min(size.width / 1280, size.height / 720), .7, 1.2));
    };
    resize(this.scale.gameSize);
    camera.setBounds(-mapHeight * tileWidth / 2, -tileHeight * 4,
      (mapWidth + mapHeight) * tileWidth / 2, (mapWidth + mapHeight) * tileHeight / 2 + tileHeight * 6);
    camera.startFollow(this.survivor, true, .14, .14, 0, 28);
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);

    let wasPaused = false;
    let displayedDrops: GameState['droppedItems'] | undefined;
    let displayedWeaponId = initialState.survivor.equippedWeaponId;
    const synchronizeWorld = () => {
      const state = this.coordinator.getState();
      const paused = this.coordinator.getPauseState().isPaused;
      if (state.droppedItems !== displayedDrops) {
        this.drawDroppedItems(state.droppedItems);
        displayedDrops = state.droppedItems;
      }
      if (state.survivor.equippedWeaponId !== displayedWeaponId) {
        if (paused) this.drawSurvivor(state);
        displayedWeaponId = state.survivor.equippedWeaponId;
      }
      if (paused === wasPaused) return;
      wasPaused = paused;
      this.lastFrameAt = undefined;
      camera.setLerp(paused ? 0 : .14);
      if (paused) {
        this.pointer = null;
        this.showInteractionPrompt(null);
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
    window.addEventListener('keydown', this.unlockAudio, { once: true });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      canvas.removeEventListener('mousedown', this.onWorldPress, true);
      canvas.removeEventListener('pointermove', this.onWorldMove);
      canvas.removeEventListener('pointerleave', this.onWorldLeave);
      canvas.removeEventListener('contextmenu', this.onContextMenu);
      window.removeEventListener('mouseup', this.onWorldRelease);
      window.removeEventListener('pointercancel', this.onWorldRelease);
      window.removeEventListener('keydown', this.unlockAudio);
      this.combatAudio.dispose();
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
      if (this.timeSinceSurvivorDeath === survivorDeathAnimationMs) this.finishDeathAnimation(terminalState.gameOver);
      return;
    }

    if (this.pointer && this.coordinator.isReady()) this.coordinator.aimAt(this.getWorldPointer(this.pointer));
    const state = this.coordinator.step(elapsed);
    this.updateWorldFeedback(terminalState, state);
    this.drawSurvivor(state);
    this.drawZombies(state);
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
            tiles.push(this.add.image(point.x, point.y, 'ground', tile - 1).setOrigin(.5, 0));
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

  private unlockAudio = () => this.combatAudio.unlock();

  private onContextMenu = (event: Event) => event.preventDefault();

  private onWorldPress = (event: MouseEvent) => {
    if (event.defaultPrevented || this.coordinator.getPauseState().isPaused || this.coordinator.getState().gameOver) return;
    this.unlockAudio();
    const target = this.getWorldPointer(event);
    if (event.button === 2) {
      this.pointer = { clientX: event.clientX, clientY: event.clientY };
      this.coordinator.setReady(true);
      this.coordinator.aimAt(target);
    } else if (event.button === 0 && this.coordinator.startBatSwing(target)) {
      this.combatAudio.swing();
    }
  };

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
    const offset = target.kind === 'opening'
      ? (target.object.type === 'door' ? 67 : 49)
      : (target.kind === 'container' ? 37 : 13);
    this.showInteractionPrompt({
      target,
      x: (point.x - camera.worldView.x) * camera.zoom,
      y: Phaser.Math.Clamp((point.y - offset - camera.worldView.y) * camera.zoom, 36, camera.height),
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

  private drawSurvivor({ survivor, activeTimeMs }: GameState) {
    const feet = project(survivor.position);
    const { x, y } = feet;
    const { attack } = survivor;
    const fallen = survivor.health === 0;
    const idle = !fallen && !attack && survivor.gait === 'idle';
    const ready = this.coordinator.isReady();
    const frame = fallen || idle || attack ? 0 : 1 + Math.floor(survivor.walkDistance * (ready ? 8.1 : 6.6)) % 6;
    const side = survivor.facingLeft ? -1 : 1;
    const breath = idle && !this.reduceMotion ? Math.sin(activeTimeMs / 420) : 0;
    const crouching = this.coordinator.isSneaking();
    const height = (crouching ? .86 : ready ? .94 : 1) + breath * .022;
    const timing = attack?.kind === 'shove' ? shoveConfig : batConfig;
    let lean = (survivor.gait === 'sprint' ? 8 : breath * 1.35) * side;
    if (fallen) lean = -side * Phaser.Math.Linear(28, 83, this.timeSinceSurvivorDeath / survivorDeathAnimationMs);
    else if (attack?.phase === 'windup') lean = -11 * side * (1 - attack.remainingMs / timing.windupMs);
    else if (attack?.phase === 'contact') lean = 16 * side;
    else if (attack?.phase === 'recovery') lean = 16 * side * attack.remainingMs / timing.recoveryMs;
    const biteAge = survivor.lastBiteAtMs === null
      ? Infinity : activeTimeMs + this.timeSinceSurvivorDeath - survivor.lastBiteAtMs;
    const hurt = biteAge < damageCueMs;
    const aim = project(survivor.facing);
    const female = survivor.characterId === 'survivor_female';
    const straight = Math.abs(aim.y) > Math.abs(aim.x) * .7;
    const texture = straight ? survivorDirectionKey : female ? 'survivor-female' : 'actors';
    const spriteFrame = straight ? (Number(female) * 2 + Number(aim.y < 0)) * 7 + frame : frame;
    if (this.survivor.texture.key !== texture) this.survivor.setTexture(texture, spriteFrame);
    else this.survivor.setFrame(spriteFrame);
    this.survivor.setPosition(x, y).setDepth(y).setFlipX(!straight && survivor.facingLeft).setAngle(lean).setScale(1, height);
    if (hurt) this.survivor.setTint(0xeaa18a);
    else if (fallen) this.survivor.setTint(0x9d8174);
    else this.survivor.clearTint();
    this.shadow.setPosition(x, y - 1).setDepth(y - .1);
    const art = this.survivorEffects.clear().setDepth(y + .03);
    if (!fallen && attack?.kind === 'shove') drawShove(art, feet, attack);
    else if (!fallen && survivor.equippedWeaponId) {
      drawBat(art, feet, survivor.facingLeft, attack, lean, height, ready ? survivor.facing : undefined);
    }
    if (hurt) drawDamageCue(art, feet, biteAge, true, fallen);
  }

  private drawZombies({ zombies, activeTimeMs }: GameState) {
    for (const zombie of zombies) {
      let art = this.zombieArt.get(zombie.id);
      if (!art) {
        const look = zombieLooks[zombie.appearanceId];
        const sprite = this.add.sprite(0, 0, look.texture, look.frame);
        art = {
          sprite: sprite.setOrigin(.5, actorOrigin),
          shadow: this.add.ellipse(0, 0, 22, 8, 0x272721, .42),
          effects: this.add.graphics(),
          lastHitAtMs: zombie.lastBatHitAtMs,
          idleOffset: this.zombieArt.size * 853,
        };
        this.zombieArt.set(zombie.id, art);
      }

      const visible = this.coordinator.canSee(zombie.position);
      art.sprite.setVisible(visible);
      art.shadow.setVisible(visible);
      art.effects.setVisible(visible);
      if (!visible) {
        art.lastHitAtMs = zombie.lastBatHitAtMs;
        continue;
      }

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
      const look = zombieLooks[zombie.appearanceId];
      const texture = walking ? zombieWalkKey : look.texture;
      const frame = walking ? zombieWalkFrame(zombie.appearanceId, zombie.walkDistance) : look.frame;
      if (art.sprite.texture.key !== texture) art.sprite.setTexture(texture, frame);
      else art.sprite.setFrame(frame);
      art.sprite.setPosition(x, y).setDepth(y).setFlipX(zombie.facingLeft).setAngle(lean).setScale(1, height);
      if (hurt) art.sprite.setTint(0xffcb9b);
      else if (dead) art.sprite.setTint(0x9d8174);
      else art.sprite.clearTint();
      art.shadow.setPosition(x, y - 1).setDepth(y - .1);
      art.effects.clear().setDepth(y + .03);
      if (attack && attack.kind !== 'stagger') drawBiteArms(art.effects, feet, attack, lean);
      if (hurt) drawDamageCue(art.effects, feet, hitAge, false, dead);
      else if (attack?.kind === 'stagger' && attack.remainingMs > shoveConfig.staggerMs - 130) {
        drawDamageCue(art.effects, feet, (shoveConfig.staggerMs - attack.remainingMs) * 1.6, false, false);
      }
      if (art.lastHitAtMs !== zombie.lastBatHitAtMs) {
        art.lastHitAtMs = zombie.lastBatHitAtMs;
        this.combatAudio.impact();
      }
    }
  }

  private updateWorldFeedback(previous: GameState, next: GameState) {
    const { survivor, activeTimeMs } = next;
    const survivorFeet = project(survivor.position);
    const panAt = (position: GameState['survivor']['position']) =>
      Phaser.Math.Clamp((project(position).x - survivorFeet.x) / 180, -.9, .9);
    const stepped = (a: number, b: number, stride: number) => Math.floor(a / stride) !== Math.floor(b / stride);
    if (stepped(previous.survivor.walkDistance, survivor.walkDistance, .46)) {
      const heavy = survivor.gait === 'sprint';
      this.combatAudio.footsteps(0, heavy ? .11 : survivor.gait === 'sneak' ? .018 : .055, heavy);
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
        if (sound) this.combatAudio.doorHit(panAt(point), (forced ? .34 : .26) * sound.volume, strained, forced);
      }
    }
    let strongest: SoundCue | null = null;
    for (const [index, zombie] of next.zombies.entries()) {
      if (zombie.health === 0) continue;
      const sound = this.coordinator.listenAt(zombie.position, 8);
      if (!sound || sound.volume <= .01) continue;
      const pan = panAt(zombie.position);
      const actorBefore = previous.zombies[index]!;
      const footstep = stepped(actorBefore.walkDistance, zombie.walkDistance, .57);
      if (footstep) this.combatAudio.footsteps(pan, .075 * sound.volume, false, sound.muffled);
      if (zombie.attack?.kind === 'stagger' && actorBefore.attack?.kind !== 'stagger') {
        this.combatAudio.shoveHit(pan, .23 * sound.volume);
      }
      const offset = index * 911;
      const cadence = zombie.behavior.kind === 'chase' ? 2700 : 5100;
      const groan = stepped(previous.activeTimeMs + offset, activeTimeMs + offset, cadence);
      if (groan) this.combatAudio.groan(pan, .24 * sound.volume, sound.muffled);
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
    for (const parts of [this.building.roofArt, this.building.nearWalls]) {
      for (const { art, houseId, bounds, porch } of parts) {
        if (!inView(bounds)) art.setVisible(false);
        else {
          const covered = porch && contains(porch, state.survivor.position);
          this.fade(art, Number(houseId !== state.occupiedHouseId && !covered), blend);
        }
      }
    }
  }

  private fade(art: Phaser.GameObjects.Graphics, target: number, blend: number) {
    const next = Phaser.Math.Linear(art.alpha, target, blend);
    const alpha = Math.abs(next - target) < .01 ? target : next;
    art.setVisible(alpha > 0).setAlpha(alpha);
  }
}
