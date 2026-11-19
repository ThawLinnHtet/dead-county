# Dead County — Neighborhood Map & Navigation Specification

> **Status:** Approved visual concept; implementation geometry pending an in-engine prototype  
> **Version:** 1.1 · **Date:** 2026-11-17  
> **Scope:** MVP v1.0 — one compact isometric neighborhood, circular minimap, full-map overlay  
> **Related:** `PRD.md`, `PRD_MAP_UPDATE.md`, `DESIGN_SYSTEM.md`, `ART_DIRECTION.md`, `PLAYER_CHARACTER_SPEC.md`, `ZOMBIE_CHARACTER_SPEC.md`, `BUILDING_INTERIOR_SPEC.md`  
> **Visual reference:** `references/approved-neighborhood-map.png` (concept board, not an authoritative Tiled level file)

## 1. Approval and requirements hierarchy

The user approved a **grounded, abandoned suburban neighborhood** with faded asphalt, sidewalks, fenced yards, subdued trees, weathered houses, occasional stationary vehicles, sparse clutter and restrained blood. The map includes **exactly three enterable houses** and a **circular minimap + full-map overlay**.

**Approved:** visual direction, three-house structure, daytime presentation, neighborhood-scale exploration, circular minimap and full map. **Not yet locked:** map dimensions, tile count, exact road junction coordinates, collision shape details, floor plan layouts, and final source-pixel scale. Finalize those through a small Phaser + Tiled spike before full map production.

**Source-of-truth order:** the game PRD and approved amendments determine features; this spec determines neighborhood and map interaction; `ART_DIRECTION.md` determines visual consistency; future Building/Interior Spec will determine detailed room plans. A concept-board label or illustration never overrides these documents.

## 2. MVP map goals

- Support a complete survival loop: **spawn → explore → avoid/fight zombies → enter/loot houses → manage survival → continue or die**.
- Communicate a convincing deserted suburb without excessive clutter or a huge world.
- Ensure readable movement and enemy navigation using a logical 2D world grid with isometric rendering.
- Make the three houses geographically distinct and reasonably navigable via one main road plus short connecting paths/side streets.
- Allow orientation without revealing enemies or loot using the circular minimap and expanded neighborhood map.
- Stay performant and comprehensible with **10–20 active zombies**.

### In scope / out of scope

| MVP | Not MVP |
|---|---|
| One fixed handcrafted neighborhood | Generated cities, regional travel, seamless world streaming |
| Exactly 3 enterable single-story houses | Functional stores, multi-story buildings, extra enterable locations |
| Roads, sidewalks, yards, trees, fences, debris | Destructible world and weather |
| Daytime, fixed light direction | Day/night cycle, changing weather |
| Static abandoned cars | Driving, vehicle interactions |
| Interactive containers **inside** houses | Mailbox looting and exterior loot chains |
| Circular minimap and full neighborhood map | Fog of war, navigation routes, annotations, quests, markers, other regions |
| 10–20 active standard zombies | Spawn waves/hordes, special zombie classes |

Decorative building facades can extend beyond the three houses **only if they are clearly non-enterable and add no new gameplay location**. For a compact MVP prefer a few background facades rather than many fake destinations.

## 3. Neighborhood structure and landmarks

### 3.1 Three functional houses

| Map ID | Name | Level design purpose | MVP rules |
|---|---|---|---|
| `house_a` | **Starter House** | Spawn point for movement, looting, equipping and orientation | Both survivors start indoors with reachable bat and water loot. The opening route allows collecting and equipping the bat without combat. |
| `house_b` | **Supply House** | Reward deliberate exploration with more containers/consumables | Accessible from the public street/sidewalk; distinct exterior; no artificial locked-room gate |
| `house_c` | **Risk House** | Higher encounter risk and tension; slightly more rewarding exploration | Located along a readable route; zombies may patrol nearby; no mandatory combat to understand core controls |

All three houses have one accessible floor and straightforward entrance openings. **Locked doors, door destruction, window entry, barricading and complex door interactions are post-MVP.** Detailed building exterior and floor plans require separate visual approval in Step 4.

### 3.2 Outdoor layout

- A recognizable **primary street** connecting the three residential destinations; at least one short side street or junction to prevent a featureless corridor.
- Sidewalk connections between road and the three house entrances. Driveways and paths indicate navigable routes.
- Frame the first junction from House A so House B’s gray siding and distinctive porch can both be read at default gameplay zoom. Leave a visible approach into the street or sidewalk so a newcomer can choose a plausible route before using the map.
- Build two continuous walkable routes from A to B. The direct street route saves travel time at the cost of more exposure. The longer detour includes a solid corner that blocks sight in the zombie simulation. Verify both with the same endpoints and ordinary movement. Reacquisition and chase abandonment follow FR-Z11 in the master PRD.
- Fences/hedges establish property boundaries while leaving unobstructed accessible approaches to each house.
- Trees, bushes and static props create cover-looking silhouettes but do not hide essential navigation routes.
- Small optional decorative yard / park-like patch is scenery only, not an additional gameplay zone.
- Abandoned vehicles are stationary visual obstacles; no enter or drive actions.
- Neighborhood perimeter uses visual blockers and physically blocked tile/grid areas; no unreachable space disguised as a traversable path.

### 3.3 Landmark and object labels

Functional items: `house_a`, `house_b`, `house_c`, indoor `cabinet`, `drawer`, `supply_box`.  
Decorative only: car, pickup, mailbox, bench, streetlight, trash can/bin, hydrant, road cone, crate on street, weeds, rocks, blood decals, road markings. A visually depicted crate is **not** a lootable supply box unless placed and identified as a defined indoor container.

## 4. Spatial conventions & Tiled production

### 4.1 Projection, tile footprint and size

- Use a **2:1 isometric presentation** while keeping collision/navigation logic in stable world coordinates.
- Start prototype testing with **64×32 px source ground tiles**, consistent with `ART_DIRECTION.md`, but validate character feet, door width, and screen framing in Phaser before locking.
- **Do not treat 128×128 or 256×256 tiles shown in past concept images as approved dimensions.** Start with a small test block, benchmark traversal and 20-zombie pathfinding, then choose a compact final size that feels alive but not empty.
- Tiles should be aligned to shared source art scale. Avoid mixing projections, radically different pixel density or shadow directions.

Reference transformation for integer tile coordinates (illustrative, not a runtime physics transform):

```ts
const screenX = (tileX - tileY) * (tileWidth / 2);
const screenY = (tileX + tileY) * (tileHeight / 2);
```

Render sprites from their logical world/foot anchors; apply camera and origin offsets separately. Collision is authoritative in logical coordinates, not inferred from image transparency.

### 4.2 Suggested Tiled layers / object layers

| Layer | Purpose | Gameplay relevance |
|---|---|---|
| `Ground` | Grass, road, sidewalk, interior floor | Render base terrain |
| `GroundDetails` | Lane lines, cracks, stains, grass accents | Decorative / nonblocking |
| `LowObstacles` | Fence, low wall, bush, solid street props | Supplies collision shapes / blocked areas |
| `BuildingsWalls` | Structural wall geometry and openings | Walls block movement / sight where appropriate |
| `Furniture` | Interior beds, tables, cupboards | Solid or interactable definitions |
| `Entities` | Player spawn, zombie spawns, interaction anchors | Tiled object data, not baked into artwork |
| `RoofOverlay` | Removable roof render groups per house | Visual occlusion / fades |
| `Navigation` | Walkable/blocked grid, optional regions | Pathfinding representation |
| `Zones` | House interiors, roof triggers, safe spawn area | Logic / roof visibility triggers |

Layer names can be adapted to Tiled export constraints, but responsibilities must remain separate. Use stable semantic identifiers for houses, spawn markers and containers.

### 4.3 Collision and navigation rules

- Player and zombie navigation must share the same basic walkability source, with distinct actor sizing only when needed.
- Roads, sidewalks, most grass, open house entrances and unobstructed interior floors are walkable.
- Wander and Chase use the same entrance cells and collision boundaries. Represent a closed or obstructed opening as blocked geometry. The MVP’s playable house entrances remain fixed open doorways.
- Building walls, fences without openings, tree trunks, parked vehicles and solid furniture block movement.
- A bush may be decorative or blocking, but its behavior must be explicit and consistent.
- Entrances connect the same world grid across outdoor/indoor areas. No teleport needed for basic house entry.
- Spawn anchors and container interaction anchors must be on reachable cells.
- Line of sight checks must respect walls and appropriate solid obstacles.
- At the A–B detour, test the sight-blocking corner from both sides. A concealed survivor can leave the last sighting point while the pursuer heads there. A zombie lured away from B remains where pursuit ends and starts wandering locally. [Pursuit rules](PRD.md#72-fsm-and-navigation-rules)
- No visual prop should unexpectedly block an essential route without clear player feedback.

### 4.4 Roof and interior visibility

- Each `house_id` has one interior zone and one associated roof group.
- Entering a house reveals enough floor and walls to navigate; hide or fade the roof as necessary.
- Re-exiting restores the roof with hysteresis / stable zone detection to avoid flicker at thresholds.
- Occluding near walls may fade only where necessary; retain orientation and depth consistency.
- Specific cutaway wall treatment, room layout and roof shape are to be approved in Building/Interior Design (Step 4).

## 5. Placement and pacing rules

### 5.1 Player spawn

- New Game begins in House A, on a clear walkable floor cell facing a recognizable exit direction.
- Spawn cannot overlap walls, furniture, zombies or inaccessible cells.
- A short indoor route should be readable from the initial view and walkable to the starter container. Allow time for a newcomer to identify the container, search it, take the bat and equip it using ordinary controls.
- Do not introduce an unsolicited narrative intro sequence as a new required MVP feature.

### 5.2 Zombie population

- Spawn **10–20 active zombies total**, selected from the approved five **cosmetic-only** appearances (including male and female visuals), all using identical standard zombie gameplay configuration.
- Configure initial positions on distinct reachable cells and choose initial wander destinations with the bat route in mind. Validate even the earliest permitted zombie approach. From the first active step, the normal navigation grid includes House A’s doorway and all usual perception and pursuit rules apply.
- Load one authored set of initial zombie positions, wander destinations and container contents for every fresh run and either survivor. Optional stock may change in the authored configuration during balancing. Use a fixed seed when reproducing random choices during active gameplay.
- Allow outdoor encounters on roads/sidewalks/yard edges, and optionally a riskier approach to House C; do not make the spawn-to-exit path impossible.
- Zombies use FSM + basic pathfinding, with throttled path refresh; no hearing/noise system, no horde simulation, no respawn in MVP.
- Zombies do not appear on the minimap or full-map overlay.

### 5.3 Loot distribution

- Lootable containers exist **inside** the three houses only: `Cabinet`, `Drawer`, `Supply Box`.
- Items are restricted to **Baseball Bat, Canned Food, Water Bottle, Bandage** for MVP.
- House B offers more supply opportunities than A and includes at least one obtainable Canned Food in its designated kitchen container on every fresh run. Both routes connect to B’s accessible entrance and its short, visually readable route to the kitchen. House C contains at least one reachable Canned Food and one reachable Water Bottle. Keep placements and additional quantities in the loot configuration and verify reachability after layout changes.
- Play the detour from fresh House A spawn through the guaranteed food transfer. Include searching and equipping the starter bat and normal hesitation at walking pace. Use the observed active time to tune need rates so the newcomer can complete the trip before either need damages health.
- Avoid implying that decorative props (mailboxes, outdoor crates, cars) are lootable.

## 6. Gameplay camera

- Target 1280×720 desktop baseline; scale to other desktop sizes without concealing critical objects.
- Camera tracks the selected survivor smoothly; constrain to valid world render bounds.
- Characters and props sort by **ground contact/feet position** rather than sprite top-edge.
- The map keeps **fixed daytime lighting** and no world lighting cycle in MVP.
- UI layers are independent of world camera transforms.

## 7. Circular minimap — added to MVP by approval

### 7.1 Appearance and position

- A small **circular** minimap on the **top-right** gameplay HUD (design baseline ≈ **150px diameter**, responsively adjustable; final UX dimension is not locked).
- Dark matte rim, clean contrast against world texture, restrained shadows and palette aligned with `DESIGN_SYSTEM.md`.
- Roads and building footprints show as simplified colored shapes; the player is a clear central arrow icon.
- A small **N** orientation label indicates north.
- Keep the minimap legible without crowding survival stats or gameplay.

### 7.2 Behavior

- **North-up fixed**: the minimap itself does **not** rotate with character facing.
- **Player arrow rotates** according to player facing and stays centered while nearby map content translates beneath it, except when clamping near boundaries as needed.
- Click / keyboard-activate the minimap to open the full map; pressing `M` also opens it.
- During gameplay the minimap responds to the latest player position, but should avoid re-rendering the full world at 60 Hz; render a cached simplified map and move the mask/viewport indicator.
- Do not display zombie locations, undiscovered loot, hidden containers, or future objectives.
- Minimap remains available when outdoors or indoors, displaying the neighborhood-level footprint, not a detailed multi-floor plan.
- Keep circular clipping correct and pointer interaction bounded to the visible circle.

## 8. Full neighborhood map — added to MVP by approval

### 8.1 Appearance

- React overlay modal/panel over the gameplay world; header **NEIGHBORHOOD MAP**.
- Show **the same single approved fixed neighborhood**, using a readable map-oriented representation rather than rerendering every in-world pixel-effect.
- Show basic streets, three accessible houses and current player arrow/orientation.
- House markers can be subtly differentiated without revealing loot or danger ratings as privileged information.
- Basic zoom or fit-to-view is acceptable if straightforward; advanced pan/zoom tools are not mandatory until design validation.

### 8.2 Controls and lifecycle

- Open by **clicking the circular minimap** or pressing **`M`**.
- Close by **`M`**, **`Esc`**, or the visible **X** close button.
- Full Map holds the simulation, survival meters and world inputs. Closing the map clears only its own pause reason. A hidden-tab interruption still requires Resume.
- Provide logical keyboard focus and clear controls; avoid triggering `E`, sprint or attack while the map is open.
- No fast travel, map markers, route plans, fog of war, GPS guidance, bookmarks or discovered-region sync in MVP.

## 9. State and persistence

- Runtime map uses a versioned, immutable **static world definition** plus a mutable run state.
- Save only changes necessary to restore the run: player position, selected survivor, zombie placement/status, container contents/looted status, dropped items, survival time, and `worldVersion` / `mapId`.
- Reconstruct roads, houses and decorative props from versioned map assets when loading; do not serialize the entire static tilemap into IndexedDB each save.
- Map UI visibility and open/close state need not persist through save/load; resume gameplay with sensible closed overlays.
- Keep the `SaveRepository` abstraction independent of Phaser and future Supabase implementation.
- Handle incompatible world/save version gracefully rather than spawning actors into invalid blocked positions.

## 10. Implementation notes

- Recommended pipeline: **Tiled** map authored by layers/objects → export data → `MapManager` loads geometry and map properties → `CollisionManager` creates logical blockers → `Navigation` exposes a walkability grid → Phaser renders assets → React HUD overlays use a cached minimap summary.
- Prefer a shared coordinate conversion utility used by the gameplay camera, map view, cursor placement and interaction logic.
- Minimap and full map should derive from a **shared static map representation**, ensuring streets/buildings match in both views.
- Avoid procedural generation, full simulation of every decorative prop, remote map services and a backend for MVP.
- Keep deterministic, data-driven map placements where practical and test pathfinding around fences and house entrances.

## 11. Acceptance checklist

### Neighborhood

- [ ] One fixed suburban neighborhood loads in Phaser and looks consistent with approved art direction.
- [ ] There are exactly three enterable, distinct residential houses (`house_a` / `house_b` / `house_c`).
- [ ] Player can walk from House A to Houses B and C by navigable streets/paths.
- [ ] Player cannot cross road barriers, solid walls, fences, trunks, vehicles or furniture.
- [ ] Player enters/leaves each house with correct roof occlusion and world depth order.
- [ ] 10–20 standard zombies spawn in valid locations and can navigate typical obstacles.
- [ ] Lootable container types only match the approved indoor MVP catalog.
- [ ] Camera follows player and stays within valid bounds.
- [ ] Map maintains fixed daytime presentation.

### Minimap

- [ ] Circular minimap appears at top-right, readable at the desktop baseline.
- [ ] Roads and building footprints are recognizable.
- [ ] Minimap remains north-up while player indicator turns with facing.
- [ ] Player movement updates its position correctly.
- [ ] Zombies and hidden loot never appear as markers.
- [ ] Clicking/activating minimap opens the full neighborhood map.

### Full map

- [ ] `M` opens/closes map; `Esc` and X close it.
- [ ] Full map displays same neighborhood, three house markers, current player marker.
- [ ] World AI, combat and survival meters **pause while full map is open** and resume correctly.
- [ ] No gameplay input passes through to Phaser while map is open.
- [ ] Map UI does not require a backend or remote map service.

### Reliability / performance

- [ ] Save/load restores positions, looting and zombie state without desynchronizing static world map.
- [ ] Map and HUD remain responsive with 20 active zombies on the target desktop test machine.
- [ ] Static map rendering is cached or optimized; no full tilemap recomputation each game frame just to display minimap.

## 12. Design handoff and remaining technical choices

**Step 4 — Buildings & Interiors is now approved:** The three houses, continuous walk-in behavior, interior rooms, roof/wall cutaway and container constraints are now specified in `BUILDING_INTERIOR_SPEC.md` and `PRD_BUILDING_UPDATE.md`. Those documents take precedence for building-specific detail and supersede the earlier pending-design note.

**Prototype-driven choices:** final map tile count, the chosen source tile scale, path widths, precise obstacle shapes, collision body sizes, camera scale, and minimap UI size may be tuned after observing a first playable slice. Do not treat concept artwork annotations as locked production measurements.
