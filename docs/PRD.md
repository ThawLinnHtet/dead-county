# Dead County — Master Product Requirements Document (PRD)

> **Version 2.30 · 2026-11-21**
>
> **Status:** Approved MVP product scope; final production geometry, UI screen mockups, and asset atlases remain subject to implementation validation  
> **Product:** Dead County — original 2D isometric zombie-survival game inspired by the genre of *Project Zomboid*  
> **Platform:** Desktop web browser · **Mode:** Single-player · **Deployment:** Vercel  
> **MVP stack:** Phaser 4 + TypeScript + React + Vite + Tailwind CSS + Tiled + IndexedDB/Dexie  
> **Authority:** This master PRD replaces the original PRD plus `PRD_CHARACTER_UPDATE.md`, `PRD_ZOMBIE_UPDATE.md`, `PRD_MAP_UPDATE.md`, and `PRD_BUILDING_UPDATE.md` as the consolidated statement of approved product scope.

---

### Change history

| Version | Date | Change |
|---|---|---|
| v2.0 | 2026-11-17 | Consolidated original PRD and approved character, zombie, map, and building amendments. |
| v2.1 | 2026-11-18 | Approved mouse-based melee controls: Left Click to attack, mouse-directed facing, `Space` unassigned; UI click suppression and combat tests clarified. |
| v2.2 | 2026-11-19 | Made untreated critical needs lethal, set the House B encounter playtest target, and specified how Continue restores an attack in progress. |
| v2.3 | 2026-11-19 | Defined which zombie a bat swing hits, how the survivor moves through a swing, how overlapping bites deal damage, and how critical hunger and thirst combine. |
| v2.4 | 2026-11-19 | Locked swing direction and deterministic hit selection, defined attack commitment and stamina use, and specified overlay click handling and consumable eligibility. |
| v2.5 | 2026-11-19 | Kept the bat equipped through attack recovery and added contextual pickup for dropped items. |
| v2.6 | 2026-11-19 | Defined placement before inventory removal, first-empty-slot pickup and transfer, and manual equip after recovering a bat. |
| v2.7 | 2026-11-19 | Defined independent pause reasons, explicit Resume after tab hiding, exclusive local run ownership, and revision-checked saves. |
| v2.8 | 2026-11-19 | Required explicit Continue after ownership release and defined recovery for revision conflicts, lost ownership and retryable storage errors. |
| v2.9 | 2026-11-19 | Defined read-only retries, save-schema compatibility checks, and confirmed replacement of a damaged save. |
| v2.10 | 2026-11-19 | Set playtest criteria for finding House B, choosing between two approaches, and obtaining finite food and water in House C. |
| v2.11 | 2026-11-19 | Defined pursuit after sight loss, its active-time limit, and wandering from the point where pursuit ends. |
| v2.12 | 2026-11-19 | Defined per-zombie pursuit snapshots, path reconstruction and the comparison between ordinary resume and Continue. |
| v2.13 | 2026-11-19 | Preserved wander destinations, idle waits and the next normal wander decision across Continue. |
| v2.14 | 2026-11-19 | Approved ordinary zombie wandering into House A and specified starter-bat safety and return-visit continuity. |
| v2.15 | 2026-11-19 | Defined opening safety through layout and initial zombie placement, with first-playtest checks through equipping the starter bat. |
| v2.16 | 2026-11-19 | Set identical starting stats and empty equipment for both survivors and guaranteed a reachable bat and water bottle in House A. |
| v2.17 | 2026-11-19 | Placed the guaranteed bat and water together in House A’s starter container and added partial and full depletion checks. |
| v2.18 | 2026-11-19 | Guaranteed obtainable food in House B and added collection and persistence checks for both approaches. |
| v2.19 | 2026-11-19 | Located House B’s guaranteed food in its kitchen and added a first supply run through entry, collection and exit. |
| v2.20 | 2026-11-19 | Defined first-supply-run pacing, walking/chase/sprint speed order, bandage-only healing and one authored fresh-run setup. |
| v2.21 | 2026-11-19 | Defined screen-relative WASD, deliberate sprint re-engagement after exhaustion and fresh movement input after a pause or Continue. |
| **v2.22** | **2026-11-19** | Defined feedback for movement, bat hits, zombie bites, need-related health loss and inventory actions. |
| **v2.23** | **2026-11-21** | Expanded the connected neighborhood. Added interactive entrances, noise investigation, day and night, bleeding treatment, and schema-one migration. |
| **v2.24** | **2026-11-21** | Added survivor visibility, sneaking, directional audio and animation, ready stance, shove, carry limits, and door reinforcement. |
| **v2.25** | **2026-11-21** | Tuned directional awareness, ready footwork, exertion from a carried load, and feedback as doors weaken. |
| **v2.26** | **2026-11-21** | Added backpack storage, persistent stashes and a playable first night. |
| **v2.27** | **2026-11-21** | Made exterior doors start closed and unlocked in fresh runs. |
| **v2.28** | **2026-11-21** | Added one optional locked workshop with a recoverable key and side-window entry. |
| **v2.29** | **2026-11-21** | Added confirmed-hit blood and audio, surface footsteps, ambient sound, and clearer wall and doorway rendering. |
| **v2.30** | **2026-11-21** | Added a manual bat aim guide with a range arc and a visible target preview. |

### Post-MVP shelter slice

Alder House is the first barricadable shelter. Scavenge the Hammer from the Corner Store and the Board from Alder House. While inside beside the closed front door, use the Board from Inventory with the Hammer in pockets or in the worn Canvas Backpack. Only a valid installation consumes the Board, and the reusable Hammer stays in place. Door Wedges and boards cannot reinforce the same door together. The side window remains operable.

Installation makes one positional sound that ordinary zombies can investigate. Only existing confirmed pursuit applies door pressure. The board extends resistance, shows visible strain, and is lost if zombies force the door. From inside, **E Remove barricade** removes the board without returning it or opening the door. From outside, the closed door stays blocked while boarded. Removing the board preserves existing pressure up to the ordinary door's resistance. A breach during sleep still wakes the survivor.

Save & Exit and Continue preserve the barricade, door pressure and item locations. Older runs begin without barricades and receive the two new items in their designated containers when space permits. Existing items keep their locations and identities.

### First-night milestone

The survivor can take supplies from one building and stash them in another. Inventory and Loot still pause simulation. The equipped Canvas Backpack has six slots of its own and adds to the carried weight limit. Players can drag items directly between the open cupboard, backpack and pockets or use labeled buttons. An empty cupboard can reopen for storage. Each transfer moves one existing item instance, and the survivor must unequip a worn item before packing or storing it.

Fatigue rises while awake and reduces stamina recovery once fatigue exceeds 35. An indoor bed allows a short nap by day or sleep until 06:00 after 20:00 and before dawn. The survivor must be tired enough and cannot start sleeping with critical needs, active bleeding, an unfinished swing, or immediately detectable danger. Sleeping runs the ordinary simulation faster. It recovers fatigue, advances hunger and thirst, and can end early if those needs become critical or a zombie threatens the survivor or breaches the shelter. Sleep offers no Health recovery. The player can wake early with **E**.

The save stores cupboard and backpack contents, fatigue, and remaining sleep. Existing saves migrate with their item locations intact and start with empty backpack storage and zero fatigue.

- At normal zoom, the player can identify the equipped backpack and bat and see the difference between approaching, backing away in ready stance, and recovering from a swing.
- The player can bring House B’s can home in the backpack, store it in House A’s starter cupboard, and find the same can after Continue.
- A prepared survivor can close the entrance, sleep, and wake the next morning. A zombie that forces the entrance during sleep wakes the survivor and can enter through the opened doorway.

---

## 1. Executive summary

Dead County is a grounded, single-player, browser-based isometric survival game in a deserted suburban neighborhood after a zombie outbreak. The player selects one of **two equally capable default survivors** (male or female), explores a compact neighborhood, enters houses without loading screens, avoids or fights zombies, scavenges essential resources, manages survival needs, and attempts to live as long as possible.

Dead County is a free single-player desktop browser survival game. The expanded release connects the three starter houses to six additional blocks. It includes 21 enterable buildings, 20 authored zombies, melee and stealth, seven item types, a 12-slot inventory, two map views, a local run slot, and a death-and-restart flow.

### 1.1 Product promise

**Explore → Scavenge → Fight or Escape → Manage Survival → Repeat.** There is no win screen or scripted ending; a run ends when player health reaches zero.

### 1.2 Target players

- Fans of accessible, tense, systems-driven zombie survival games.
- Desktop browser users who want to start playing without installing a client or creating an account.
- Players who enjoy scavenging and trade-offs between combat, avoidance and resource management.

### 1.3 MVP objectives

1. Deliver a stable and understandable survival loop from new game through death/restart.
2. Prove believable isometric movement, environment collision, zombie navigation and seamless interiors.
3. Ensure male and female survivors are visually distinct but mechanically equal.
4. Make four survival stats and a small resource economy meaningful.
5. Support accurate, recoverable local continuation of an unfinished run.
6. Ship on Vercel with a consistent, readable, original visual identity.
7. Keep implementation modular enough for later cloud saves without designing a multiplayer backend prematurely.

---

## 2. Authority, approvals, and scope rules

### 2.1 Sources of truth

1. **This `docs/PRD.md`** controls shipped features, player rules, scope, constraints and acceptance criteria.
2. **Approved domain specifications** elaborate implementation without expanding the MVP:
   - `PLAYER_CHARACTER_SPEC.md`
   - `ZOMBIE_CHARACTER_SPEC.md`
   - `MAP_DESIGN_SPEC.md`
   - `BUILDING_INTERIOR_SPEC.md`
3. **`DESIGN_SYSTEM.md`** controls UI tokens, typography, components and interaction presentation.
4. **`ART_DIRECTION.md`** controls the perspective, environment, character and asset-art consistency.
5. **Approved concept images** are visual references only; they are **not** authoritative for game mechanics, item catalogs, map dimensions, sprite frame counts or interactive controls.

A generated concept picture showing a firearm, day/night clock, special zombie stats, a shop, extra building, `E to Enter House`, or a loading transition **does not** authorize that feature.

### 2.2 Approval state

| Design subject | Current decision |
|---|---|
| Player visual direction | **Approved**: one male and one female playable survivor |
| Zombie visual direction | **Approved**: five cosmetic variants; standard gameplay archetype |
| Neighborhood map visual direction | **Approved**: compact abandoned suburb and simplified maps |
| Buildings/interiors visual direction | **Approved with corrections**: continuous world; automatic roof visibility |
| UI design language | **Approved**: dark matte, olive/cream/rust, Bebas Neue/Inter |
| Final individual UI screen mockups | **Not individually approved yet**; implement only documented MVP screens |
| Exact world dimensions / art atlas metrics | **Provisional** pending Phaser/Tiled prototype |

### 2.3 Requirement categories

- **MVP / P0:** Mandatory to declare v1.0 complete.
- **MVP polish / P1:** Necessary for a reasonable release if noted, but may use simpler production equivalents.
- **Post-MVP:** Explicitly excluded from v1.0; requires separate planning and approval.

Do not pull post-MVP capabilities into a milestone because an asset or design mockup happens to depict them.

---

## 3. MVP feature matrix and exclusions

| Domain | **MVP v1.0 includes** | **After MVP / excluded from v1.0** |
|---|---|---|
| Players | 2 selectable default characters: male/female; same mechanics | Character creator, alternate outfits, traits, leveling |
| Environment | 1 handcrafted isometric neighborhood; roads, yards, sidewalks, fences, static cars and props | Open-world streaming, large cities, generated regions, destruction |
| Buildings | 21 enterable destinations, seamless entry, operable openings, door pressure, wedges, and one authored lock | Multistory floors, wider lock distribution, and construction |
| Enemies | 10–20 active zombies, five visual variants, line of sight and sound investigation, FSM and A* navigation | Fast/strong classes, hordes, advanced AI, NPC enemies |
| Combat | Baseball Bat, Kitchen Knife, ready stance, shove knockdown, timed attacks and low Stamina recovery | Firearms, ammunition, durability, skills |
| Player stats | Health, stamina, hunger, thirst; elapsed survival duration | Temperature, disease/infection, sleep, deep injuries |
| Items | Baseball Bat, Canned Food, Water Bottle, Bandage, Trail Mix, Canvas Backpack and Door Wedge | Item stacks, materials, cooking, crafting |
| Inventory | Fixed 12 slots, carry limits, pickup/use/equip/drop | Larger grids, multiple bags or stacks |
| Looting | Cabinet, Drawer, Supply Box inside houses | Mailbox/car looting, random global loot economy |
| HUD/menus | Main, choose survivor, controls, gameplay HUD, inventory, loot, pause/save, game over, confirmations | Crafting/skills/vehicle dashboards, complicated settings |
| Navigation UI | Circular **north-up** minimap, full neighborhood map, player arrow | Fog of war, pins, quest routes, regions, enemy/loot reveal |
| Time/lighting | Day/night cycle, elapsed survival time, reduced nighttime sight range | Dynamic weather |
| Save | 1 active local IndexedDB save slot; manual save/load; game-over invalidates continuation | Accounts, multiple cloud slots, sync and conflict resolution |
| Infrastructure | Static Vite deployment to Vercel, no dedicated backend | Supabase Auth + PostgreSQL JSONB, server-based multiplayer |
| AI | Rule-based finite-state machines and pathfinding; no external AI service | Behavior trees/utility AI and optional NPC-dialogue LLM |
| Audio and effects | Stereo footsteps, groans and door impacts, bat swing and contact cues, inventory feedback | Full soundtrack and cinematic effects |

The Corner Store, Birch Clinic, Cedar Workshop and the other authored landmarks are playable destinations. Searchable containers remain mapped indoor objects.

---

## 4. Core player journeys

### 4.1 Start a new run

1. Load **Main Menu** (`New Game`, `Continue`, `Controls`).
2. Select `New Game`. If an unfinished active save exists, display an explicit overwrite confirmation before destroying it.
3. Open **Choose Survivor** showing equal, selectable cards for **Male Survivor** and **Female Survivor**, including portrait and full-body preview.
4. Select one and click `Start Run`.
5. Spawn inside **House A** on a valid walkable cell with its roof already hidden and a safe route to the exit and baseball bat.
6. Enable the normal gameplay HUD and circular minimap.

### 4.2 Explore and enter houses

1. Use WASD to move outdoors, with Shift to sprint while stamina permits.
2. Open a closed door with **E**, then **walk across the threshold** in the same continuous world. Exterior doors start closed on a fresh run. Cedar Workshop is the sole locked door at the start. Continue restores each saved opening and lock state.
3. Roof automatically hides/fades for the house currently occupied by the player; blocking near walls selectively fade when necessary.
4. Move and fight using the same controls, camera, world and simulation as outdoors.
5. Walk back outside; roof returns without flicker.

### 4.3 Loot supplies

1. Approach an approved reachable indoor container.
2. See contextual `E` interaction hint and press `E`.
3. View the container's remaining predefined contents.
4. Transfer an item to a free inventory slot, or receive a clear `Inventory full` message without losing/duplicating that item.
5. Use canned food, water or a bandage; equip baseball bat as needed.

### 4.4 Fight or escape

1. Zombie wanders until it detects the player within rules for range and line of sight.
2. Zombie chases on the shared walkability grid and may enter houses through valid openings.
3. Player can point the mouse at a threat to establish melee attack direction and **left-click within the Phaser gameplay world** to swing the equipped baseball bat.
4. Phaser maps the mouse pointer into logical world-space for facing; attack windows, range, obstacles and cooldowns determine valid damage.
5. Player death ends the run and shows elapsed survival duration.

### 4.5 Pause, save, continue, and die

1. `Esc` pauses the game and opens `Resume`, `Save Game`, and `Save & Exit`.
2. Save requests write a consistent versioned snapshot to IndexedDB/Dexie and report success **only after persistence succeeds**.
3. `Continue` restores the same character, positions, zombies, loot, inventory and elapsed time; correct indoor roof state is recomputed before reveal.
4. A dead run cannot be resumed; a new run starts from fresh world state.

---

## 5. Functional requirements — world and buildings (P0)

### 5.1 Neighborhood and camera

- **FR-W01–W03:** One fixed isometric neighborhood with streets, sidewalks, yards, fences, static props, basic furniture and mapped indoor loot. The original starter block leads into six additional blocks through connected streets and side routes.
- **FR-W04:** Solid walls, fences, trunks, parked vehicles and solid furniture obstruct movement appropriately.
- **FR-W05:** World depth sorting places sprites based on their **ground/feet** positions and separates foreground occluders as needed.
- **FR-W06:** Roof/occluding walls reveal interior play correctly.
- **FR-W07:** Follow camera stays inside render bounds and works inside/outside without changing perspective.
- **FR-W08:** Navigation data distinguishes walkable and blocked cells shared by player collision and zombie routing.
- **FR-W09:** Named stable houses: `house_a` / Starter, `house_b` / Supply, `house_c` / Risk.
- **FR-W10:** Each house has at least one clearly open, collision-valid doorway linking the **same logical world**.
- **FR-W11:** Entering an interior zone hides/fades the matching house roof; leaving restores it.
- **FR-W12:** Foreground walls only fade as required for player readability; wall collision remains active.
- **FR-W13:** Entry/exit does not require interaction, pause, teleport, separate scene, loading transition, or top-down camera.
- **FR-W14:** Static obstacles and entrances are consistent across rendering, physics, line of sight and navigation.
- **FR-W15:** A newly selected survivor begins inside House A with correct initial roof state and a safe accessible exit.
- **FR-W18:** Across all supported fresh-run starts, place the starter container on a short, visually readable indoor route from the survivor’s initial position. Set initial zombie positions and wander destinations so a newcomer can find it at walking pace, search, transfer the bat and equip it without a mandatory fight. A survivor who spends substantially more active time in House A can encounter an ordinary zombie walking through its open door.
- **FR-W16:** From the first street junction reached after leaving House A, the player can identify House B by its gray siding and distinctive porch at default gameplay zoom and see a plausible way toward it. The map can confirm the destination. Recognition must work with no map assistance or objective marker.
- **FR-W17:** Two traversable routes connect A to B. Measured between the same endpoints, the direct route is shorter and leaves the survivor visible to ordinary zombies for more of the trip. The longer detour provides solid geometry that can block zombie line of sight. Losing sight follows the existing pursuit grace period and reacquisition rules (FR-Z11). Neither route guarantees safety.

### 5.2 House gameplay roles

| House | Purpose | Design and gameplay constraints |
|---|---|---|
| **A — Starter** | Low-risk entry to the game | Spawn indoors, uncluttered reachable route, basic supplies and baseball bat obtainable without mandatory first combat |
| **B — Supply** | Reward exploration | More containers/consumables; readable layout and moderate risk; no locked-room gate |
| **C — Risk** | Higher tension | More clutter, comparatively rewarding loot, greater encounter pressure from ordinary zombies; **no special zombie classes** |

- Only mapped indoor **Cabinet**, **Drawer**, and **Supply Box** objects are searchable.
- Decorative mailboxes, outdoor crates and parked cars are **not** MVP loot containers.
- All three houses must have reachable loot anchors and logically consistent collision and zombie paths.
- Roof state is a **derived rendering value** based on occupancy, not a separately authoritative save field.
- **FR-W19:** The expanded neighborhood contains 21 enterable buildings, including the three original houses and distinct landmarks. Validate routes to supplies using the same seamless movement and occlusion at every entrance.
- **FR-W20:** The contextual E prompt can open or close an indicated door or operable window. Open passages are traversable. Closed openings block movement and direct sight for both sides. Reject a close request when a living actor or dropped item blocks it.
- **FR-W21:** Update world lighting and zombie sight reach from the in-game clock. The clock starts at 08:00. One full day takes 12 minutes of active play at the first tuning pass.
- **FR-W22:** A survivor can use a Door Wedge from inside beside a reachable closed door. The wedge is consumed once and extends the door's resistance to zombies approaching a confirmed last known position. Pursuit still expires in active simulation time. Opening or forcing the door clears its pressure and wedge state.
- **FR-W23:** Play distinct door impacts as pressure builds. Show progressively visible damage and label a reachable door **Strained** or **Near failure** according to its remaining resistance. Recalculate the warning when a wedge increases that resistance.
- **FR-W24:** Cedar Workshop's exterior door starts locked on a fresh run. The neighboring Cedar House cabinet holds one Workshop Key. **E** can unlock and open the workshop door with the key in pockets or the worn backpack. The door also opens from inside after entering through the operable side window. Unlocking preserves the key, and the door remains unlocked after closing. A zombie breach clears the lock. Save and Continue preserve the door and key state. Older runs retain their original workshop access.
- **FR-W25:** Sort foreground wall sections at their local depth. Preserve solid lower edges during a cutaway, fade upper partitions where they cover the survivor, and render wide-open door leaves against the adjacent wall. Sweep movement against the same solid geometry used for zombie navigation.

### 5.3 Map dimensions and asset conventions

- Isometric presentation ratio is **2:1**; **64×32 source-pixel ground tiles** are a provisional prototype target, **not an approved final art resolution**.
- Do not adopt concept image labels such as `128×128` or `256×256` tiles as actual specifications.
- Test one street junction and one house doorway at intended camera zoom with the approved survivor/zombie proportions before locking map dimensions, tile density, collision geometry, house footprints, or camera scale.
- Keep world physics and pathfinding in **logical 2D coordinates**; project visually into the isometric view.
- Tiled data should separate ground, detail, walls, furniture, roofs, navigation, actors/spawns and trigger zones.

### 5.4 Acceptance

- Player can traverse neighborhood, reach and freely enter/exit Houses A/B/C without scene changes.
- Roof and near-wall occlusion stays correct, including when new runs start and when saved indoor games load.
- A zombie can follow a genuinely valid entry route without walking through walls.
- No decorative object silently adds an unapproved game mechanic or blocks the only path to essential supplies.

---

## 6. Functional requirements — playable survivors (P0)

- **FR-P01–P03:** WASD moves in eight directions relative to the screen. W goes up, S down, A left and D right. Convert the input direction through the inverse isometric projection, normalize the nonzero world-space vector, and use the configured walking or sprinting speed. Apply the same movement and collision checks to cardinal and diagonal input.
- **FR-P04–P06:** Sprint spends Stamina and recovery uses the ordinary rules while the survivor is not sprinting. When Stamina reaches zero, immediately fall back to walking speed and cancel the current sprint request. A new sprint after exhaustion requires releasing Shift and pressing it again with sufficient Stamina. Recovery while Shift stays held cannot restart sprinting.
- **FR-P07:** Both survivors have readable idle, walk, sprint, bat attack and death animations. Locomotion reflects actual movement and current gait. Fully blocked movement settles into idle. Sprint exhaustion shows a walk as speed falls. Committed attacks and death retain their own presentation. A confirmed bite gives the survivor a brief hit cue.
- **FR-P08:** Actor collision/body works against world and zombie bodies.
- **FR-P09:** `E` triggers a nearby permitted search/interaction only.
- **FR-P10:** On New Game choose either `survivor_male` or `survivor_female`.
- **FR-P11:** Both characters use identical health, speed, stamina, inventory, combat, hitboxes, attack range and interaction rules.
- **FR-P12:** Before the first active simulation step of every fresh run, either survivor has Health 100/100, Stamina 100/100, Hunger 0/100 and Thirst 0/100. All 12 inventory slots are empty and the equipped weapon is null. These defaults apply at run creation. Continue restores the saved values.

### 6.1 Approved looks

- **Male survivor (`survivor_male`):** ordinary adult; messy dark hair, worn muted olive jacket, dark layers/trousers, practical brown boots and a worn canvas backpack.
- **Female survivor (`survivor_female`):** ordinary adult; tied-back dark/brown hair, faded rust-burgundy utility jacket, dark functional trousers, brown boots and same-capacity canvas backpack.
- Characters should look **alive and grounded**, with believable breathing, foot contact, weight transfer and subtle clothing/backpack secondary motion.
- The survivor portraits and base sprites can show cosmetic gear. Carry capacity changes only when the player equips a scavenged Canvas Backpack.
- Eight-direction presentation is the target, with pragmatic reuse only when visual credibility is maintained.
- No clothing customization, traits, classes, biographies or gender-based mechanics.

### 6.2 Acceptance

Both characters can independently start a run, walk, sprint, fight, loot, save, continue, die and restart; changing character choice must never change combat stats or silently swap after Continue.

---

## 7. Functional requirements — zombie AI (P0)

### 7.1 One gameplay archetype; five cosmetic looks

- **FR-Z01:** Place 10–20 standard zombies at valid starting positions in the neighborhood. From the first active simulation step, use ordinary wandering, perception, pursuit, movement and collision rules. Opening safety comes from authored layout and initial placement. Temporary invulnerability, frozen zombies, scripted delays and invisible barriers are excluded. Taking or equipping the starter bat changes inventory or equipment only and triggers no special world or zombie event.
- **FR-Z02–Z03:** FSM supports `Idle`, `Wander`, `Chase`, `Attack`, `Dead` and wandering/idle when no target is detected.
- **FR-Z04–Z05:** Configurable distance plus basic line-of-sight detection triggers chase.
- **FR-Z06:** Pathfinding (A* or equivalent) avoids common static obstacles.
- **FR-Z07–Z08:** Attack when in range, respecting a cooldown and applying player damage.
- **FR-Z09–Z10:** Zombies have health; dead zombies cannot chase, attack or obstruct the world unexpectedly.
- **FR-Z11:** A zombie eventually abandons chase when the player is lost for a configurable period, unless reacquired.
- **FR-Z12:** Each zombie has a stable cosmetic appearance ID from the five approved values.
- **FR-Z13:** Cosmetic choice changes **no** AI, collision, health, speed, damage, attack reach or cooldown.
- **FR-Z14:** Assets include recognizably male and female civilian zombie silhouettes in the same visual style.
- **FR-Z15:** Idle, locomotion/chase, attack and death visuals are readable at default zoom. Confirmed bat damage gives a visible hit cue. A dedicated hurt animation is optional.
- **FR-Z16:** Wander and Chase use the same walkable grid, collision geometry and traversable open doorways. An ordinary zombie that has never detected the survivor can wander from outdoors into House A. In both states, solid walls, closed doorways and other blocked geometry prevent passage.
- **FR-Z19:** A zombie encountered inside House A on a later visit must have entered through simulated movement along a valid route. Returning, revealing the roof or activating a distant area cannot spawn, relocate or reroll it. Save & Exit and Continue preserve its identity, position and movement state. If distance-based simulation is used, its return-visit outcome must remain consistent with ordinary simulation.
- **FR-Z20:** On a comparable clear route, a pursuing zombie moves slightly faster than a walking survivor, while a survivor sprinting with available stamina moves faster than the zombie. Sprint spends stamina and changes distance. Detection, sight loss, the last known position and pursuit expiry still govern Chase. Tune speeds and sprint drain in the playable map.
- **FR-Z21:** Footsteps, bat swings and opening interactions emit sound at their world position. Sprinting carries farther than walking. Cover reduces sound reach. A zombie can investigate the last audible point, with its own simulation timer. Confirmed sighting takes priority and existing pursuit continues using its last visible position.
- **FR-Z22:** Render a zombie only when its position lies in the survivor's field of view and has a clear sight line. Nearby threats around the survivor have a wider viewing angle. Audible footsteps and groans can still be heard through cover, with reduced volume and stereo direction. Holding C lowers speed, footstep noise, and the range at which zombies see the survivor.
- **FR-Z23:** Forward vision extends farther than side or rear vision. An audible hidden zombie can briefly indicate a general direction beside the survivor. Keep the actor hidden until ordinary sight succeeds. Reduce the volume and higher frequencies of blocked sounds.
- **FR-Z17:** Each zombie records the survivor’s last known position only when its own perception check confirms range and line of sight. On losing sight, it pursues that fixed world position for the remaining grace period. Hidden survivor movement cannot update the destination. Arrival permits waiting and checking visibility. The first successful reacquisition updates the position and immediately resumes visible Chase.
- **FR-Z18:** The grace period starts on loss of confirmed visibility and advances only during active simulation. Arrival, repeated failed visibility checks and path retries leave its expiry unchanged. If the position is unreachable, use the existing obstacle-aware navigation failure behavior and continue perception checks from a valid position. On expiry without reacquisition, abandon the pursuit path and start ordinary Wander at the zombie’s current world position. Its spawn and former patrol area have no special priority. Normal perception remains active during Wander.

Approved appearance IDs:

| ID | Appearance only | Stats/behavior |
|---|---|---|
| `zombie_civilian` | Common civilian, predominantly male-presenting concept | Standard |
| `zombie_worker` | Worn worker clothing | Standard |
| `zombie_hoodie` | Torn hoodie | Standard |
| `zombie_female` | Female-presenting civilian | Standard |
| `zombie_bloody` | More visibly bloodied civilian | Standard |

A label like **Fast**, **High HP**, or **Aggressive** shown in old concept art is **not** a gameplay requirement. Male and female appearances remain non-mechanical.

### 7.2 FSM and navigation rules

- `Idle/Wander → Chase` on valid player detection.
- `Chase → Attack` on valid attack range and line of sight.
- `Attack → Chase` if out of range.
- Within Chase, loss of visibility changes the navigation target to the last known position. Reacquisition ends that loss interval. If grace expires first, transition to Wander in place (FR-Z17–Z18).
- Any living state → `Dead` at zero HP.
- Chase may reuse ordinary walk/locomotion frames; running zombie classes are not MVP scope.
- Do not recompute an entire A* path on every render frame. Throttle AI/path requests and manage unreachable routes safely.
- Zombie population does not automatically respawn or form large dynamic hordes in v1.0.
- Hearing uses the simulation's world sound events. Perception and pursuit use local rules.

### 7.3 Acceptance

With 20 active zombies, wandering, detection, chase, attack, death and doorway navigation work without obvious wall clipping or unbounded pathfinding stalls. Saved zombie appearance, position and alive/dead state remain stable after reload.

---

## 8. Functional requirements — combat, survival and items (P0)

### 8.1 Combat

- **FR-C01–C03:** Obtain, equip and swing the Baseball Bat or Kitchen Knife. The knife is in the House B kitchen cabinet, swings faster and more quietly, and has shorter reach and lower damage than the bat.
- **FR-C04–C06:** Attack requires an alive/eligible player and a valid attack state; direction, range, obstruction and hit timing determine zombie damage.
- **FR-C07–C08:** Clear hit feedback and small knockback when appropriate.
- **FR-C09–C10:** Zombie attacks affect player health and cooldown prevents unintentional multi-hits.
- **FR-C11:** Combat input is suppressed while gameplay is paused or a blocking menu/overlay is active.
- **FR-C12:** Primary mouse button (**Left Click**) on the active game world triggers one eligible attack with the equipped melee weapon.
- **FR-C13:** At the click that starts a swing, convert the pointer to logical world coordinates and lock the direction from the survivor to that point. Use that direction throughout the swing and show the nearest supported facing animation. As the survivor steps, the swing arc moves with them and keeps its heading.
- **FR-C14:** Attacks use existing combat range, attack arc, line-of-sight/solid-obstacle and cooldown checks; the cursor itself does not select an automatically hit target.
- **FR-C15:** A click on any React menu, HUD/minimap control, inventory, map, loot panel, dialog or other interactive overlay must **not** trigger a world attack. Clicking while paused, dead, unarmed, during a blocking overlay or while otherwise ineligible also cannot attack.
- **FR-C16:** When the mouse is directly over the player's world anchor (insufficient direction vector), retain the last valid facing rather than allowing an undefined aim or direction flicker.
- **FR-C17:** A melee swing can damage at most one zombie, once. At contact, consider living zombies within reach and inside the locked swing arc with a clear strike path. Choose the one with the smallest angle from the centerline. At equal angles choose the nearer zombie. At equal angle and distance choose the lowest stable zombie instance ID in ordinal string order. An empty set produces a miss.
- **FR-C18:** From wind-up through contact and the end of recovery, the survivor can take slow steps in any normal movement direction. Starting a swing while sprinting immediately reduces movement to that pace. Sprint becomes available again after recovery if stamina permits.
- **FR-C19:** Each zombie can damage the survivor once per attack and has its own recovery. Two bites that both land deal both hits, including on the same gameplay step. A survivor who leaves the second zombie's reach before its contact takes only the first hit.
- **FR-C20:** A nonlethal hit lets an ongoing swing or bite finish. Resolve reach and obstruction at contact using the actors' current positions, including any prior knockback. Death ends the actor's attack.
- **FR-C21:** A swing costs zero stamina and can start at zero stamina. Starting a swing below 25 Stamina adds 150 ms to its recovery. Slow steps and the normal contact timing still apply.
- **FR-C22:** Inventory and pause overlays own the entire pointer gesture on their controls, including release over the world after the overlay closes. Clicking Use, a slot, Close or Resume produces zero new attack commands, immediately or on the next gameplay step. A fresh press in the active gameplay world is required for the next swing.
- **FR-C23:** A hit and a miss use the same animation and sound for that weapon. Confirmed melee hits add a separate impact sound, recoil, and a restrained blood burst. Confirmed bites play their own sound and mark the survivor's impact point. The impacted actor must be identifiable at default zoom with audio muted. Use the actual damage event to time these cues and keep reduced-motion feedback readable.
- **FR-C24:** A zombie bite has a visually distinct anticipation pose before contact, then a bite motion and a readable recovery. The pose is readable at default zoom. Playtest whether a newcomer recognizes it in time to try stepping clear. Damage timing and reach follow the gameplay rules.
- **FR-C25:** Holding the right mouse button in the world keeps the survivor facing their aim and slows movement. Pressing Space spends Stamina to commit a short shove. The shove selects one visible, in-range target with the deterministic attack ordering and knocks it down briefly without damage. The downed zombie cannot bite or move and cannot be shoved again until it stands. An ordinary melee swing can hit it with the same reach and targeting rules. Knockdown freezes on pause and survives Continue.
- **FR-C26:** With a weapon equipped, holding the right mouse button shows a ground arc at the weapon's reach and a small bracket on the currently reachable, visible target selected by the existing attack rules. Solid geometry clips the guide. During wind-up, the bracket clears and the arc follows the committed swing direction until contact. Releasing aim or opening an overlay hides the guide.
- **FR-C26:** In the ready stance, side steps are slower than forward steps and back steps are slower than side steps. Shove recovery delays Stamina regeneration. Apply only the portion of a shove's displacement that fits before solid geometry.
- Unarmed is an allowed equipment **display state**; a full unarmed combat damage system is **not** mandatory. The Baseball Bat and Kitchen Knife share the same equipment slot.
- No firearm, ammunition, critical hit trees, weapon durability, blocking skill or limb-specific simulation.

**House B playtest target.** Give a survivor the bat and place one standard zombie near the entrance. A player who reads its wind-up and times their swings should be able to handle it. Repeat with a second zombie close enough to reach the survivor during a swing at the first. Withdrawing to separate them should be a better bet than standing in reach of both. Use this scene to tune reach, damage and recovery.

**Doorway check.** Put both zombies in reach. Aim toward the farther zombie with the nearer one off-center, then repeat with both on the same line. Verify which single zombie takes the hit in each setup. Have the survivor step back during recovery and attempt to sprint. Compare standing within reach of both bites with stepping clear of the second before contact.

### 8.2 Survival stats

| Stat | Range | Meaning of 0 | Meaning of 100 |
|---|---|---|---|
| **Health** | 0–100 | Dead | Maximum health |
| **Stamina** | 0–100 | Exhausted | Fully recovered |
| **Hunger** | 0–100 | Fed / healthy | Critical hunger |
| **Thirst** | 0–100 | Hydrated / healthy | Critical thirst |

- **FR-S01–S02:** Zombie attacks reduce health; death at `health = 0` ends run.
- **FR-S03–S04:** Sprint drains stamina; stamina recovers under configured conditions.
- **FR-S05–S06:** Hunger and thirst progression starts on the first active gameplay step using the configured rates. All blocking pause reasons freeze need progression and survival timers until gameplay can resume.
- **FR-S07–S09:** Food reduces hunger severity, water reduces thirst severity, bandage restores bounded health.
- **FR-S10:** Untreated critical hunger or critical thirst gradually drains health during active play and can kill the survivor. The HUD warns early enough for a player in House A to reach supplies. Once its supplies run out, sheltering there indefinitely is fatal even if no zombie reaches the player.
- **FR-S11–S13:** HUD presents all stats; paused/menu states do not advance stats; all values remain inside 0–100.
- **FR-S14:** When hunger and thirst are both critical, show both warnings and drain health at the higher of their two active rates. If food or water relieves one need, its warning clears and the remaining critical need determines the drain. Relieving both stops health loss from these needs.
- **FR-S15:** Tune need rates and damage thresholds against the playable opening. A newcomer following a viable House A → detour → House B kitchen route at cautious walking pace has time to collect and equip the starter bat and transfer the guaranteed can before either need drains health. Hunger and thirst follow their normal active-step rules throughout. Pauses freeze progression.
- **FR-S16:** Explicit, eligible Bandage Use is the only way to restore lost Health in the MVP. Standing or walking without sprint can restore Stamina under its ordinary rules. Health remains at its current value unless damaged or healed by a bandage. Use consumes one bandage, caps Health at 100 and is disabled at full Health. Healing amount and availability are tuning values.
- **FR-S17:** A confirmed bite briefly cues the survivor and updates Health. When critical Hunger or Thirst drains Health, the corresponding need meter identifies the cause with a label or icon. Both warnings remain visible when both needs are critical, following FR-S14. The bite cue is reserved for confirmed bites.
- **FR-S18:** A bite causes bleeding that drains Health during active play. Display bleeding separately from Hunger and Thirst warnings. One explicit Bandage use stops bleeding and restores Health up to the limit. Store wounds and opening state alongside the investigation state. Existing schema-one runs migrate on read and commit the new schema on the next successful save.
- **Elapsed survival duration** measures active run time and is **not** an in-world day/night clock.
- Initial numeric rates for hunger, thirst, detection, health/damage and stamina are tuning constants, not locked in the concept images.

### 8.3 Inventory

- **FR-I01–I03:** 12 fixed slots (UI: 4×3), one item instance in each occupied slot.
- **FR-I04:** No stacking/quantity badges in MVP.
- **FR-I05:** Reject pickup/transfer when inventory is full without losing items.
- **FR-I06–I09:** Centralized item definitions; pickup, drop, use, equip and removal of consumed items; dropped items remain recoverable in the world.
- **FR-I10:** Save/load preserves inventory/equipment.
- **FR-I11:** Disable Use and preserve the item when a bandage would heal zero health, food would relieve zero hunger, or water would relieve zero thirst. Explain the reason beside the action. Any positive benefit enables Use, even when the stat limit reduces the item's effect.
- **FR-I12:** From the start of a swing through the end of recovery, the equipped bat stays equipped. In inventory, disable Unequip and Drop for that instance and show “Finish your swing first.” Other inventory actions follow their usual rules. When all pause reasons clear and any required Resume occurs, the same swing continues from its paused phase.
- **FR-I13:** World pickups and container transfers place the same item instance in the first empty slot, scanning left to right across each row from the top. Other items keep their slots. Picking up a bat leaves it unequipped and preserves any other equipped bat.
- **FR-I14:** Try the survivor’s feet first. If blocked, try the nearest walkable position within immediate pickup reach on the same side of the obstacle. Validate the position and successfully place the item in the world before clearing its original slot or equipped reference. Commit these changes together. If validation or placement fails, keep the instance in its original slot with its prior equipment state, discard any partial world drop, and show “Cannot drop item here.”
- **FR-I15:** After a successful Transfer, briefly highlight the receiving slot in the Loot panel. After Equip, mark the bat’s occupied slot as equipped. After Use, show the affected stat and resulting value in the open panel. Trigger these cues from successful gameplay results. Rejected or disabled actions show the appropriate existing state or error.
- **FR-I16:** In Inventory and Loot, drag an inventory item to an empty slot to move it or onto another item to swap their positions. **Move** and selecting a destination provide a keyboard and click alternative. Reordering keeps each item's identity, equipped state and saved slot. Dragging an inventory item onto **Drop** uses FR-I14. Cancelling or releasing outside a valid target leaves all items in place.
- **FR-I17:** The HUD mirrors the first ten positions of the same inventory as clickable quick slots. Activating an occupied bat slot during play equips that instance directly when no swing is active. Activating another occupied slot opens Inventory with that item selected. Empty slots have no action.
- **FR-I18:** Display carried weight and capacity. Pickups and transfers must fit both the weight limit and a vacant slot. A Canvas Backpack raises capacity from 5 kg to 9 kg when equipped. If unequipping or dropping it would leave the survivor over the base limit, the backpack stays equipped and inventory stays intact. Earlier saves may start above the base limit and can free weight normally.
- **FR-I19:** Show **Heavy load** above 3.5 kg. Additional weight increases sprint Stamina drain and slows recovery while gameplay is active. Calculate exertion from the actual carried weight, even when capacity changes.

**Guaranteed starter and essential supply types:**

| Item ID (illustrative) | Display name | Gameplay action |
|---|---|---|
| `baseball_bat` | Baseball Bat | Equip for longer melee reach and heavier hits |
| `kitchen_knife` | Kitchen Knife | Equip for faster melee swings at close range |
| `canned_food` | Canned Food | Consume to lower Hunger severity |
| `water_bottle` | Water Bottle | Consume to lower Thirst severity |
| `bandage` | Bandage | Use to restore Health |

Use one instance per slot; the specific internal identifiers may be centralized and documented before coding.

### 8.4 Looting

- **FR-L01–L04:** Every house has at least one approved lootable container; display `E` prompt when in valid range and allow interaction.
- **FR-L05–L08:** Transfer only if there is capacity, remove taken items from container, persist depletion, and ensure a baseball bat is reachable safely in House A.
- **FR-L09:** `E` means search/interact, **not house entry**.
- **FR-L10–L11:** Searchable containers are Cabinet, Drawer and Supply Box. Additional authored loot includes a Canvas Backpack and Door Wedge in House B's living-room cabinet, plus Trail Mix in the expanded neighborhood.
- **FR-L12:** House B supplies scavenging opportunities; House C creates reward/tension using current normal mechanics.
- **FR-L16:** Every fresh run seeds House A’s designated starter container with exactly one Baseball Bat and at least one Water Bottle, independent of survivor choice and loot rolls. Reach it by the short indoor route in FR-W18. Pressing `E Search` opens the ordinary blocking Loot interface. Transfer each selected instance into the first empty inventory slot, left to right and top to bottom. The bat requires explicit Equip. Water requires explicit Use, which is disabled at zero Thirst. Other House A containers may hold optional supplies.
- **FR-L17:** The starter container uses the same container identity, pause, transfer and persistence rules as other searchable containers. Seed its contents only at fresh-run creation. Reopening it or continuing a save restores the remaining instances, including an empty container.
- **FR-L18:** Every fresh run places at least one Canned Food in House B’s designated kitchen container. Either approved route from House A leads to B’s walkable entrance. `E Search` and Transfer move the same food instance from the container to the first empty inventory slot. The food can be carried for later, with Use disabled at zero Hunger. Reopening or continuing restores both the inventory instance and the container’s depletion. Optional stock in Houses A and B can be tuned. House C’s food and water minimum is covered by FR-L15.
- **FR-L19:** Provide a short, clear, walkable route from House B’s normal entrance to the kitchen. Use room layout and visible furnishings to make the route understandable at default gameplay zoom without navigation markers. The survivor can position themselves around ordinary enemies and complete the trip without mandatory combat in a viable encounter. Wander, line of sight, pursuit and open-doorway movement apply throughout the house. Use the same walkable geometry for both sides, with no exclusion zones, invisible safety barriers or route-specific AI restrictions. Optional loot elsewhere can reward a longer visit.
- **FR-L15:** Every fresh run places at least one Canned Food and one Water Bottle in obtainable House C loot. A survivor can reach the relevant container interaction points from the entrance, search them, and transfer both items with free inventory slots. Container locations and quantities above those minima are tunable. Apply the minimum at run creation only. Continue restores remaining contents. Balance the finite supply against ordinary encounter risk, travel time and ongoing hunger and thirst.
- **FR-L13:** Loot anchors must be reachable and not interactable through walls or blocked room boundaries.
- **FR-L14:** Show one anchored prompt for the nearest reachable nonempty searchable container or dropped item within interaction range. Use `E Search` for the container and `E Pick up <item name>` for the drop. At equal distances choose the drop, then use stable instance ID to resolve ties within a kind. Each press acts once on the displayed target after checking it is still eligible. Pickup moves the loose item directly into a vacant inventory slot. A full inventory leaves the drop in place and shows `Inventory full`.
- **FR-L20:** A player may drag a container item onto the Inventory grid or activate **Transfer**. Both actions transfer one instance to the first open slot under FR-I13. During a drag, indicate the receiving slot and keep the item in its container if the inventory is full.
- Containers may use predetermined contents; large randomized loot tables are post-MVP.

---

## 9. Functional requirements — minimap and full map (P0)

The earlier PRD's **“world map after MVP”** classification is superseded. The following basic navigation UI is **required for MVP**.

- **FR-MAP01:** Circular minimap displayed at top right during active gameplay, indoors and outdoors.
- **FR-MAP02:** Render simplified local street and building geometry plus player position/facing.
- **FR-MAP03:** Minimap is **north-up fixed**; only player arrow rotates as player faces another direction.
- **FR-MAP04:** Do not show zombie positions, loot, hidden container contents or enemy alerts.
- **FR-MAP05:** Clicking/keyboard-activating minimap, or pressing `M`, opens the full map.
- **FR-MAP06:** The full map displays the connected neighborhood, enterable building footprints, named landmarks and player position.
- **FR-MAP07:** `M`, `Esc`, or close control dismisses full map.
- **FR-MAP08:** Full map pauses game simulation, survival stats, zombie AI and elapsed survival timer; gameplay commands are blocked.
- **FR-MAP09:** Both map views use local world data; no API key, online map service or backend is required.
- **FR-MAP10:** Minimap and full map use consistent geometry and player coordinates.

**Appearance defaults:** circular minimap around 150px diameter at 1280×720, adjustable after UI testing; full map is a readable charcoal-surface overlay; neighborhood—not room-floor—navigation is shown indoors.

**Post-MVP only:** fog of war, discovered-place management, custom pins, quest routes, multi-region maps, zombie markers, loot hints and other map modes.

---

## 10. Functional requirements — menus and game lifecycle (P0)

### 10.1 Required React screens

| Screen / panel | Required behavior |
|---|---|
| **Main Menu** | New Game; Continue only for valid alive save; Controls |
| **Choose Survivor** | Two equal male/female cards, portrait/full-body preview, visible selection, Start Run, Back |
| **Gameplay HUD** | Four survival stats, elapsed duration, equipped bat/unarmed, interaction hint, circular minimap |
| **Full Map** | Open via `M`/minimap click; pause and close correctly |
| **Inventory** | 12 slots, selection, item details, equip/use/drop |
| **Loot Container** | Current remaining items, Transfer, error on full inventory |
| **Pause Menu** | Resume, Save Game, Save & Exit |
| **Game Over** | Elapsed survival duration, New Run, Main Menu; no Continue for dead save |
| **Controls** | Readable static keyboard reference |
| **Confirmation** | Explicit overwrite confirmation before replacing an unfinished run |

### 10.2 UI / lifecycle requirements

- **FR-UI01–UI03:** React renders menus/HUD, while Phaser is the gameplay authority; use a typed communication bridge.
- **FR-UI04:** Menu transitions and restarts must not duplicate Phaser instances, controls or listeners.
- **FR-UI05:** Pausing blocks simulation and unintended gameplay actions.
- **FR-UI06:** Desktop overlays remain usable at the target viewport sizes.
- **FR-UI07:** Choose Survivor supports keyboard-accessible selection and gives both options equal prominence.
- **FR-UI08:** Track hidden tab, Inventory, Loot, Full Map, Pause menu and pending save as independent reasons to hold the simulation. Each close or completion clears only its own reason. Hiding the tab also requires an explicit Resume when visible again. Restore any foreground panel first, then offer Resume when it closes. Ordinary overlay dismissal in an uninterrupted visible tab still resumes play when it clears the last reason. [Pause decision](adr/0002-independent-pause-reasons.md)
- **FR-UI09:** Only a live, ready run in its owning tab may advance. While blocked, freeze the encounter and active timer. On resume, start from that instant without applying elapsed background time.
- **FR-UI10:** When gameplay becomes blocked, including by Inventory, Loot, Full Map, Pause Menu or tab hiding, immediately clear gameplay WASD and Shift input. Keys already held or pressed while blocked cannot drive movement on return. Require release and a fresh valid keydown during active play. Ignore browser key repeats as new presses. Save & Exit → Continue also starts with no held movement input. Clear only transient input and any sprint request. Preserve the active attack phase, locked direction and remaining recovery under FR-SAVE14.
- `I` toggles inventory. **While inventory is open**, pause/suppress gameplay so zombie attacks and survival clocks do not progress unnoticed.
- The loot panel is a blocking interaction overlay; suppress gameplay input, and for MVP use the same pausing convention as inventory so the interaction model remains consistent.
- Modal windows should handle Escape without accidentally firing both UI and world commands.
- UI focus must be visible; meaningful text cannot be communicated only by color.

### 10.3 Controls

| Input | MVP action |
|---|---|
| `W` `A` `S` `D` | Move up, left, down or right on screen. Combine keys for diagonals. |
| `Shift` + movement | Sprint while Stamina permits. After exhaustion, release and press Shift again. |
| `Left Mouse Click` (on game world) | Equipped melee weapon attack, if alive, equipped, unpaused, and eligible |
| Move mouse over game world | Aim/face toward mouse in logical world space; no free-aim projectiles or auto-targeting |
| `Space` | Unassigned in MVP (push/shove is a possible future feature) |
| `E` | Search the indicated container or pick up the indicated dropped item |
| `I` | Toggle inventory |
| `M` | Toggle full neighborhood map |
| Click circular minimap | Open full neighborhood map |
| `Esc` | Close foreground overlay if applicable, else pause/resume |

The UI must suppress world input while menu controls are focused. React controls, including the circular minimap, must intercept pointer presses before they reach combat. Right-click aiming uses the same world-space direction as the bat swing. The control scheme is for desktop keyboard and mouse.

### 10.4 Run states

`MainMenu → CharacterSelection → Playing ↔ Paused/BlockingOverlay → GameOver → (NewRun or MainMenu)`.

- **FR-G01–G03:** New Run builds a clean state, safe House A spawn, and an active-gameplay survival timer.
- **FR-G04–G05:** Death ends the run and invalidates Continue.
- **FR-G06–G07:** Restart resets world, survivors, zombies, loot and stats; existing unfinished save requires explicit overwrite confirmation.
- **FR-G08:** Character ID chosen at New Game persists and restores via Continue.
- **FR-G09:** Use one authored fresh-run setup for both survivors. Set zombie positions, initial wander destinations and container contents from the same map configuration on every fresh run. The authored contents include House A’s bat and water in its starter container, House B’s can in its kitchen container and reachable food and water in House C. Update optional loot by editing this configuration during balancing. Ordinary zombie simulation starts on the first active step. Where ongoing decisions use randomness, support a fixed seed in playtest runs for repeatability. The world and starting placements are authored.

---

## 11. Functional requirements — save/load and future migration (P0)

### 11.1 MVP persistence

- **FR-SAVE01:** Exactly one active local save slot in **IndexedDB using Dexie.js**.
- **FR-SAVE02–03:** Manual `Save Game` and `Save & Exit`; do not autosave as a hidden MVP requirement.
- **FR-SAVE04:** `Continue` only loads a valid, alive, compatible snapshot.
- **FR-SAVE05:** Each save includes a schema version and world/map version.
- **FR-SAVE06–07:** Corrupt/unsupported data produces a recoverable error; failed write must not claim success or unnecessarily destroy the last valid save.
- **FR-SAVE08:** Snapshot records player, inventory/equipment, loot, dropped items, zombies, run state and duration needed to resume.
- **FR-SAVE09:** Dead run is invalidated and cannot be continued.
- **FR-SAVE10:** Game code depends on an explicit storage-agnostic `SaveRepository` interface rather than direct IndexedDB calls.
- **FR-SAVE11:** Save and validate chosen `characterId` (`survivor_male` or `survivor_female`).
- **FR-SAVE12:** Save zombie cosmetic IDs and living/dead state (with positions/health as applicable).
- **FR-SAVE13:** On load, **derive** roof/foreground-wall visibility from player occupancy; do not use saved roof alpha as gameplay truth.
- **FR-SAVE14:** Continue restores the survivor and each zombie at the same point in any attack or recovery. Preserve the attack phase, whether damage has already been applied, and the active gameplay time remaining until the next phase or eligible attack. A bat swing also preserves its locked world-space direction through Continue. [ADR 0001](adr/0001-preserve-attack-timing.md)
- **FR-SAVE25:** For each living zombie, save its world position, current logical AI and pursuit state, last confirmed visible survivor position when applicable, and remaining pursuit duration in active simulation time. On Continue, restore those values before the first active step. For lost sight, rebuild navigation from that zombie’s saved position to its saved last sighting on the current compatible map. Exclude computed paths and waypoints from the snapshot and discard cached routes on load.
- **FR-SAVE26:** Pause, save, loading, path reconstruction, ordinary resume and time outside the game consume zero pursuit time and never refresh the grace period. When active play resumes, use normal range and line-of-sight checks for reacquisition. If the survivor remains unseen when grace reaches zero, enter Wander from the zombie’s current position. [Per-zombie save fields](ZOMBIE_CHARACTER_SPEC.md#81-pursuit-snapshot)
- **FR-SAVE27:** For each living zombie in ordinary Idle or Wander, save its current logical state, world position, chosen wander destination or explicit absence, and remaining idle wait in active simulation seconds. Restore these before the first active step. Only active simulation spends the wait.
- **FR-SAVE28:** Rebuild the route from the saved position to the saved destination using current compatible navigation data. Loading and path reconstruction consume zero random draws. A zombie with no saved destination keeps that state until its ordinary selection rule runs in active play. During restoration of an unfinished wander, only confirmed unreachability permits abandoning the saved destination for a replacement. Use the normal bounded pathfinding failure behavior. [Wander snapshot and comparison](ZOMBIE_CHARACTER_SPEC.md#83-wander-snapshot)

### 11.2 Local run ownership and save shape

**Single local slot across tabs**

- **FR-SAVE15:** Only one tab may own, simulate or modify the local run. Pausing or hiding its tab retains ownership. Other tabs show “This run is open in another tab.” Acquisition requires safe release or proof the prior owner is gone. Silence or elapsed time alone cannot establish abandonment.
- **FR-SAVE16:** Every gameplay write validates current ownership and the expected save revision inside its committing IndexedDB transaction. Creation, replacement, manual saves, Save & Exit and death invalidation all use this guard. FR-SAVE24 defines the sole alternative for a confirmed damaged record with an unreadable revision. A mismatch aborts the transaction. The save revision is independent of schema and world versions.
- **FR-SAVE17:** After acquisition, suspend any cached run. Read and validate the latest committed IndexedDB state and revision before replacing local memory or enabling play. A failed read preserves the frozen in-memory state. Unexpected closure releases no implied save. A replacement owner can recover only a successfully committed state. [Ownership and save decision](adr/0003-exclusive-local-run-and-save-revisions.md)
- **FR-SAVE18:** A blocked tab may refresh menu availability after release. Only the player's explicit Continue starts an acquisition attempt to resume that run. When two tabs choose Continue, the winner loads the latest committed record under exclusive ownership. The losing tab returns to the blocked state. It must wait for another player action before trying again.
- **FR-SAVE19:** A save revision conflict freezes gameplay and displays “Your progress wasn’t saved because the local save changed.” Offer **Reload latest save** with the visible warning “Reloading will discard unsaved progress in this tab.” The player's choice authorizes replacing local memory from IndexedDB. Verify exclusive ownership and read the latest committed record and revision before replacing memory. Reload leaves the stored snapshot and revision intact. A validated live run returns to Pause for deliberate Resume, subject to all pause reasons. A dead survivor returns to Main Menu with Continue disabled.
- **FR-SAVE20:** An ownership failure sends the tab to the blocked state, including when ownership is lost before Reload latest save. Offer **Try again** for an ordinary storage failure only when ownership and expected revision remain valid. Each retry validates both again inside the same IndexedDB transaction as its write. If ownership and revision both differ, show the ownership-blocked state. Failed attempts leave committed data intact.
- **FR-SAVE21:** A failed IndexedDB read leaves the slot contents unknown. Freeze gameplay, preserve any current in-memory run, and offer **Try reading again**. Verify ownership and retry only the read. Loss of ownership returns the tab to the blocked menu. A read failure authorizes zero writes.
- **FR-SAVE22:** After a successful read, inspect the explicit save-schema version before validating the gameplay payload. A newer unsupported schema disables Continue and displays “This save uses a newer save format. Open it with a compatible version of Dead County.” Preserve the record and block replacement, including through New Game. Application release numbers alone do not establish compatibility.
- **FR-SAVE23:** Offer **Replace damaged save** only after a successful read positively identifies malformed data under a known format or a violation of the common record header. Require explicit confirmation tied to that record. Preserve it through character selection and while preparing and validating the new run, including safe survivor placement in House A. Enter gameplay only after replacement commits.
- **FR-SAVE24:** Within one IndexedDB write transaction, verify ownership and that the record authorized for replacement is still current. Check its expected revision when readable. If unreadable, re-read the original slot key and compare the complete stored record with the immutable value captured at diagnosis. Abort if equality cannot be established. Cancellation, failed validation or placement, a changed record, lost ownership, and transaction failure all preserve the stored record. Report failures and require a fresh diagnosis and consent for a changed record. [Damaged-save decision](adr/0004-confirmed-damaged-save-replacement.md)

```ts
// Slot metadata survives replacement of the run payload.
interface LocalSaveSlot {
  ownerToken: string | null;
  saveRevision: number;
  snapshot: GameSave | null;
}

interface GameSave {
  schemaVersion: number;
  worldVersion: string;
  runId: string;
  characterId: 'survivor_male' | 'survivor_female';
  player: {
    x: number;
    y: number;
    facing: string;
    health: number;
    stamina: number;
    hunger: number;
    thirst: number;
    alive: boolean;
    attack: AttackSaveState | null;
  };
  inventory: InventorySaveState;
  world: {
    mapId: string;
    containerStates: ContainerSaveState[];
    droppedItems: DroppedItemSaveState[];
    zombies: ZombieSaveState[];
  };
  survivalSeconds: number;
  savedAt: string;
}
```

The survivor and each zombie share the same attack save contract. An actor with an attack or recovery in progress carries the state required by `FR-SAVE14`. An actor with neither has a null attack state.

The referenced state types are **conceptual**, not a mandate to define these exact file names or database columns. Validate schema, ranges, IDs, finite numbers and map compatibility before reconstruction; save runtime behavior data, **not** copies of static tilemap art or computed roof opacity.

### 11.3 Save and death rules

- Save from a consistent snapshot when simulation is paused or held during serialization.
- Preserve remaining loot in each container, item instances, drops, zombie locations/health/death, survivor ID and room position.
- Resume inside a house with the correct roof already hidden **before first visible gameplay frame**.
- On death, remove/mark the active save as non-continuable. `Continue` must not resume a dead run.
- Browser data can be cleared, lost or edited by the player. The MVP makes **no cloud backup or anti-cheat guarantees**.

### 11.4 Post-MVP cloud plan (not MVP work)

When cross-device or account needs are approved, add **Supabase Auth + PostgreSQL** with a versioned **JSONB game-save payload**, owner authorization through **Row Level Security**, explicit local-to-cloud import, synchronization and conflict handling. Keep IndexedDB if useful as offline local cache. Cloud storage alone does **not** make client-authored scores or combat outcomes authoritative. Multiplayer/competitive systems may require a dedicated authoritative game server.

---

## 12. UI design and art direction

### 12.1 Visual identity

Grounded suburban collapse; believable isometric pixel art; abandoned streets, worn domestic interiors, realistic everyday survivors, restrained gore and lonely fixed-daylight mood. Avoid neon, fantasy monsters, exaggerated cartoon anatomy, glossy dashboards and direct copying of Project Zomboid's protected content.

### 12.2 Approved UI design language

- **Display type:** Bebas Neue; **body text:** Inter; readable monospace numerals when helpful.
- **Surfaces:** dark matte rectangles, restrained textures, subtle borders, modest corners.
- **Accent:** muted olive; **danger:** weathered rust red; **primary text:** warm cream.
- Canonical design tokens are defined in `DESIGN_SYSTEM.md`. Representative locked values:

| Token | Hex |
|---|---|
| `color.bg` | `#0C0F10` |
| `color.surface` | `#1B1E1D` |
| `color.surfaceElevated` | `#343A33` |
| `color.accent` | `#686A3F` |
| `color.danger` | `#B14A3A` |
| `color.warning` | `#D6AE6D` |
| `color.textPrimary` | `#EEE6D6` |
| `color.textMuted` | `#A8A8AE` |
| `color.border` | `#49544A` |

- UI must be clear at 1280×720 baseline, with reasonable desktop scaling to 1920×1080 and smaller usable windows.
- Four HUD stat meters must label semantics correctly: hunger and thirst **worsen upward**.
- The circular minimap stays in the top-right edge; never reveal hidden zombies or loot.
- Do not include unapproved future HUD elements such as ammo, hotbar complexity, durability, clock or crafting.

### 12.3 Production asset distinction

Approved image concept boards are **not game-ready** spritesheets or Tiled maps. Each asset still needs appropriate source files, measured animation frames, transparent sprites where relevant, consistent feet origins, collision anchors, tile layers and source licensing. Confirm sprite size, tile footprint and animation timing in engine before mass art production.

### 12.4 Detailed design reference files

- `DESIGN_SYSTEM.md` — React UI components, tokens, keyboard/focus rules.
- `ART_DIRECTION.md` — palette, perspective, props, lighting and production conventions.
- `PLAYER_CHARACTER_SPEC.md` — male/female appearances, movement/animation.
- `ZOMBIE_CHARACTER_SPEC.md` — approved five visuals and one AI archetype.
- `MAP_DESIGN_SPEC.md` — neighborhood geometry, minimap/full map, spawns/navigation.
- `BUILDING_INTERIOR_SPEC.md` — three houses, room structure, roof/wall cutaway, loot access.

---

## 13. Technical architecture and deployment

### 13.1 MVP stack

| Concern | Choice | Rationale |
|---|---|---|
| Game/render/simulation | Phaser 4 | Scenes, inputs, animation, camera and 2D rendering |
| UI/menus | React + Tailwind CSS | Reusable menus and HUD over a game canvas |
| Language/build | TypeScript + Vite | Lightweight client-first desktop-web game |
| Level editor | Tiled | Hand-authored isometric tilemap and object layers |
| Physics | Phaser Arcade Physics + logical collision | Lightweight movement and collisions; isometric projection handled separately |
| Navigation/AI | FSM + A* (or EasyStar.js) | Deterministic local zombie logic without LLM/API |
| Persistence | IndexedDB via Dexie | Local versioned single-slot saves |
| Hosting | Vercel static Vite site | No application server required |
| Source control | Git/GitHub | Track requirements, assets, code and releases |

Do not introduce Next.js, a dedicated API server, Supabase, remote game maps, LLM API calls, Docker-based production dependencies, or persistent online service in the MVP unless the PRD changes.

### 13.2 Responsibilities

- **Phaser** owns player/zombie states, combat, survival, loot, world, simulation time and game lifecycle.
- **React** renders menus/HUD, focus, confirmation and interactive presentations; it sends typed commands instead of mutating game internals directly.
- **SaveRepository** receives versioned snapshots and handles persistence outside gameplay logic.
- **Map/Tiled layers** provide visual and logical data; rendering sprites or roof fades are not the source of collision truth.
- Throttle expensive AI/path searches and React HUD updates rather than recalculating/rendering them every frame.

### 13.3 Suggested repository structure

```text
dead-county/
├── docs/
│   ├── PRD.md                    # this master document
│   ├── DESIGN_SYSTEM.md
│   ├── ART_DIRECTION.md
│   ├── PLAYER_CHARACTER_SPEC.md
│   ├── ZOMBIE_CHARACTER_SPEC.md
│   ├── MAP_DESIGN_SPEC.md
│   └── BUILDING_INTERIOR_SPEC.md
├── references/                  # approved concept boards (not runtime assets)
├── public/assets/
│   ├── maps/
│   ├── sprites/
│   ├── audio/
│   └── ui/
├── src/
│   ├── game/{scenes,entities,systems,world,config}/
│   ├── components/{menus,hud,inventory}/
│   ├── storage/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

This is directional; only create files when a milestone needs them. Pin package versions in the lockfile and verify actual Phaser/template compatibility when implementing.

---

## 14. Non-functional requirements

### 14.1 Performance

- **NFR-P01–P02:** Target smooth mid-range desktop gameplay, aiming for ~60 FPS in normal MVP conditions; no guarantee for every device.
- **NFR-P03:** Test a 1280×720 gameplay viewport with 20 active zombies and representative house/interior props.
- **NFR-P04:** Throttle A* path updates; do not solve every zombie path every frame.
- **NFR-P05:** React HUD should update from throttled snapshots/events rather than 60 frame-by-frame state rerenders.
- **NFR-P06:** Inventory and loot interactions should avoid noticeable multi-frame stalls.

### 14.2 Reliability and saves

- **NFR-R01–R03:** Handle full inventory, pathfinding failures, missing/corrupt save gracefully.
- **NFR-R04:** Pause, resume, scene restart and overlay open/close must not leak duplicate timers/listeners/entities.
- **NFR-R05–R06:** Loaded world is coherent; failed saves show a real error and do not falsely say `Saved`.
- Indoor roof rendering and minimap coordinates must restore and update correctly after reloading.

### 14.3 Security/privacy

- No sensitive keys/passwords in local save data. Browser storage is **not tamper-proof** and may be cleared.
- Validate loaded data before use; avoid unsafe HTML/script injection when displaying save-provided strings.
- No user accounts or telemetry required for MVP.
- Future online leaderboards/competitive play must not trust unverified client-supplied saves as secure evidence.
- Future Supabase exposed data requires per-user authorization and RLS; never expose privileged server credentials in browser code.

### 14.4 Accessibility and compatibility

- Support current major desktop browsers (Chrome, Edge, Firefox) with keyboard + mouse.
- Clear key hints, focus indication, contrast, and accessible React modal navigation.
- Mouse and keyboard are the intended input. Mobile/touch gameplay and gamepad support are future decisions.
- Basic gameplay works after initial load without requiring server API calls, but explicit offline cold-start/PWA support is **not guaranteed**.

---

## 15. Delivery milestones (M1–M5)

Each milestone should leave a demonstrable vertical slice and a buildable repository. **Do not implement the post-MVP backlog early.**

| Milestone | Scope / outcomes | Exit gate |
|---|---|---|
| **M1 — Foundation** | React+Phaser scaffold; two-character Choose Survivor; prototype isometric tile geometry; basic player movement/sprint/camera/collision; House A interior, open entry, roof hide; expand to Houses B/C after proof | Both survivors can spawn in A, move, enter/exit, see proper roof/occlusion; map walkability and 3 accessible houses coherent |
| **M2 — Zombie & Combat** | Standard FSM, detection/chase/attack/death, pathfinding incl. doorways, five cosmetic looks, bat equip/**mouse-directed Left Click** attack, health/game-over | Player can evade/fight/die; aiming follows mouse in world coordinates; 10–20 zombies work without wall walking or major stalls |
| **M3 — Inventory & Loot** | 12-slot inventory, authored item catalog, three container types, transfers, use, equip and drop, carry weight, basic map views | Player can loot three houses and navigate both map modes without duplicating or losing items |
| **M4 — Survival Loop** | Hunger, thirst, stamina balancing, four-bar HUD, elapsed survival time, blocking overlay pause semantics, feedback polish | Full survival loop works with consistent pause/resume and map/inventory behavior |
| **M5 — Save & Ship** | Dexie save repository, versioning, local resume, character/zombie/loot and indoor roof restore; game-over invalidation, browser QA, audio basics, Vercel deploy | End-to-end new game → exploration → fight/loot/survive → save/continue → death/restart works on production URL |

**First coding slice:** one map block, one survivor facing/walk cycle, one actual doorway, one loot container and one standard zombie. Verify scale and movement in Phaser before producing large atlases or the full neighborhood.

---

## 16. Test strategy and launch acceptance

### 16.1 High-priority tests

| Area | Representative acceptance test |
|---|---|
| Character selection | Each survivor selected, spawned, persisted and restored; identical mechanics |
| Fresh-run parity | Start each survivor under every supported starting configuration. Before the first active step, verify identical 100 Health, 100 Stamina, zero Hunger and zero Thirst, 12 empty slots and no equipped weapon. With optional loot omitted, walk directly to the designated starter container. Use `E Search` and verify exactly one bat and at least one bottle are obtainable from that single search. |
| Starter item actions | Take the bat first in one run and the water first in another. Each transfer fills the first vacant slot and leaves all occupied slots unchanged. Verify the bat stays unequipped until Equip and the bottle remains intact until a valid Use. At exactly zero Thirst, Use is disabled and the bottle stays in its slot. |
| Starter container depletion | With one bat and one bottle, transfer only the bat. Close and reopen Loot to verify only the bottle remains. Close Loot before Save & Exit, then Continue. Verify the same bat is in inventory once and the same bottle remains in the container. Take the bottle and close Loot. On revisiting and after another Save & Exit → Continue, verify the container stays empty with no Search prompt and each transferred instance exists exactly once. |
| Opening needs clock | Follow Hunger, Thirst and active survival time from the first running step. With no item use, record the values before Inventory, Loot, Pause and tab hiding. In each case, including returning to a visible tab before Resume, all three stay fixed. After the last blocker clears, only active time advances them. |
| Screen-relative movement | On unobstructed ground, verify W/S/A/D project straight up/down/left/right and combined inputs project into the intended diagonal. Over equal active time at the same gait, compare diagonal and cardinal displacement in logical world units. They have the same speed. Repeat against blocking geometry in every direction. |
| Sprint re-engagement | Hold a movement key and Shift until Stamina reaches zero. Verify walking speed immediately. Keep holding Shift through recovery and send repeated keydown events. The survivor keeps walking. Release and press Shift when sufficient Stamina is available and verify sprinting resumes. Repeat through exhaustion to rule out oscillation. |
| Fresh movement after a hold | Hold W and Shift as Inventory opens and verify movement stops when the panel blocks gameplay. Repeat with Loot, Full Map, Pause Menu and a hidden tab. Close or Resume while holding the keys and send repeated keydowns. Inspect the first active steps for zero player-driven displacement and no sprint. Release and press W again to walk, and press Shift freshly to sprint when eligible. |
| Continue with held keys and an attack | Save & Exit during a bat wind-up or recovery and hold a movement key across Continue. Repeated keydowns produce no movement. Compare the attack to ordinary Resume at the same phase and active step. The attack resolves once and its remaining recovery is preserved. A fresh directional press restores movement subject to any active attack restrictions. |
| House geometry | Walk through each entrance; roof hides/restores; no loading/teleport or wall clipping |
| Discover House B | With a first-time player at the first junction, use the default camera zoom and withhold map assistance, labels and directions. Ask which house they would head toward and how to get there. Verify the gray siding and porch are visible and the player can point out B and a plausible route before consulting a map. |
| Compare A–B routes | Walk both routes between the same endpoints at the same pace. Compare traversal time and exposure under matched zombie positions. Check that the solid corner breaks sight, and that stepping back into view can renew pursuit. Playtest a clear street and an observed street. Look for occasions where players benefit from taking each route. Retune the layout if the same route wins on both time and exposure in practice. |
| House B food on both routes | For each supported fresh-run configuration, test the direct route on one fresh run and the detour on another. Travel from House A to B with ordinary zombie rules active. Enter through the open doorway, use `E Search` at the stocked container, and transfer at least one Canned Food with space available. [House B playtest](BUILDING_INTERIOR_SPEC.md#house-b-supply-playtest) |
| First supply run in House B | At default gameplay zoom, start a first-time player at B’s normal approach in a viable ordinary encounter. Let them use positioning and cover to enter, find the kitchen, Search and Transfer a can, close Loot and walk back outside without attacking or needing to fight. Give no navigation markers or route directions. Verify zombies on or near the route can detect, pursue and use the doorway under ordinary rules. |
| Cautious detour pacing | From a fresh start, have a newcomer walk to the starter container, transfer and equip the bat, follow the detour, then locate and transfer B’s guaranteed food without consuming supplies. Verify Hunger and Thirst rise on active steps and cause zero health damage before transfer. Record active travel and hesitation time for tuning. Compare against a run with a deliberate pause to confirm the added paused interval changes neither progression nor damage. |
| House B food persistence | Record the collected food’s ID and slot before closing Loot. Revisit the container, then Save & Exit and Continue. Verify the same ID occupies the saved slot exactly once and is absent from the container. At zero Hunger, verify that Use is disabled and the food stays in inventory. |
| House C supplies and pressure | For every supported fresh-run layout, enter C and search and transfer at least one of each essential. Save after taking them and Continue to verify depletion. Play through the trip and the period after consumption. Check whether getting there still requires a risk or resource decision and whether hunger or thirst makes a later supply decision matter. Tune additional stock, placement or need rates if C makes those choices trivial. |
| Navigation/AI | Standard zombie follows reachable routes indoors/outdoors, respects line of sight, loses target reasonably |
| Chase speed and stamina | In a clear corridor with continuous detection, start a zombie behind a walking survivor and verify it gradually closes to attack range. Repeat with the survivor sprinting. Verify the gap grows, stamina falls and Chase persists in range and sight. Break sight in a separate pass and verify that escape follows the normal last-sighting and grace-period rules. |
| First playtest in House A | Give a newcomer a fresh run and let them locate the starter container, walk to it, search, transfer the bat, and equip it. Verify the full sequence is feasible without sprinting or combat across supported starts. Repeat while lingering to check ordinary doorway entry and verify that taking or equipping the bat triggers no encounter. [Opening playtest](BUILDING_INTERIOR_SPEC.md#house-a-opening-playtest) |
| House A return visit | Track a zombie that has never seen the survivor as it wanders inside. Return while it is still there and encounter that same zombie. Verify its route, identity and movement state across Continue and any distance-based optimization. [Return-visit procedure](ZOMBIE_CHARACTER_SPEC.md#85-house-a-return-visit-test) |
| Blind corner | Run the same encounter twice, turning in opposite directions out of sight. Until reacquisition the zombie pursues the same last visible point in both runs. Let it reach the point while the survivor stays concealed, then step back into view before expiry and verify immediate reacquisition. |
| Pursuit clock and blocked path | Break sight, then spend longer than the grace period in Pause, Inventory, Loot, Full Map or a hidden tab. After all holds clear, verify the same remaining active time. Make the last sighting unreachable and keep the survivor concealed. Verify collision holds, retries stay bounded, and Wander starts at the zombie’s actual position on expiry. |
| Luring away from House B | Draw a zombie from B, stay hidden until expiry, and observe its first wander step. Its position and ordinary local wandering preserve the displacement. A later sighting under normal perception can start a new Chase. |
| Combat | Left Click on world swings equipped bat toward mouse; correct isometric world-space facing; range/arc/cooldown/damage; UI/minimap/paused/unarmed clicks never attack; zombies and player die at zero health |
| Combat feedback at default zoom | Compare a bat miss and a hit with two zombies in the swing arc. Both have the same swing animation and sound. The extra impact and target cue occur once on confirmed damage. Mute audio and identify the struck zombie visually. Show a zombie’s wind-up, contact and recovery to a newcomer and observe whether they can read the warning and attempt to step clear. |
| Locomotion and damage cues | Walk into a wall and verify idle when blocked. Exhaust Stamina while sprinting and verify the animation changes to a walk. Compare a confirmed bite with Health drain from Hunger and Thirst, checking the bite reaction and source labels at default zoom. |
| Deterministic contact | Start with tied eligible zombies, move the pointer behind the survivor during wind-up, and compare the damaged instance across reversed zombie iteration order and a mid-swing save/continue. The same single instance takes the hit each time. |
| Attack commitment | Swing at zero stamina and take a nonlethal bite during wind-up. The swing reaches contact. Repeat with a zombie winding up and surviving a bat hit, checking that its bite lands only if the survivor is still reachable. |
| Overlay input | With the bat equipped and ready, click Use, an inventory slot, Close and pause-menu Resume. Verify zero new swings through the first resumed gameplay step, including when release occurs over the canvas. A subsequent fresh world click starts one swing. |
| No-benefit items | At full health, zero hunger or zero thirst, confirm the corresponding Use action explains the limit and leaves the item intact. Move the stat one point from the limit and confirm Use applies that point and consumes exactly one item. |
| Survival | Test hunger and thirst separately. With the other need satisfied, each gives a visible warning and eventually kills an untreated survivor in House A. Food and water relieve their respective needs. Bandages restore bounded HP. Pausing freezes progression. |
| Rest and bandage | With both meters below maximum and no damage source active, stand still and verify Stamina rises while Health holds. Use one Bandage and verify capped healing and consumption of exactly that one instance. At full Health, verify Use is disabled and the remaining bandage stays in its slot. |
| Authored fresh runs | Before the first active step, compare multiple fresh starts for each survivor. Verify identical initial zombie positions, wander destinations and container kinds, placements and quantities, including all three house guarantees. With the same optional test seed and inputs, compare ongoing behavior. With that same seed and different survivor paths, verify ordinary perception and movement can lead to different encounters. |
| Combined critical needs | Set both needs critical with different drain rates. Over the same active time, health loss matches the faster need alone. Relieve that need and verify its warning clears while the other warning and its slower drain continue. Repeat with the rates reversed. |
| Inventory/loot | Twelve slots, no stacks, full inventory safe, correct container depletion, dropped items recoverable |
| Inventory action feedback | Transfer an item into a vacant slot, equip a bat and use a consumable. Verify the receiving-slot highlight, equipped mark and affected stat value after their respective successes. Repeat with full inventory or a no-benefit Use and verify zero success cues. |
| Bat equipment lock | Open inventory during wind-up and recovery. Verify Unequip and Drop are disabled for the equipped bat, other eligible actions work, and closing resumes the same swing. After recovery, both bat actions become available. |
| Drop placement | Drop at the survivor’s feet, then beside a wall with the feet blocked and one reachable alternative. In each case verify one immediately recoverable instance on the survivor’s side of the wall. |
| Drop failure and retry | Try dropping an equipped bat with no reachable position. Repeat with a valid position and a simulated placement failure. Both attempts show “Cannot drop item here.” and preserve the slot, item ID and equipped bat with zero new world drops. Retry successfully and verify exactly one world instance, an empty source slot and cleared equipment. |
| Pickup and transfer order | With slots 2 and 8 empty, recover the bat previously dropped from slot 8. It occupies slot 2 with the same ID and requires Equip. Transfer a container item and verify it fills slot 8. |
| Competing interactions | Put a dropped bat beside a stocked cabinet. Check each as the nearer target and then at equal distance. One press performs only the indicated action. With a full inventory the selected bat stays on the ground and the cabinet stays closed. |
| Maps | Circular north-up minimap, rotating player arrow, `M`/click full map, pause/close, no enemy/loot reveal |
| Run lifecycle | Overwrite confirmation, Game Over, restart, Continue disabled for dead run |
| Persistence | Indoor save restores roof state; survivor, zombie cosmetic IDs/health, loot and time persist |
| Attack across Continue | For a bat swing and a zombie attack, save once just before contact and once just after a hit. For each save, compare Continue with an ordinary resume from that point using the same inputs. Damage and time until the next eligible attack must match, regardless of time spent away. |
| Pursuit across Continue | From one paused simulation state, compare ordinary Resume with Save & Exit followed by Continue. For each living zombie, check its state, expiration step and position using the [pursuit comparison procedure](ZOMBIE_CHARACTER_SPEC.md#82-pursuit-comparison-test). |
| Wander across Continue | Compare a moving zombie, a waiting zombie and an absent destination across both resume paths. Check the same destination choices, wait expiry steps and per-step movement, including pending and confirmed-unreachable paths. Verify zero random draws during load and path rebuilding. [Wander comparison procedure](ZOMBIE_CHARACTER_SPEC.md#84-wander-comparison-test) |
| Overlapping pauses | Hide the tab during Inventory, Loot, Full Map and a pending Save Game. Return, dismiss the panel or complete the save, and verify zero simulation steps until Resume and the last hold have cleared. Ordinary overlay closure still works in a continuously visible tab. |
| Two tabs and revision conflicts | Keep the owner hidden with unsaved progress. Verify the second tab stays blocked. Exercise wrong-owner/current-revision and current-owner/stale-revision writes separately. Both abort with identical stored slot data. After owner closure, acquire from the second tab and load the latest committed revision. A delayed write or release from the former owner cannot affect it. |
| Explicit acquisition race | After release, leave two visible menus idle and verify neither acquires the slot. Choose Continue in both. Exactly one enters the latest committed run. The other stays blocked, including after a later release until its player chooses Continue again. |
| Conflict recovery | Trigger a stale-revision save. Check the exact message, discard warning and frozen simulation, including after Esc or a visibility change. Reload a living save, then repeat with a death marker. Verify the committed snapshot and revision stay unchanged. If another tab takes ownership before reload, verify the blocked state. |
| Storage retry | Fail a write with an ordinary storage error while both guards match. Retry once with both still valid, once after a revision change, and once after an ownership change. Only the first can commit. The other attempts enter conflict recovery and the blocked menu respectively. |
| Read failure and compatibility | Fail a read during Reload, then retry under verified ownership. Check the frozen in-memory state and zero gameplay writes. Read a newer schema whose payload fails today's validator. Expect the compatibility message, disabled Continue and a preserved record across New Game. |
| Damaged replacement | Confirm replacement and cancel during character selection. Repeat with failed House A placement, ownership loss, and an aborted commit. In each case the stored record survives. For an unreadable revision, change a nested stored value between confirmation and commit. Replacement must abort and preserve the intervening record. With the original intact, a successful commit creates exactly one new run. |
| Browser/deployment | Vite production build and Vercel URL load; major desktop browser smoke checks |

### 16.2 Definition of Done — MVP v1.0

All statements below must be true:

- [ ] Both approved survivor options are selectable and playable with equal systems.
- [ ] The three original houses and six expansion blocks form one contiguous neighborhood with 21 seamless single-floor destinations.
- [ ] Roof and relevant occluding walls reveal each interior automatically; same world/camera remains active.
- [ ] 10–20 zombies operate with one standard AI configuration and five non-mechanical visuals (including female zombie).
- [ ] Zombie AI detects, navigates, chases, attacks, loses targets and dies without obvious wall errors.
- [ ] The Baseball Bat works through an eligible Left Click in the active world. Space starts an eligible shove. Test seven item types and three container types.
- [ ] Twelve-slot inventory, looting, equip/use/drop and full-capacity failures are reliable.
- [ ] Health, stamina, hunger, thirst and active survival duration behave as documented.
- [ ] Circular minimap and full map work, match the world and never reveal hidden zombie/loot data.
- [ ] Main, Choose Survivor, HUD, Inventory, Loot, Pause, Controls, Game Over and confirmation UI function.
- [ ] One local active save resumes accurate state, including indoor roof and selected character.
- [ ] Death invalidates continuation; a new run resets the world.
- [ ] Critical gameplay, navigation, UI-input, crash, and persistence bugs are resolved.
- [ ] A production build is live on Vercel and end-to-end playable in supported desktop browsers.
- [ ] The shipping game does not depend on authentication, a cloud DB, LLM or dedicated backend.

---

## 17. Post-MVP expansion backlog (not commitments)

These are potential future phases, **not part of MVP** and not necessarily a fixed implementation order.

| Phase | Potential features | Required planning note |
|---|---|---|
| **F1 — Deeper survival** | Day/night, weather, temperature, sleep, infection, wounds, food spoilage, more consumables, encumbrance | Rebalance survival simulation and UI |
| **F2 — Advanced enemies/combat** | Special zombie classes, hearing/noise, stealth, behavior trees, hordes, weapons, firearms, ammo, durability, advanced injury | Scope AI performance and new animations first |
| **F3 — Larger world** | More buildings, multistory interiors, towns/forests, streaming, interactive doors/windows, fog of war and advanced map | Needs world-generation/loading plan |
| **F4 — Crafting & progression** | Crafting, resource materials, base building, farming, cooking, skills, traits, equipment upgrades | Requires expanded item and save schemas |
| **F5 — Vehicles & NPCs** | Driving, fuel, repairs, NPC survivors, trading/factions and optional LLM-driven conversation | NPC LLM is optional, not core combat AI |
| **F6 — Accounts & cloud** | Supabase Auth, PostgreSQL JSONB saves, RLS, cross-device sync, multiple slots, import/export, conflict handling, player profile | Local saves require explicit migration; offline conflict resolution is not automatic |
| **F7 — Online/social** | Achievements, leaderboards, shared challenges, co-op/multiplayer | Client saves cannot prove score integrity; multiplayer likely needs authoritative server |

### 17.1 Future database decision

Prefer **PostgreSQL (via Supabase)** for accounts, save ownership, profiles and relational queries, with JSONB snapshots for versioned world saves. NoSQL is not required merely because save data is JSON. The exact future schema, rate limits, sync protocol and ownership policies are deferred to the future cloud design.

### 17.2 Future AI decision

Zombie MVP AI is local and deterministic: **FSM + A*/navigation**. Behavior trees or utility AI can be evaluated for more complex future NPCs. External LLMs are optional for narrative NPC dialogue only, not necessary for 20 active zombies.

---

## 18. Risks, dependencies, and open implementation parameters

| Risk/unknown | Mitigation / decision |
|---|---|
| Overly large scope | Protect the exact MVP item, house and zombie limits; ticket post-MVP work separately |
| Isometric perspective vs collision | Decouple logical world coordinates from screen projection; validate a street-and-door prototype |
| Character assets feel static | Prototype real movement frames with credible weight/footfall before producing full sprite atlases |
| AI navigation stalls | Throttled A*, shared walkability, fewer simultaneous recalculations |
| Roof flicker / incorrect indoor reveal | Stable interior zones and visibility state recalculated on spawn/load |
| Save/schema incompatibility | Versioned validated snapshot; do not overwrite last good save on failure |
| Screen mockups imply extra features | Treat art as reference; written PRD alone authorizes game mechanics |
| UI/game event conflicts | Typed bridge and centralized blocking-overlay/pause state |
| Browser local-save loss | Warn appropriately; future cloud backup optional |
| Unclear final art pixel scale | Test 64×32 candidate, character feet, door width, camera zoom in engine |

**Open parameters — intentionally not product-feature decisions:** exact map tile count; room tile coordinates; final source sprite dimensions; camera zoom and minimap pixel diameter; damage, movement speed, stamina, hunger and thirst numeric rates; pathfinding tick intervals; per-container item quantities; specific sound files. These must be selected during implementation/QA with centralized configuration, without using them to add new features.

**Design work still remaining:** final visual approval/mockups of individual **Main Menu + Choose Survivor**, **Gameplay HUD + Map**, **Inventory + Loot**, and **Pause + Game Over** screens, plus production-ready spritesheets, tilesets and interface assets. These are refinements of **already-in-scope MVP screens**, not permission to expand the feature list.

---

## 19. Amendment integration and requirement-ID reconciliation

This document **incorporates** the approved character, zombie, map and building amendments. The amendment files may be retained in version history, but should **not** be treated as additional independent sources of truth once this master PRD is adopted.

There were identifier collisions among earlier amendments. To avoid duplicate labels:

- `FR-Z12–Z15` = cosmetic appearance requirements from zombie amendment; **`FR-Z16`** = house entry/exit navigation requirement from building amendment (formerly another `FR-Z12`).
- `FR-SAVE11` = selected survivor ID from character amendment; **`FR-SAVE12`** = saved zombie appearance/state from zombie amendment; **`FR-SAVE13`** = derived indoor roof restore from building amendment (formerly `FR-SAVE11`).
- `FR-MAP01–FR-MAP10`, `FR-W09–FR-W15`, `FR-L09–FR-L13`, `FR-P10–FR-P11`, `FR-UI07`, and `FR-G08` are retained as additive requirements.
- The original statement that a full map is post-MVP is superseded **only for the simple minimap/full-neighborhood-map functions** in Section 9. Advanced mapping remains future scope.

### 19.1 Change control

An approved scope change should update **this PRD first**, then the applicable spec, UI/art docs, tests and tickets. Keep the old visual reference if useful but annotate where it depicts excluded behavior. A design approval alone does not finalize numerical parameters or produce production sprites.

---

## 20. Final MVP product statement

**Dead County v1.0** is a desktop-browser, single-player, 2D isometric survival experience in one abandoned neighborhood. Players choose an equally capable male or female survivor, begin in a starter house, roam three seamlessly enterable houses and their streets, scavenge one melee weapon and three consumable item types, fight or evade 10–20 ordinary rule-driven zombies with five cosmetic appearances, monitor four survival needs, navigate with a circular minimap and full map, save locally, and try to survive until death. The product ships via Vercel with no account, cloud service, LLM or multiplayer requirement.

> **Implementation rule:** Build the smallest believable playable slice, lock scope, and validate real game feel and collision before scaling art or architecture.
