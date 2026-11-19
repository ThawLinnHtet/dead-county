# Dead County — PRD Amendment: Buildings & Interiors (MVP)

> **Status:** Approved (Step 4 of 4) · **Date:** 2026-11-17  
> **Merge target:** `docs/PRD.md` · **Supporting spec:** `BUILDING_INTERIOR_SPEC.md`  
> **Reason:** Lock the approved building visuals and seamless entry gameplay, and correct inaccurate concept-board labels.

## 1. Executive decision

Dead County MVP contains **exactly three enterable, single-story houses** integrated into the **same Phaser isometric neighborhood scene/world**:

- `house_a` — **Starter House:** spawn inside, straightforward layout, basic supplies, accessible baseball bat before combat.
- `house_b` — **Supply House:** more containers and scavenging opportunities; moderate tension.
- `house_c` — **Risk House:** higher encounter pressure from existing standard zombies, more clutter and comparatively rewarding loot.

Every house uses the **same controls, camera, character mechanics, zombie rules and survival simulation** as the outdoors. The player **walks through a fixed open doorway**; there is **no `E` Enter House requirement, loading screen, scene change, teleport, top-down switch, locked-door system or floor transition**. Roof/foreground-wall visual occlusion responds automatically to player occupancy.

## 2. PRD feature matrix changes

| Feature | MVP v1.0 | Post-MVP |
|---|---|---|
| Three unique enterable residential houses | Required | More buildings/regions |
| Single-floor interiors | Required | Multiple floors |
| Same-world seamless walk-in | Required | Other entrance mechanics only if rescoped |
| Roof hide/fade when player is inside | Required | Advanced occlusion transitions |
| Occluding wall selective fade | Required when blocking player readability | Destructible walls |
| Static furniture & collision | Required | Furniture moving and base construction |
| Cabinet, Drawer, Supply Box | Required | Additional types and crafting storage |
| Four-item loot catalog | Required | Larger catalog, stacking, firearms |
| Zombie access via open doorways | Required where a valid navigation route exists | Doors broken by zombies/advanced AI |
| Fixed daytime interior visuals | Required | Day/night and dynamic lighting |
| Indoor circular minimap and full neighborhood overlay | Required (per prior map amendment) | Room-level maps, fog of war |

## 3. Amend section 3.1 — Game World and Environment

Retain existing FR-W01–FR-W08 and add:

- **FR-W09:** The world contains exactly three named, single-story, enterable houses: A/Starter, B/Supply, C/Risk.
- **FR-W10:** Each house has at least one fixed **walkable** doorway connecting interior and exterior in the **same logical world**; walking across the threshold does not require an interaction key or change Phaser scenes.
- **FR-W11:** When player enters an interior zone, its roof becomes hidden or sufficiently faded so that player and rooms are readable; when player leaves, roof returns.
- **FR-W12:** Foreground wall sections may fade when necessary to avoid concealing the player while retaining readable boundaries and correct collision.
- **FR-W13:** House entry/exit does not pause simulation, teleport player, trigger a loading screen, or change to a top-down camera.
- **FR-W14:** Buildings and furnishings provide collision and nav geometry consistent for player and zombie routing, including open doorways.
- **FR-W15:** New Game spawns the chosen survivor inside House A, on a clear floor cell; the visual roof state is correct immediately.

## 4. Amend sections 3.6–3.7 — Inventory and Looting

- **FR-L09:** `E` activates nearby *loot/search* interactions and is **not required for entering** the three houses.
- **FR-L10:** Only mapped **Cabinet**, **Drawer** and **Supply Box** instances are lootable; other similar-looking environmental props do not automatically create new loot types.
- **FR-L11:** All loot is restricted to **Baseball Bat, Canned Food, Water Bottle, Bandage**; item transfer must honor 12-slot capacity and non-stacking rules.
- **FR-L12:** House A has a reachable baseball bat without requiring a zombie fight. House B and House C offer additional supplies and different risk/visual tension through existing mechanics.
- **FR-L13:** All lootable containers are reachable from walkable floor cells; interaction cannot cross a blocked wall or incompatible room boundary.

Keep the existing PRD rule that loot state persists across save/load.

## 5. Amend Zombie AI and Save/Load

- **FR-Z12:** Existing standard zombie FSM/pathfinding supports entering and leaving houses via valid open entrances, without new enemy types, zombie stats, or door-destruction systems.
- **FR-SAVE11:** Loading a valid save made inside a house restores its roof/wall visibility based on loaded player position **before gameplay is displayed**.
- **FR-SAVE12:** Save versioned run state (container contents, dropped items, zombie states, player location), not duplicates of the static house tilemaps or an authoritative roof-alpha value.

## 6. Clarify player controls and UI

- `WASD`: seamless movement outside and inside.
- `Shift`: sprint according to the existing stamina rules.
- `E`: contextual search/interact for containers; **not "Enter House"**.
- `I`: inventory; `Space`: baseball-bat melee; `Esc`: pause/close per modal lifecycle.
- `M`/minimap click: full neighborhood map, which pauses gameplay per `PRD_MAP_UPDATE.md`.
- No new ammo, crafting, durability, weapon hotbar, day/night clock, interior fog-of-war or special interior mode UI is introduced.

## 7. PRD acceptance criteria additions

1. A player can walk from road into each house and out again using the same world camera, with no scene switch or loading transition.
2. Roof visibility changes automatically and cleanly for the occupied house; relevant foreground walls do not conceal the playable interior.
3. The selected male/female survivor starts safely inside House A with roof hidden and an accessible route to a baseball bat.
4. All three houses have different visual roles, fixed walkable entrances, reachable approved container types and functioning furniture collision.
5. Standard zombies navigate available indoor/outdoor paths without passing through walls.
6. Saving inside a building and continuing restores accurate player, zombie and container state with the correct visual roof state.
7. The minimap remains the north-up neighborhood minimap indoors; the full neighborhood map retains existing `M`/click and pause behavior.
8. All post-MVP props/mechanics accidentally present in concept mockups are excluded from shipping MVP assets and controls.

## 8. Milestone and documentation updates

- **M1 Foundation:** Implement integrated interiors, entrances, collision/nav, roof and wall occlusion; test House A end to end before expanding to Houses B/C.
- **M2 Combat:** Verify standard zombies can route through valid open entries and fight indoors.
- **M3 Looting:** Implement mapped cabinets/drawers/supply boxes and four-item distribution across houses.
- **M5 Release:** Save/load indoor state, roof restore, regression/performance testing and deployed UX verification.
- Cross-reference `BUILDING_INTERIOR_SPEC.md` from the PRD, and keep `MAP_DESIGN_SPEC.md`, `DESIGN_SYSTEM.md` and `ART_DIRECTION.md` aligned.

## 9. Scope precedence

`PRD.md` **plus approved amendments** define binding MVP behavior. `BUILDING_INTERIOR_SPEC.md` elaborates it. Approved concept images describe visual mood but do **not** override approved mechanics or introduce features shown accidentally in mockups.

**Integration note:** This file is an amendment to merge into your repository's `PRD.md`; it does **not** claim the original repository PRD has already been edited.
