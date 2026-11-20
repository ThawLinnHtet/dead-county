# 08: Scavenge House C

**What to build:** Explore the complete authored neighborhood and choose whether to risk a run to House C for dependable essentials.

**Blocked by:** 07 — Make the first supply run to House B

**Status:** done

## Acceptance criteria

- [x] One continuous neighborhood contains exactly three enterable single-floor houses with readable routes, open entrances and the approved roof treatment.
- [x] Each fresh run gives House C at least one Canned Food and one Water Bottle in reachable ordinary loot containers. Both can be transferred through normal inventory rules.
- [x] The authored start contains 10–20 ordinary zombies using the same gameplay archetype across five visual variants. Both survivors share starting positions, wander destinations and loot configuration.
- [x] House C’s exposure and approach create greater encounter pressure through normal placement, perception and pursuit. Verify House A’s starter path still offers a combat-free opportunity.

Chrome at 1280 × 720 and default zoom covered fresh runs with both survivors. Both equipped the House A bat, entered House C through the open front door, transferred the can and bottle through the ordinary cabinet, and sprinted out through the side door without attacking. The cabinet was depleted after transfer. Both runs finished the escape alive, with 56 and 78 Health. The occupied house's roof faded and returned on exit while neighboring roofs stayed visible. Separate Chrome runs collected the House B can and left via both approaches.

With the same authored roster and walking inputs along each route, the starter cabinet route had zero simultaneous pursuers in sight. Each House B approach peaked at one. The House C approach peaked at three. Starting positions, wander destinations and loot matched across repeated fresh starts with both survivors. All ten zombies began moving in the first active step. Controlled combat traces matched across all five appearances. After seven seconds of active time in House A, the bat remained obtainable without combat. Waiting longer let an ordinary zombie enter and reach the survivor.

The 47-test suite and production build passed. An unaided newcomer playtest still needs to assess how readily players identify the routes, recognize the five looks, and judge when to spend Stamina. Need-rate balancing and restoration of depleted House C stock on Continue depend on later tickets.

## Design and references

- Written sources. [MAP_DESIGN_SPEC](../../../docs/MAP_DESIGN_SPEC.md) · [BUILDING_INTERIOR_SPEC](../../../docs/BUILDING_INTERIOR_SPEC.md) · [ZOMBIE_CHARACTER_SPEC](../../../docs/ZOMBIE_CHARACTER_SPEC.md) · [ART_DIRECTION](../../../docs/ART_DIRECTION.md)
- Visual references. [Dead County Neighborhood Map Blueprint](../../../references/Dead%20County%20Neighborhood%20Map%20Blueprint.png) · [approved-buildings-interiors-concept](../../../references/approved-buildings-interiors-concept.png) · [Dead County_ Zombie Design Sheet-2](../../../references/Dead%20County_%20Zombie%20Design%20Sheet-2.png)

