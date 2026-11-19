# 09: Drop and recover an item

**What to build:** Drop a carried item nearby and recover the same instance through the contextual interaction prompt.

**Blocked by:** 06 — Fight with the bat and read the outcome

**Status:** ready-for-agent

## Acceptance criteria

- [ ] An item drops at the survivor’s feet or the nearest immediately reachable spot on the same side of an obstacle. Only successful placement clears the original slot and related equipment.
- [ ] A blocked placement or simulated failure preserves the same slot, instance and equipped state. Show “Cannot drop item here.” A successful retry produces exactly one drop.
- [ ] Show one prompt for the nearest eligible object and favor a dropped item on a mixed tie. E acts on the displayed instance. A full inventory leaves the item recoverable and shows feedback.
- [ ] Recovery restores the same item identity in the first empty slot. A recovered bat still requires Equip. Unequip and Drop stay disabled for the equipped bat during a swing and recovery.

## Design and references

- Written sources. [INVENTORY_UI_SPEC](../../../docs/INVENTORY_UI_SPEC.md) · [GAMEPLAY_HUD_SPEC](../../../docs/GAMEPLAY_HUD_SPEC.md) · [LOOT_SEARCH_UI_SPEC](../../../docs/LOOT_SEARCH_UI_SPEC.md)
- Visual references. [approved-inventory-concept](../../../references/approved-inventory-concept.png) · [approved-gameplay-hud-concept](../../../references/approved-gameplay-hud-concept.png)

