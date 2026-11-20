# 09: Drop and recover an item

**What to build:** Drop a carried item nearby and recover the same instance through the contextual interaction prompt.

**Blocked by:** 06 — Fight with the bat and read the outcome

**Status:** done

## Acceptance criteria

- [x] An item drops at the survivor’s feet or the nearest immediately reachable spot on the same side of an obstacle. Only successful placement clears the original slot and related equipment.
- [x] A blocked placement or simulated failure preserves the same slot, instance and equipped state. Show “Cannot drop item here.” A successful retry produces exactly one drop.
- [x] Show one prompt for the nearest eligible object and favor a dropped item on a mixed tie. E acts on the displayed instance. A full inventory leaves the item recoverable and shows feedback.
- [x] Recovery restores the same item identity in the first empty slot. A recovered bat still requires Equip. Unequip and Drop stay disabled for the equipped bat during a swing and recovery.

Chrome verified the ordinary loot, Drop and E pickup flow with both survivors at 1280 × 720 and 1920 × 1080. Seeded Chrome scenarios verified full-inventory feedback and blocked placement with a successful retry. Coordinator tests exercised item identity, slot order, wall reachability, deterministic prompt ties and equipment locks through recovery. The Save & Exit and Continue check belongs to the save slice.

## Design and references

- Written sources. [INVENTORY_UI_SPEC](../../../docs/INVENTORY_UI_SPEC.md) · [GAMEPLAY_HUD_SPEC](../../../docs/GAMEPLAY_HUD_SPEC.md) · [LOOT_SEARCH_UI_SPEC](../../../docs/LOOT_SEARCH_UI_SPEC.md)
- Visual references. [approved-inventory-concept](../../../references/approved-inventory-concept.png) · [approved-gameplay-hud-concept](../../../references/approved-gameplay-hud-concept.png)

