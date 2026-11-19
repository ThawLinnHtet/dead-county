# 10: Navigate with the minimap and full map

**What to build:** Orient in the neighborhood using a circular minimap and a full map that agree with the playable world.

**Blocked by:** 08 — Scavenge House C

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The circular minimap works indoors and outdoors. It stays north-up while the player marker reflects position and facing.
- [ ] M and activating the minimap open the full map. The map shows the neighborhood, three houses and player position from the same geometry. Enemy and loot locations stay concealed.
- [ ] The full map adds its own pause reason. Closing removes only that reason. Input and pointer suppression hold through the closing gesture.
- [ ] Compare the HUD and map at the documented viewport. Routes, buildings and player marker remain readable at the supported display sizes.

## Design and references

- Written sources. [GAMEPLAY_HUD_SPEC](../../../docs/GAMEPLAY_HUD_SPEC.md) · [MAP_DESIGN_SPEC](../../../docs/MAP_DESIGN_SPEC.md) · [DESIGN_SYSTEM](../../../docs/DESIGN_SYSTEM.md)
- Visual references. [approved-gameplay-hud-concept](../../../references/approved-gameplay-hud-concept.png) · [Dead County Neighborhood Map Blueprint](../../../references/Dead%20County%20Neighborhood%20Map%20Blueprint.png)

