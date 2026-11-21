# Dead County — Buildings & Interiors Specification

> **Status:** Approved for MVP implementation planning (Step 4 of 4)  
> **Version:** 1.0 · **Date:** 2026-11-17  
> **Applies to:** Dead County MVP v1.0 · Phaser 4 + React + TypeScript · Desktop web  
> **Approval:** Approved building/interior visual direction **with explicitly corrected entry and scope rules**  
> **Related:** `PRD.md`, `PRD_BUILDING_UPDATE.md`, `MAP_DESIGN_SPEC.md`, `ART_DIRECTION.md`, `DESIGN_SYSTEM.md`, `PLAYER_CHARACTER_SPEC.md`, `ZOMBIE_CHARACTER_SPEC.md`  
> **Concept reference:** `references/approved-buildings-interiors-concept.png` (mood/layout reference only; not a source tilemap or final technical diagram)

## 1. Purpose and approval boundary

The master PRD now defines operable openings and additional enterable destinations. The original three layouts below remain the starter block.

Specify the **three playable, single-story suburban houses** that belong to the approved compact neighborhood. This document covers visual identity, layout, continuous outdoor-to-indoor gameplay, roof/wall occlusion, collision, zombie access, looting, React UI behavior, data contracts, save/load behavior, and acceptance tests.

**Binding rule:** An image is visual reference, not authority over the PRD. If mockup text suggests `E Enter House`, a loading screen, a separate top-down interior, weapons other than the baseball bat, ammunition, a day/night clock, or extra loot items, **ignore those details**. The approved rules in Sections 3–12 below supersede conflicting labels in concept images.

- **Approved:** same continuous isometric world and camera; three houses; walk-in entrances; automatic roof concealment while inside; readable single-floor rooms; static furniture; `E` to search/interact with lootable objects; distinct Starter/Supply/Risk house roles; grounded, worn domestic art.
- **Not yet locked:** final tile and map dimensions, specific furniture tile coordinates, exact roof/occluder polygon geometry, precise sprite scales, absolute collision grid sizing, and per-container item quantity. Validate these in Phaser + Tiled before locking production geometry.

## 2. MVP scope matrix

| Capability | MVP decision | Future-only |
|---|---|---|
| Enterable houses | **Exactly 3**: A, B, C | More buildings, multi-floor |
| Layout | Handcrafted, single-story residential interiors | Procedural interiors |
| House entry | Open a closed, unlocked exterior door with **E**, then walk through. Zombies can force a door during pursuit. | Locks and keys |
| World/camera | Same isometric world, same following camera; **no scene swap/teleport/load** | Dedicated interior scenes if later expressly approved |
| Roof | Hide/fade occupied house roof automatically | Complex cinematic roof systems |
| Foreground walls | Fade/hide only what blocks player readability | Destructible walls |
| Furniture | Static visuals and logical blockers | Movable furniture/building |
| Lootables | Cabinet, Drawer, Supply Box | Mailboxes, cars, cupboards with novel mechanics, crafting stations |
| Items | Baseball Bat, Canned Food, Water Bottle, Bandage | Firearms, ammo, tools, durability, item stacks |
| Zombies | Existing standard FSM zombie; can use walkable house entrances | Doors broken by zombies, special zombie archetypes |
| Lighting | Fixed daytime world; stable interior lighting accents | Day/night and dynamic weather |
| Map UI | Existing circular minimap + full neighborhood map | Detailed floor maps, fog of war, custom markers |

## 3. Three approved houses

Use stable identifiers `house_a`, `house_b`, `house_c`. These are **roles and visual layouts**, not separate gameplay engines. Both default playable survivors (male/female) can enter and navigate all houses with identical mechanics.

### 3.1 House A — Starter House

**Role:** initial player spawn; safe introduction; basic supplies; clear exit.

- **Exterior:** weathered light beige/cream siding, aged warm-brown pitched roof, modest porch, cleanest readable entry among the three houses; modest fence/yard.
- **Interior:** compact living area, small kitchen, sleeping area and optional tiny washroom where footprint allows; sparse domestic clutter; warm wood and faded neutral materials.
- **Gameplay:** player spawns on an unobstructed **interior** walkable cell. Roof starts hidden because the player is already inside. A clear route leads to the closed front door.
- **Supplies.** Designate one ordinary mapped container on the starter route. Its authored fresh-run contents include exactly one Baseball Bat and at least one Water Bottle for either survivor. A newcomer can obtain both there without searching any other container. Other House A containers may hold optional supplies from the existing catalog.
- **Opening safety.** Frame a short, readable route from the initial position to the starter container. Initial zombie positions and wander destinations leave enough time for a newcomer to walk to it, search it, take the bat and equip it. Zombies simulate from the first active step and can use the entrance once open.

#### House A opening playtest

1. Start a newcomer inside House A at the default gameplay zoom. Ask them to find and equip the bat without pointing out the container. Observe where they look, which route they walk, and whether they can use the normal Search, Transfer and Equip actions before any fight becomes necessary.
2. Check the route for both survivor choices and every supported starting layout or placement configuration. Where placements vary, include the earliest legal approach by a zombie given its starting position and wander destination. A configuration that forces a sprint or a fight fails the opening check.
3. Repeat while the survivor lingers with the world active. Keep the normal overlay pause rules intact. In a starting configuration where an ordinary wander route eventually leads inside, trace the zombie through the open door. Waiting increases exposure without scheduling an attack.
4. Observe zombie state, movement, perception and population before and after Transfer and Equip. Confirm ordinary simulation is active from the first step, and any detection has its usual range and line-of-sight cause. If the opening is too tight, adjust the indoor route or starting placements and retest.

### 3.2 House B — Supply House

**Role:** encourage exploration and scavenging.

- **Exterior.** Keep the aged gray siding, dark slate roof and distinctive porch. Frame the siding and porch so both remain recognizable from the first street junction on leaving House A at default gameplay zoom.
- **Interior:** a somewhat more detailed kitchen, living area, bedroom and small secondary space; cabinets/drawers immediately understandable as search targets.
- **Gameplay.** Lead from the normal entrance to the kitchen by a short, clear path. The layout and recognizable kitchen furnishings should be readable at default gameplay zoom. Recheck the route after changes to furniture or collision.
- **Supplies.** Place at least one guaranteed Canned Food in the designated kitchen container on every fresh run. Use ordinary Search and Transfer. Other rooms may offer optional supplies and stay optional for the guaranteed can.
- **Threat.** Ordinary zombie wandering, sight, pursuit and doorway navigation apply throughout the building. Layout and positioning make a combat-free visit possible under viable conditions. The route remains open to zombies.

#### House B supply playtest

1. On a fresh run, leave House A by the direct route. Walk through House B’s open entrance, reach the designated kitchen container, press **E Search**, and transfer a Canned Food to a vacant slot. Repeat on a separate fresh run using the detour. Exercise both routes across supported layouts and loot configurations with normal zombie wandering, detection and pursuit enabled.
2. Close Loot and verify that the original food instance has moved from the container to inventory. Revisiting shows only the remaining loot. Save & Exit, then Continue and confirm that the same instance remains in its saved slot and stays absent from the container.
3. With Hunger at exactly zero, check that **Use** is disabled and the can is still carried. Check House C’s fresh-run food and water minimum separately.
4. For the first-supply-run playtest, give a newcomer a viable approach with the standard zombie simulation active. At default zoom and without navigation markers or directions, let them enter B, identify the kitchen container, take the can, close Loot and leave. They must have a practical way through with no combat using timing and positioning. In a separate pass, verify a pursuing zombie can take the same open doorway and kitchen path.

### 3.3 House C — Risk House

**Role:** higher tension in exchange for more potential supplies.

- **Exterior:** more distressed muted red/brown siding, damaged/boarded decorative windows, patched or dark roof, overgrowth and slightly more clutter.
- **Interior:** disarrayed furnishing arrangement and restrained scattered debris, while all required routes remain navigable; visual wear is stronger, but interactive objects remain readable.
- **Gameplay:** danger comes from **the existing standard zombies' placement and approach paths**, not from stronger/faster zombies, traps, a new detection system, or scripted horror events.
- **Supplies.** Every fresh run places at least one Canned Food and one Water Bottle inside House C. For each item, verify a walkable path from the entrance to a valid standing position with an unobstructed search interaction. The items may share a container or occupy different ones.
- **Safety:** the building must have a valid path between its entrance and at least one usable interior space, with a reasonable escape route.

### 3.4 House differentiation without extra systems

Distinct houses use exterior material/roof colors, yard/porch treatment, arrangement of standard rooms, furniture density, and loot **distribution**. No unique new item mechanics, special enemy classes, or per-house UI screens are introduced.

## 4. Exterior → interior → exterior: canonical gameplay behavior

### 4.1 Walk-in flow

1. Player approaches the doorway using WASD. If the door is closed, **E** opens it.
2. Player walks through the doorway on a continuous **walkable collision/navigation path**.
3. Player's logical position enters the house's registered `interiorZone` (or equivalent collision-independent trigger).
4. The matching house **roof group hides or smoothly fades** and remains concealed while the player occupies that zone. Any near-facing wall that obscures the player may fade selectively.
5. Player continues moving inside using exactly the same controls, camera and simulation. No loading panel, world teleport, top-down switch, camera cut, or special indoor gameplay mode.
6. When player walks out of the zone via the open doorway, the roof returns and selectively faded walls restore. Debounce/hysteresis avoids rapid flicker at the boundary.

**Player starts inside House A:** run start should immediately apply the inside visual state; never briefly draw the roof over the starting player during initial game reveal.

### 4.2 Interaction rules

- `E` targets a nearby reachable **Cabinet**, **Drawer**, or **Supply Box** (and any other PRD-approved contextual interactable only if later scoped). It is **not the house-entry key**.
- Display a contextual prompt such as **`E  SEARCH`** when a valid container is within interaction range.
- Resolve one intended target (e.g., nearest valid candidate with stable tie-breaking) and reject interactions through a solid wall, across inaccessible rooms, or when UI panels block game controls.
- The interior remains part of the same game world: attack, zombie AI, survival updates, and time progression operate normally while playing, whether outside or inside.
- A separate loot panel may pause simulation if that is the decided unified UI-overlay behavior; do not treat merely crossing a doorway as a pause event.

### 4.3 Roof and wall visual policy

- **Outside:** roof is normally visible, making the building legible as a house.
- **Inside:** the occupied house roof is hidden (or faded far enough to fully read the player and rooms).
- **Walls:** preserve outer-wall/room outlines for orientation; fade only those foreground sections that actually conceal player or necessary navigable floor.
- **Other houses:** stay roofed if not occupied, unless render-space overlaps require a carefully bounded visibility fix.
- Prefer grouping roofs by `houseId`; do not globally hide every roof when entering one house.
- Roof/occluder visuals must not change collision, pathfinding or actual line of sight. Rendering-only alpha is **not** a gameplay door-opening mechanic.
- Interior transitions must not require spawning duplicate player entities or swapping map instances.

## 5. Space, room layout, and visual art direction

### 5.1 Spatial conventions

- Keep approved **2:1 isometric projection** across exterior and interior. Suggested **64×32 px ground tile footprint** is **provisional**, per `ART_DIRECTION.md` and `MAP_DESIGN_SPEC.md`.
- Both male and female survivor sprites use consistent logical footprints/feet anchors; zombie variants share their same standard logical footprint policy.
- Use **one floor** per building; no stairs or floor changing in MVP.
- Room geometry must be validated in Tiled for character clearance and zombie navigation, not inferred from a painted perspective concept image.
- Every reachable loot container must have a valid nearby standing/interaction cell. Fixtures should not form impossible corridors.

### 5.2 Approved room palette

| Room/zone | Art cues | Navigation/interaction cues |
|---|---|---|
| Living area | Worn wooden floor, sofa, simple rug, coffee table, bookshelf | Broad clear floor space; furniture collision matches silhouette |
| Kitchen | Muted tile/wood, sink, countertop, refrigerator, cupboards | Cabinets/drawers recognizable; kitchen route stays walkable |
| Bedroom | Bed, small nightstand/dresser, muted linens | Bed blocks appropriately, usable walking clearance |
| Bathroom (where footprint allows) | Tiled floor, simple fixtures | Static decor only unless separately assigned lootable container |
| Hall/entrance | Open doorway, worn threshold, short walkway | Walkable transition shared with exterior grid |

Do not require every house to have an identical number of rooms; approve detailed floor plans during implementation spike, retaining the house roles above. Domestic props are **not automatically lootable**: only mapped, explicit container instances can be searched.

### 5.3 Material and style consistency

- Same grounded pixel-art direction as the approved player/zombie/map boards: subdued asphalt/olive outdoors, weathered beige/gray/rust siding, dark roofs, wood and tile indoors.
- Use selective fine damage/grime; **no extreme gore**, glossy showroom furniture or saturated fantasy colors.
- Static interior light accents (e.g., illustrated lamp glow) are okay as art treatment; no gameplay-driven dynamic lights, day clock, or weather simulation in MVP.
- Clear silhouettes and legible walkable floors take precedence over visual clutter.
- Concept portraits, wide-angle cutaways and images are *visual references*. Actual tile placement must be authored in Tiled and tested in Phaser.

## 6. Tiled data and runtime architecture

### 6.1 Recommended map organization

Use **one fixed world map** with three integrated interior zones and overlapping visual layers; do not create unrelated scene-specific interior worlds. Existing layer naming from `ART_DIRECTION.md` / `MAP_DESIGN_SPEC.md` remains the base:

```text
Ground / GroundDetails / RoadDetails
BuildingFloor + InteriorFloor
BuildingsBase / InteriorFurniture
Actors (runtime; depth sorted at feet)
AboveActors / ForegroundOccluders
Roofs (house-owned groups; conditional visibility)
CollisionObjects (logical, independent of image alpha)
NavigationObstacles (logical)
InteriorZones (logical)
Entrances (logical fixed openings)
InteractionPoints (logical container anchors)
SpawnPoints (logical player / zombie anchors)
```

Layer labels are conceptual; the selected Tiled export can combine compatible layers if it preserves their responsibilities.

### 6.2 Stable building identity

Each house must have:

| Property | Meaning |
|---|---|
| `houseId` | `house_a`, `house_b`, `house_c` |
| `interiorZone` | Defined logical shape used to determine player inside/outside |
| `roofGroupId` | Render group or layer(s) to hide/fade |
| `foregroundOccluderIds` | Optional wall sections that need selective visual fade |
| `entranceId` and `entryPath` | Open, passable path between exterior and interior |
| `containerIds` | Explicit cabinet/drawer/supply-box instances |
| `worldVersion` | Stable world version used with saves |

Example conceptual data shape (**not** an exact Tiled JSON serialization contract):

```ts
interface HouseDefinition {
  houseId: 'house_a' | 'house_b' | 'house_c';
  interiorZoneId: string;
  roofGroupId: string;
  foregroundOccluderIds: string[];
  entranceIds: string[];
  containerIds: string[];
}
```

### 6.3 Collision and navigation

- Tiled exports **explicit** logical solid geometry for walls, fences, trunks, vehicles and static furniture; do not infer collision from visible sprite transparency.
- Doorway is actually walkable in **both player collision and zombie pathfinding**. Avoid a pathfinding-only opening that the collision system blocks or vice versa.
- An unalerted zombie can select a reachable interior wander destination and cross the open threshold under ordinary movement. A roof reveal on the survivor’s return displays the occupants already there. It never creates or relocates an occupant.
- Default zombies may follow an accessible path indoors and out; roof visibility is driven by **player** occupancy, not by zombies or roof rendering state.
- For interactions, calculate distance using the game's logical coordinate system and ensure blocking geometry is respected.
- Test walking and chasing through entrances from both directions, including path refresh without routing through solid walls.

### 6.4 Roof visibility implementation guidance

- Keep a per-house visual visibility controller, e.g., `setOccupiedHouse(houseId | null)` or equivalent.
- Derive occupied house from stable interior zones; for transitions use edge tolerance, last-known house, or small debounce rather than relying on pixel-perfect boundary equality.
- If using fade, cap transition time to an unobtrusive short duration and verify clarity at sprint speed; fully immediate visibility switching is acceptable for the MVP.
- Recompute correct roof state on **new game**, **load game**, and **restart** before gameplay is shown.
- Keep normal Phaser depth sorting grounded at feet; near-facing walls may require separate render segments rather than making the entire room translucent.

## 7. Loot containers and item distribution

### 7.1 Container categories

Only these **MVP gameplay container types** are searchable:

1. **Cabinet** — kitchen/general supplies.
2. **Drawer** — smaller household supplies.
3. **Supply Box** — clearly designated supplies.

All operate through one reusable container interaction component/system; visuals vary without inventing new loot mechanics.

### 7.2 Item catalog and rules

- Valid item IDs correspond only to: **Baseball Bat, Canned Food, Water Bottle, Bandage**.
- Inventory has **12 slots**, each occupied slot holding one item instance in MVP; **no stacking**.
- Transfer succeeds only if inventory has capacity; on failure show feedback and leave item in container.
- A previously transferred item cannot be re-looted unless it was deliberately returned to a supported location through normal gameplay.
- Static visible books, televisions, kitchen utensils, food packaging, wardrobes, mailboxes and vehicles **are decorative**, unless one is explicitly defined as one of the approved container instances.
- Keep loot contents deterministic/defined for the MVP rather than requiring procedural random-loot algorithms.

### 7.3 Distribution intent

- House A’s designated starter container holds the guaranteed bat and water together. Preserve its short, readable approach and use ordinary Search and Transfer for both.
- House B offers multiple searchable containers and at least one obtainable can on every fresh run. Its remaining quantities and placements are tunable within that minimum.
- House C: more risk around the approach and reasonably rewarding containers using the existing four-item catalog. Risk is conveyed through ordinary zombies and clutter/readability, not arbitrary inaccessible loot.

Tune container locations and quantities in map configuration during playtests. Keep the House C minimum in every configuration and check that the supply trip still carries risk and its finite stock leaves hunger and thirst meaningful.

## 8. Player, zombie and UI interactions

- The **selected survivor** (`survivor_male` or `survivor_female`) determines appearance only; both have the same collision, interaction reach, gameplay statistics and movement rules.
- The existing **one standard zombie archetype**, with five cosmetic looks including male/female, uses the same rules inside and outside; no added zombie difficulty tiers.
- HUD, survival timer, circular minimap and equipped-weapon UI continue rendering indoors. The minimap stays **north-up fixed** and shows the neighborhood, not hidden loot or detailed indoor floor plans.
- `M` or minimap click opens the **approved full neighborhood map** and pauses simulation. The house does not trigger it automatically.
- `I` opens inventory and `Esc` pauses/closes according to the existing UI lifecycle. Avoid overlapping modal input handling.
- Do not add a pistol, ammo counter, new hotbar, day/night clock, interior fog-of-war, safe-zone banner, or exclusive house controls because they appeared in a concept board.

## 9. Save/load behavior

`SaveRepository` remains storage-agnostic, with IndexedDB/Dexie in MVP. Save a versioned snapshot sufficient to reconstruct the run:

- player coordinates, orientation, selected character, status, inventory and equipped bat;
- run duration and survival meters;
- explicit container IDs and current contents/looted state;
- dropped items and remaining zombie states/positions;
- `mapId`/`worldVersion` and save schema version.

**Derived visual state:** Do **not** persist per-roof alpha as authoritative gameplay state. On load, determine whether player position is inside `house_a/b/c`; calculate roof and wall visibility immediately. Static building tile geometry, décor and roof assets are loaded from versioned map files rather than copied into every save.

On incompatible map/save version, show a recoverable error and do not silently relocate a player into a wall. Dead runs remain non-continuable.

## 10. Suggested implementation slices

| Slice | Deliverable | Evidence of completion |
|---|---|---|
| B1 — Prototype | One open doorway connecting street and House A interior | Player walks through without scene change or key press |
| B2 — Visibility | House A roof group/near walls hide correctly | No flicker, no wall/roof covering player |
| B3 — Collision | House A furniture, door threshold and zombie pathing | Both player and zombie take valid route |
| B4 — House set | Houses A/B/C with distinct exteriors/interiors | All three reachable, no fourth enterable structure |
| B5 — Loot | Approved containers and items in three houses | No duplicated loot or capacity loss |
| B6 — Persistence | Reload restores correct house/interior/zombie/loot state | Game resumes indoors with correct roof already hidden |
| B7 — UX/release | Full map/minimap remain consistent indoors | Controls, pause, 20-zombie performance verified |

For the implementation plan, B1–B4 belong primarily in **M1 Foundation**, B5 in **M3 Inventory/Looting**, and B6–B7 in **M5 Save/Release** (plus map features in the map amendment's scheduled milestone). Do not build all slices before proving B1.

## 11. Acceptance criteria — mandatory

### A. Walk-in continuity

- [ ] Exactly three single-floor houses `house_a`, `house_b`, `house_c` are enterable.
- [ ] Walking into/out of every house needs **no `E` press**, no teleport, no load screen and no game scene switch.
- [ ] Indoor and outdoor movement, orientation and camera behavior stay consistent.
- [ ] New Game starts the selected survivor inside House A with the roof hidden.

### B. Visual occlusion

- [ ] Only the occupied house's roof fades/hides automatically.
- [ ] Roof returns after player leaves the house.
- [ ] Foreground walls fade when needed while room geometry remains understandable.
- [ ] Enter/exit near a doorway does not cause persistent flicker or stuck hidden roofs.
- [ ] Player and zombies are depth-sorted correctly relative to furniture and walls.

### C. Navigation and AI

- [ ] All visible door openings are valid walkable paths in collision and pathfinding.
- [ ] Player and zombies cannot walk through walls, fences or solid furnishings.
- [ ] Standard zombies can navigate into and out of houses through valid door openings when pursuing; no newly introduced zombie mechanics.
- [ ] All three houses have reachable loot-container interaction cells.

### D. Loot and UI

- [ ] `E` performs the indicated search or pickup. Walk across the threshold to enter.
- [ ] Only Cabinet, Drawer and Supply Box are lootable in MVP.
- [ ] Only the four approved items can appear as loot.
- [ ] House A contains a reachable baseball bat without combat.
- [ ] Loot cannot duplicate; full inventory does not cause item loss.
- [ ] HUD, minimap and full map remain usable/accurate indoors; game pauses when the full map is open.

### E. Save and scope

- [ ] Saving inside a house and reloading restores position, loot state, zombie state and appropriate roof visibility.
- [ ] The starter houses begin unlocked. Cedar Workshop is the optional locked building in the expanded neighborhood.
- [ ] Implementation uses original or properly licensed assets matching `ART_DIRECTION.md`.

## 12. Open technical decisions (not visual-design blockers)

These are implementation choices, **not user re-approval questions**:

- Tile footprint/source resolution and camera scaling after a Phaser/Tiled spike.
- Exact collision polygon resolution and roof-zone boundary tolerance.
- Exact room outlines and furniture/container positions within the approved layouts.
- Loot quantities/balance, zombie placements near House C, and visibility transition timing.
- Whether limited room foreground walls use abrupt hide or subtle fade, provided occlusion works.

**Final approved design statement:** One continuous isometric neighborhood; exactly three open, enterable, single-floor houses; roof hides on occupancy; loot uses `E`; surviving zombies/players use the same world, collision, camera and simulation both indoors and outdoors.
