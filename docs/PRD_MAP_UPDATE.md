# Dead County — PRD Amendment: Neighborhood Map & Navigation (MVP)

> **Status:** Approved feature addition; merge into `PRD.md`  
> **Date:** 2026-11-17  
> **Related:** `MAP_DESIGN_SPEC.md`

## 1. Confirmed changes

The approved concept includes **one handcrafted suburban neighborhood**, **exactly three enterable houses** and two navigation UI features:

1. A **circular top-right minimap** showing simple nearby roads, building footprints, and player direction/position.
2. A **full neighborhood map overlay**, opened by clicking/activating the minimap or pressing `M`, closed by `M`, `Esc`, or a close control; the game simulation pauses while this overlay is open.

These features are **MVP requirements**, superseding the older PRD feature matrix entry that described a World Map UI as post-MVP. **Advanced map functions** remain post-MVP.

## 2. Insert/update scope matrix

| Feature | MVP | Post-MVP |
|---|---|---|
| One compact fixed suburban neighborhood | Yes | Larger maps / streaming |
| Three accessible single-story houses | Yes | More enterable buildings / floors |
| Circular north-up minimap | Yes | Advanced minimap modes |
| Player orientation marker | Yes | Multiplayer markers |
| Full neighborhood map opened by `M` / click | Yes | Multi-region world map |
| Map open pauses world | Yes | Alternative map interaction modes |
| Roads, houses, player shown on maps | Yes | Fog of war, discovered regions, custom pins, annotations and routing |
| Fixed daytime | Yes | Day/night/weather |
| Mailboxes/abandoned vehicles as decorative props | Yes | Interactive variants if separately scoped |

## 3. New functional requirements

- **FR-MAP01:** Game displays a top-right, circular minimap during normal gameplay.
- **FR-MAP02:** Minimap renders simplified, grounded road and building geometry and the player position/orientation.
- **FR-MAP03:** Minimap remains **north-up fixed**; player arrow rotates with facing.
- **FR-MAP04:** Minimap does not show enemies, undiscovered loot or hidden container data.
- **FR-MAP05:** Clicking/activating minimap or pressing `M` opens the full neighborhood map.
- **FR-MAP06:** Full map shows the whole compact MVP neighborhood, all three house footprints/markers and player position.
- **FR-MAP07:** Full map closes on `M`, `Esc`, or the visible close control.
- **FR-MAP08:** While full map is open, game simulation and survival time are paused; gameplay commands are blocked.
- **FR-MAP09:** Map rendering uses local world/map assets; no online map provider or backend is needed.
- **FR-MAP10:** The two map views agree on geography and player location.

## 4. Clarifications and exclusions

- The PRD remains binding on **10–20 active zombies** and **only three enterable houses**.
- Houses A / B / C serve Starter, Supply, Risk roles, respectively, but exact interior layouts are not approved until Step 4.
- The neighborhood retains **fixed daytime** during MVP; a day/night cycle remains later scope.
- Mailbox, decorative crates and parked cars do not introduce new loot or vehicle gameplay features.
- Approximate dimensions shown on concept boards (e.g. `128×128` or `256×256` tiles) are *unapproved estimates* and must be validated in a Phaser/Tiled prototype.
- Do not add markers for zombies, loot, waypoints, annotations or travel routes to the MVP.

## 5. Update milestone plan

- **M1 Foundation:** Load small fixed isometric map, camera follow, walkability/collision, accessible house entrances, basic roof occlusion.
- **M3 or M4 (after stable map gameplay):** Add top-right circular minimap and full map overlay with typed Phaser/React bridge; opening map pauses gameplay.
- **M5 Release:** Validate controls, map icon accuracy, minimap performance and save/load compatibility.

## 6. Additional acceptance criteria

- User can orient outdoors via north-up circular minimap.
- Clicking minimap or pressing `M` opens a readable full map with player marker.
- Full map can close with `M`, `Esc` and close button; gameplay pause/resume works correctly.
- Map shows exactly three enterable house markers and never reveals zombie or loot locations.
- The map operates without a remote map service and does not duplicate game-state authority in React.

## 7. Document hierarchy

`PRD.md` + approved amendments → `MAP_DESIGN_SPEC.md` (map-specific interactions) → `DESIGN_SYSTEM.md` (HUD/component style) → `ART_DIRECTION.md` (world art). Detailed building/interior geometry awaits separate visual approval.
