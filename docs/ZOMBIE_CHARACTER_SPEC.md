# Dead County — Zombie Character Specification

> **Status:** Visual concept approved · Implementation specification **v1.0**  
> **Date:** 2026-11-17  
> **Scope:** MVP v1.0 — zombie characters only  
> **Approved visual reference:** `references/approved-zombie-design.png`  
> **Related:** `PRD.md`, `ART_DIRECTION.md`, `DESIGN_SYSTEM.md`, `PLAYER_CHARACTER_SPEC.md`

## 1. Approval and source of truth

The approved concept board establishes a **grounded, unsettling, isometric pixel-art civilian zombie**. Its look matches the two approved survivors and the muted, weathered suburban setting. The zombie design must feel like an infected former person: ordinary clothes, varied body language, restrained decay, and convincing physical weight rather than a supernatural monster.

**Binding MVP rule:** There is **one standard zombie gameplay archetype**. The five visual treatments on the approved board are **cosmetic appearances only**, not different enemy classes. All appearances share the same base HP, walking/chasing speed, detection logic, attack damage, cooldowns, pathfinding, and hitbox rules. There are **no** “high-HP workers,” “fast hoodies,” or “aggressive bloody” enemies in MVP. The labels shown on concept art implying special abilities are **not requirements**.

Likewise, the concept board is **art-direction reference**, not an export-ready sprite atlas; it may depict more animations or exaggerated details than the MVP requires. The written PRD and this spec control implementation.

## 2. MVP character roster — five visual appearances, one gameplay type

| Appearance ID | Display / visual role | Look | Behavior |
|---|---|---|---|
| `zombie_civilian` | Common civilian | Torn neutral everyday shirt; dark trousers; disheveled hair; pale worn skin | Standard zombie |
| `zombie_worker` | Worker | Faded safety vest or work clothes; dirty sleeves; battered work boots | **Same standard zombie** |
| `zombie_hoodie` | Hoodie civilian | Desaturated gray hoodie with worn seams; partially shadowed face | **Same standard zombie** |
| `zombie_female` | Female civilian | Practical damaged top and dark trousers; tied-back/messy hair; realistic body proportions | **Same standard zombie** |
| `zombie_bloody` | Bloodier civilian | Heavier visible stains, torn clothing and facial injury (restrained) | **Same standard zombie** |

These IDs identify **rendering variants**, not independent classes or loot tables. The name `zombie_female` is a visual label from the approved board, **not** a gender-exclusive gameplay category. Production should include recognizable **male and female civilian silhouettes** and natural variation without introducing gender-based stat or behavior differences. Reusing shared underlying animations with appearance-specific textures/overlays is encouraged where the result remains coherent.

### Visual consistency rules

- **Recognizably human:** ordinary adult body proportions; never giant heads, fantasy mutations, armor, or superhuman anatomy.
- **Readable threat at game zoom:** hunched neck, slightly asymmetric shoulders, unsteady stance, and uneven arm positions distinguish zombies from both survivors.
- **Clothing tells the story:** old stains, ripped fabric, subdued workwear/casualwear. No bright neon accents except appropriately dulled worker vest details.
- **Gore is controlled:** visible wounds, dark blood and distressed clothing, but no gratuitous full-screen gore or constant particle effects.
- **Equal gameplay regardless of appearance or gender:** geometry for animation may vary slightly; effective collision and attack reach remain the same.
- **Never blend into player silhouettes:** keep outline/value and posture sufficiently different from the olive male survivor and burgundy female survivor.

## 3. Shape, proportion and perspective

- Share the world’s proposed **2:1 isometric** projection and preliminary **64×32 source-pixel ground-tile** convention; the final source scale is selected after Phaser prototype testing.
- Standing zombies should read at roughly **0.95–1.0× the standing survivor height**, subject to in-engine zoom and readability checks. This is a **visual design range**, not a mandatory fixed 30–32-pixel export size.
- Use a consistent **foot-ground / bottom-center pivot** for all directions and animations; preserve floor contact when the body tilts or falls.
- Keep *logical* collision footprints consistent for all variants and separate from full visible sprite bounds. Cosmetic packs, sleeves, hair, or wounds must not alter the collision body.
- Ground shadows stay small, soft and anchored to the feet. The in-engine world depth-order is determined by ground-contact position, not the sprite image top-left.
- For a collapse/death animation, allow expanded visual bounds without changing attack or movement logic.

## 4. Animation: believable, not mechanical

### 4.1 Required MVP animation states

| State | MVP | Motion direction |
|---|---|---|
| `idle` | Required | Shallow breathing, irregular sway, slight head/hand motion with planted feet |
| `walk` / `wander` | Required | Uneven weight transfer and stagger, short grounded steps, asymmetrical arm swing |
| `chase` | Required as **AI behavior** | Reuse a suitably paced walk/shamble animation with changed direction/speed; **no separate sprint ability** |
| `attack` | Required | Reach/wind-up, committed near-range bite/grab motion, follow-through and recovery |
| `death` | Required | Loss of balance, grounded collapse, stable non-threatening final pose |
| Hit feedback | Required cue | Brief visible confirmation on the zombie that took bat damage. A dedicated hurt animation is optional. |

**No required zombie `run` animation or special attacks in MVP.** If concept art shows a Run row, it is only a possible animation exploration. An optional locomotion variation may be added only as polish without changing the archetype or AI rules.

### 4.2 “Feels alive” motion rules

- Idle cycles should have slight timing variation between individual zombies; do not synchronize all visible characters.
- Step length, cadence and chest/head lag should convey a tired unsteady human body, not a perfectly repeating robotic shuffle.
- Feet must contact the floor consistently. Avoid skating, snapping to angles, or obvious pose duplication.
- Give the bite’s anticipation pose a distinct silhouette at default zoom. Follow it with the contact motion and a readable recovery. Have a newcomer try stepping clear when they see the pose.
- The gameplay hit event must be timed within the visible attack window but **calculated by Phaser gameplay logic** rather than sprite overlap alone.
- A confirmed bat hit triggers the impact sound and cue on the damaged zombie. In a group, the cue must identify the target with sound muted. The cue never interrupts a committed attack.
- On death, the entity is instantly incapable of further attacks even if the fall animation is still playing.
- Small cosmetic motion desynchronization is permitted; changes to attack cooldown or detection rules are not.

### 4.3 Facing directions and sprite-production order

- Game movement and AI may choose among eight logical directions: `n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`.
- Aim for convincing eight-direction facing. Reuse or mirror authored source frames only when head direction, wounds and attack poses still read naturally.
- **Prove one variant, one facing, one idle/walk/attack/death cycle in Phaser before producing every variant.** Check visual scale, animation duration and feet anchoring against both approved survivors.
- Planning frame ranges (not locked atlas sizes): idle ~4–6; walk ~6–8; attack ~6–10; death ~6–10 per authored facing. Hurt ~2–4 if added.
- The rendered concept board does not define exact frame counts; final timings are game-tuning parameters.

## 5. Gameplay AI contract

The zombie actor is controlled by a deterministic **rule-based finite state machine (FSM)** and basic navigation/pathfinding; **no LLM is used**.

```text
IDLE / WANDER
  | player detected (distance + basic line of sight)
  v
CHASE ---- within attack range ----> ATTACK
  ^                                  |
  | target leaves attack range       |
  +----------------------------------+
CHASE -- sight lost --> CHASE toward last known position
CHASE toward last known position -- target visible again --> CHASE visible target
CHASE toward last known position -- active grace expires --> WANDER from current position
ANY LIVING STATE -- HP reaches 0 --> DEAD
```

### MVP mechanics (same for all appearances)

- Spawn **10–20 active zombies** total in valid, walkable map positions.
- Both survivors use the same authored initial zombie positions and wander destinations. A fixed seed can reproduce later random behavior in playtests without changing the authored start. Ordinary AI starts on the first active step.
- Initial placement provides the walking-paced starter-bat opportunity. The first active simulation step runs ordinary AI. A nearby idle or wandering zombie can perceive, pursue or enter House A whenever its usual rules permit. Collecting or equipping the starter bat has no AI or spawning side effect.
- Zombie detection checks configured range and basic line of sight; no hearing/noise system yet.
- Chase uses obstacle-aware pathfinding, updated at a controlled frequency rather than each render frame.
- On a clear comparable route, chase speed sits slightly above survivor walking speed and below sprint speed. Sprinting changes separation while stamina lasts. The usual detection and pursuit rules determine whether the zombie gives up.
- Wander uses the same walkable navigation and collision rules as Chase. House A’s open doorway permits an outdoor zombie to walk inside during ordinary wandering without a prior sighting. Solid walls, closed doors and blocked cells stop either state. Distance-based simulation, if introduced, must preserve this movement history and its outcome when the house comes back into view.
- Keep a last known position per zombie. A successful range and line-of-sight check copies the survivor’s world position at that instant. On sight loss, navigate toward that copy and start the pursuit grace period once. While the survivor stays concealed, the destination stays fixed even if the survivor moves.
- On arrival, the zombie can wait at the last known position and continue normal perception checks. If navigation fails, keep it on valid geometry and use the existing throttled pathfinding behavior. Neither arrival nor a failed path refreshes the timer or reveals a hidden survivor.
- Spend grace time only on active simulation steps. Pause, Inventory, Loot, Full Map and tab hiding freeze it. On confirmed visibility, immediately update the last known position and resume visible Chase. On expiry without a sighting, discard the pursuit path and choose ordinary wander movement from the current world position. A fresh sighting during Wander can start another chase.
- Each zombie has its own attack cooldown with the same duration across all appearances. Check reach and line of sight at contact. A bite can deal damage once. Two zombies that land bites together each deal damage and enter their own recovery.
- A zombie that survives a bat hit during its wind-up finishes the bite. Knockback can leave it out of reach at contact, causing the bite to miss.
- Zombies have standard HP and can die. After death, stop navigation, detection, collision/attack behavior as appropriate, and leave a visually readable dead state.
- Basic wander, chase, attack, lost-target return and death are required. No respawn during the MVP run.
- Visual variety must never alter damage, HP, movement speed, chase range, cooldown, attack range, hitboxes or AI behavior.

### Configurability

Place standard zombie settings in one configuration structure, e.g. `src/game/config/zombieConfig.ts`: HP, wander speed, chase speed, detection distance, attack range, attack damage, cooldown, target-loss duration, AI tick interval and path refresh interval. Exact balance values remain **to be tuned through gameplay**; this art spec does not invent finalized numbers.

## 6. Color and surface treatment

Follow the approved world art treatment in `ART_DIRECTION.md`; UI tokens live in `DESIGN_SYSTEM.md`. Suggested zombie materials are **references, not exact palette locks**:

| Material | Suggested direction |
|---|---|
| Skin | Desaturated gray-beige, pale earthy tones and darker wounds |
| Clothing | Faded charcoal, dusty beige, olive, muted rust-brown |
| Worker accents | Weathered ochre / dirty orange rather than saturated reflective yellow |
| Hoodie | Low-chroma graphite/blue-gray |
| Dried blood | Deep desaturated rust red; vary by appearance, use sparingly |
| Dirt | Dark gray-brown and mud-toned staining |

Facial detail must be legible in close-up concept art **without being mandatory at tiny gameplay scale**. Put effort into head shape, silhouette, clothing, and body movement first.

## 7. Production assets and file structure

Illustrative structure:

```text
public/assets/sprites/zombies/
  zombie_civilian/
    zombie_civilian_idle_<dir>.png
    zombie_civilian_walk_<dir>.png
    zombie_civilian_attack_<dir>.png
    zombie_civilian_death_<dir>.png
  zombie_worker/
  zombie_hoodie/
  zombie_female/
  zombie_bloody/
public/assets/ui/   # no zombie gameplay panels required for MVP
src/game/entities/Zombie.ts
src/game/systems/ZombieAISystem.ts
src/game/config/zombieConfig.ts
src/game/data/zombieAppearances.ts
```

`<dir>` is a named facing (`ne`, `se`, etc.). Files may instead be packed into texture atlases with an animation manifest when that better suits the Phaser loader. Do not create empty or redundant sprite files to satisfy the illustrative structure.

**Export requirements:** clean transparent sprite backgrounds; consistent frame geometry/pivots and pixel density; no concept-board titles, text, scene backgrounds, black panel borders or UI decorations embedded in sprites. Source files and rights/licensing must be documented. The approved composite image is **not** a cut-and-use spritesheet.

### Suggested TypeScript modeling

```ts
export type ZombieAppearanceId =
  | 'zombie_civilian'
  | 'zombie_worker'
  | 'zombie_hoodie'
  | 'zombie_female'
  | 'zombie_bloody';

export interface ZombieSpawnData {
  id: string;
  appearanceId: ZombieAppearanceId;
  position: { x: number; y: number };
  health: number;
  alive: boolean;
}
```

Keep **appearance IDs independent of the AI state machine and combat parameters**. Appearance distribution may be set in one spawn configuration. The gameplay `Zombie` class should use shared movement/combat rules instead of creating five subclasses.

## 8. Save/load and state lifetime

The zombie snapshot preserves identity, appearance, location, health and alive status. For an attack in progress, it also preserves the phase, whether damage has already been applied, and the remaining gameplay time through recovery. A zombie saved just after a bite must finish its remaining recovery before it can bite again. Rebuild its path and visible animation from the restored gameplay state. [Attack timing decision](adr/0001-preserve-attack-timing.md)

- A dead zombie cannot become alive simply because the scene reloads.
- An existing zombie’s cosmetic appearance must not unexpectedly change after load.
- Container or corpse looting is **not added** by this document.
- Local saves are user-controlled and require schema validation just like other game-save data.

### 8.1 Pursuit snapshot

Capture each living zombie’s stable ID, world position and current AI state at the same simulation boundary as the survivor. Preserve its pursuit memory alongside any attack state.

| Pursuit state | Last known survivor position | Remaining pursuit duration |
|---|---|---|
| No active pursuit | Absent | No active timer |
| Survivor visible | Most recent world position confirmed by this zombie’s perception | No active loss timer |
| Sight lost | Fixed last confirmed visible world position | Finite, nonnegative seconds of active simulation remaining, including zero at expiry |

Keep the restored simulation frozen while decoding and rebuilding navigation. For a zombie that lost sight, build a fresh path from its saved position to its saved last sighting. Omit computed waypoints from saves and clear any route left over from the previous scene. A path failure follows the ordinary blocked-path behavior. Restoration, rebuilding and resuming leave the saved duration intact. The save timestamp serves as metadata only.

On active steps, run the usual perception and pursuit rules. A successful sighting immediately updates the target and resumes visible Chase. If the timer is exhausted and the survivor remains unseen, enter Wander at the current world position. This also applies to a zombie that continued waiting at its last sighting or could not reach it.

### 8.2 Pursuit comparison test

1. Pause mid-pursuit with the survivor behind the House B corner. Include two living zombies with different last sightings and remaining times. Put one partway along a route around an obstacle. Capture the snapshot and the common starting step.
2. In the baseline, keep the paused simulation in memory and choose Resume. In the second run, use Save & Exit, close the scene, wait longer than either remaining duration, and Continue from that same starting snapshot. Verify the snapshot contains no computed waypoints. Before the first active step, both runs must have identical saved positions, pursuit memories and remaining durations.
3. Supply identical survivor inputs, simulation step durations and perception opportunities in both runs. Keep the survivor concealed through expiry. Compare each zombie by ID at every step through the transition to Wander. Repeat with the survivor stepping into view before expiry. Also exercise an unreachable sighting and a saved zero-duration pursuit.
4. Require the same ordered state transitions on the same simulation steps, including the expiry step or reacquisition step. Compare positions in logical world coordinates at corresponding steps. Use a shared position tolerance independent of camera zoom. The provisional playtest tolerance is a Euclidean separation of at most 0.001 navigation cell widths. A position tolerance never excuses a different state, a later expiry, or a route through an obstacle.

### 8.3 Wander snapshot

Capture these values at the same paused simulation boundary for every living zombie in ordinary Idle or Wander.

| Saved value | Continue behavior |
|---|---|
| Logical state and world position | Restore the zombie at its saved position, including partway between navigation cells. |
| Chosen wander destination, or null | Restore the exact logical goal. If present, rebuild the route from the restored position. If absent, leave it absent throughout loading. |
| Remaining idle wait | Store finite, nonnegative active simulation seconds. Zero means the wait has already elapsed. Restore the value exactly through saving, loading and path rebuilding. |

Loading bypasses the fresh-spawn choice of destination and wait. Rebuild paths without drawing random numbers. Keep any random state needed for the next ordinary wander choice at the same point it occupied at save time. A pending path request or temporary blockage leaves the destination intact while the existing bounded pathfinding logic resolves it. Once navigation confirms the destination is unreachable, the normal active AI update may select a replacement. Arrival, detection and wait expiry still follow their ordinary active-play rules.

### 8.4 Wander comparison test

1. Pause at a known simulation step with one zombie crossing House B’s driveway toward a chosen point and another idle with no destination and an unfinished wait. Record their stable IDs, positions, destinations, wait durations and the state of wander randomness. Keep the survivor out of sight for this test.
2. Keep the baseline in memory and choose **Resume**. In a second run from the same initial state, **Save & Exit**, wait longer than the saved idle duration, then **Continue**. Instrument random draws during loading and route reconstruction. Expect zero draws during both operations. Before active play, check the original positions, destinations (including null) and remaining waits.
3. Apply identical inputs and simulation steps to both runs. Compare the destination, idle time remaining, state transitions and position of each zombie at corresponding steps. Follow the moving zombie through arrival and the idle zombie through its next ordinary choice. Require equal destinations, the same wait-expiry and movement-start steps, and equivalent movement under the shared [position tolerance](#82-pursuit-comparison-test). Include a zero-wait, no-destination case to catch a choice made one step early during loading.
4. Repeat with the same obstacle and navigation results in both runs. While the route is pending, check that the original goal remains selected in each. When the route is confirmed unreachable, check that both use the ordinary fallback on the same active step and make equivalent destination and movement choices. No zombie crosses an obstacle or rerolls solely because the scene was recreated.

### 8.5 House A return-visit test

1. Start a fresh run. Walk to the starter supplies, search and take the Baseball Bat without combat. Leave House A and keep the survivor outside the test zombie’s detection until the return.
2. Follow one existing outdoor zombie by stable ID. Use a repeatable ordinary wander choice that takes it to an interior point with an idle wait. Trace its movement and detection history. Verify it reaches the house from outside, crosses the collision-valid doorway and stays inside during the wait, with zero prior survivor detections. The fixture controls the wander choice and timing without placing the zombie indoors.
3. Return during that wait. Verify the survivor can encounter the same zombie at its simulated interior position. Its first detection, if any, must satisfy normal perception. Check that neither the survivor’s approach nor the roof reveal caused a spawn, position jump or state reset.
4. Compare with Save & Exit followed by Continue from just before the crossing and again while the zombie is waiting inside. Under matched active steps and inputs, check identity, position, movement state, chosen destination and remaining wait against ordinary Resume. If simulation changes with distance, repeat with the house outside its active range and compare with ordinary simulation using the [existing position tolerance](#82-pursuit-comparison-test).
5. As a collision control, repeat with the threshold marked blocked in the test geometry. Wander and Chase must both use another legitimate opening if available, or follow their ordinary unreachable-path behavior. Neither may cross the blockage or a solid wall.

## 9. Scope boundary: explicitly post-MVP

- Fast runner zombies, tank zombies, or damage/HP-specialized enemy classes.
- Zombie hearing, sound propagation, group coordination and true horde systems.
- Bite infection, special dismemberment, complex wound simulation.
- Destructible walls, doors and barricades.
- Advanced behavior trees, utility AI or LLM-driven zombie decisions.
- Procedural character customization, elaborate variations in body proportions, animated clothing physics.
- Unique AI/combat logic per visual outfit.

## 10. Implementation tickets

1. **ZOM-01 — Base archetype:** Create single Zombie entity config and typed appearance ID; prove simple idle/wander.
2. **ZOM-02 — Visual proof:** Build one civilian zombie in-engine; validate scale, anchor, idle/walk at the approved survivor scale.
3. **ZOM-03 — AI and collision:** Add detection, FSM chase, basic line of sight, obstacle navigation and return-to-wander behavior.
4. **ZOM-04 — Combat and death:** Add attack telegraph, cooldown, health/damage, hit feedback, death and non-threatening corpse state.
5. **ZOM-05 — Appearance expansion:** Add the other approved cosmetic looks, including female/male silhouettes, without branching behavior logic.
6. **ZOM-06 — Serialization/performance:** Save/load appearance + runtime-relevant state; test with 20 active zombies and throttled AI updates.

## 11. Acceptance criteria

- [ ] A single standard zombie gameplay archetype drives all five approved cosmetic appearances.
- [ ] Male and female zombie appearances are visually represented and stylistically coherent with the two approved player survivors.
- [ ] No worker, hoodie or bloody appearance receives special speed, HP, damage or aggression.
- [ ] Zombies read as ordinary, decayed people, with natural unsteady movement rather than stiff loops.
- [ ] Visual facing, shadows, anchors and height remain believable alongside both survivor sprites.
- [ ] Zombie idle/wander, detect, chase, attack, target loss and death behavior matches the PRD.
- [ ] Movement navigates around common obstacles and does not path straight through walls.
- [ ] Attack damage occurs only during valid range/cooldown conditions.
- [ ] Dead zombies cannot resume attacking and stay dead after save/load.
- [ ] The game supports 10–20 active zombies without obvious frame-by-frame pathfinding stutter in the target desktop build.
- [ ] MVP includes no special zombie classes, LLM, noise simulation, infection or multiplayer behavior.
- [ ] Final production sprite assets are consistent and properly authored/exported; not cropped from the concept board.

## 12. PRD and art-direction integration

Add the related changes described in `PRD_ZOMBIE_UPDATE.md` to the canonical PRD when editing the repository. `ART_DIRECTION.md` should reference this spec as the authority for zombie visuals and clarify that the five approved looks remain **one** gameplay archetype. This approval does not approve a new neighborhood layout or house design.

**Next creative checkpoint:** Neighborhood map visual concept only. Generate the image first, request approval, **then** write the Map/Environment Specification.
