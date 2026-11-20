# 04: Loot the starter container and equip the bat

**What to build:** Walk to House A’s starter container, search it, transfer the bat and water, and equip the bat through the ordinary inventory flow.

**Blocked by:** 02 — Pause and resume in the browser, 03 — Choose a survivor and start a run

**Status:** done

## Acceptance criteria

- [x] Either survivor can reach the designated container by the short indoor route. Every fresh run gives the container exactly one Baseball Bat and at least one Water Bottle.
- [x] One anchored E Search prompt opens the approved blocking Loot interface. Each Transfer moves one instance to the first empty slot in row order and briefly highlights the receiving slot.
- [x] Reopening the container shows only remaining items. A full inventory preserves the source instance and reports the capacity failure.
- [x] Equip is an explicit action and marks the bat’s slot as equipped. A transferred bottle stays in inventory and has disabled Use at zero Thirst. Closing the panel clears only its own pause reason.

Checked the normal Chrome flow with both survivors at 1280 × 720 and 1920 × 1080. Coordinator tests exercise full capacity, stale selections, and closing Loot after an independent visibility pause.

## Design and references

- Written sources. [BUILDING_INTERIOR_SPEC](../../../docs/BUILDING_INTERIOR_SPEC.md) · [LOOT_SEARCH_UI_SPEC](../../../docs/LOOT_SEARCH_UI_SPEC.md) · [INVENTORY_UI_SPEC](../../../docs/INVENTORY_UI_SPEC.md) · [GAMEPLAY_HUD_SPEC](../../../docs/GAMEPLAY_HUD_SPEC.md)
- Visual references. [approved-buildings-interiors-concept](../../../references/approved-buildings-interiors-concept.png) · [approved-loot-search-concept](../../../references/approved-loot-search-concept.png) · [approved-inventory-concept](../../../references/approved-inventory-concept.png) · [approved-gameplay-hud-concept](../../../references/approved-gameplay-hud-concept.png)

