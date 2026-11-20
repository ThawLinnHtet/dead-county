# 10: Navigate with the minimap and full map

**What to build:** Orient in the neighborhood using a circular minimap and a full map that agree with the playable world.

**Blocked by:** 08 — Scavenge House C

**Status:** done

## Acceptance criteria

- [x] The circular minimap works indoors and outdoors. It stays north-up while the player marker reflects position and facing.
- [x] M and activating the minimap open the full map. The map shows the neighborhood, three houses and player position from the same geometry. Enemy and loot locations stay concealed.
- [x] The full map adds its own pause reason. Closing removes only that reason. Input and pointer suppression hold through the closing gesture.
- [x] Compare the HUD and map at the documented viewport. Routes, buildings and player marker remain readable at the supported display sizes.

## Design and references

- Written sources. [GAMEPLAY_HUD_SPEC](../../../docs/GAMEPLAY_HUD_SPEC.md) · [MAP_DESIGN_SPEC](../../../docs/MAP_DESIGN_SPEC.md) · [DESIGN_SYSTEM](../../../docs/DESIGN_SYSTEM.md)
- Visual references. [approved-gameplay-hud-concept](../../../references/approved-gameplay-hud-concept.png) · [Dead County Neighborhood Map Blueprint](../../../references/Dead%20County%20Neighborhood%20Map%20Blueprint.png)

## Verification

- Chrome through New Game at 1280×720, 1920×1080, and 1024×640. Compared the artwork and HUD with both approved references at the default zoom. Checked the fixed north label, shared map artwork, live player position and facing, all three labeled houses, and readable routes.
- Opened with M, Enter on the focused minimap, and mouse click. Closed with M, Escape, and the X. Checked focus containment, canvas focus restoration, timer and movement freeze, and the explicit Resume step after a simulated browser visibility interruption.
- Equipped the Baseball Bat in normal play. The minimap, modal backdrop, close control and a pointer release after keyboard dismissal sent no attack events to the canvas. A fresh world click started a swing.
- All 49 simulation tests passed, including independent map, visibility and save holds. Type checking and the production build passed.
