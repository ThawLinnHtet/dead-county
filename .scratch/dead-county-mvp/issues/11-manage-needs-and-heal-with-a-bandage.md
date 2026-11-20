# 11: Manage needs and heal with a bandage

**What to build:** Read the survival meters, use consumables deliberately, and make the first supply run before critical needs begin harming Health.

**Blocked by:** 08 — Scavenge House C

**Status:** done

## Acceptance criteria

- [x] Health, Stamina, Hunger, Thirst and survival duration show the current run state. Needs and timers advance with active simulation and freeze for every pause reason.
- [x] Complete the viable House A → detour → House B kitchen trip at cautious walking pace after collecting and equipping the bat. Transfer food before either need drains Health, with ordinary progression active throughout.
- [x] Critical Hunger or Thirst can be lethal. When both are critical, use the greater damage rate and show both warnings. Distinguish need damage from the survivor’s bite cue.
- [x] Food and water are consumed only by eligible Use. Rest restores Stamina according to the approved rules. An eligible Bandage Use is the only Health recovery, clamps to full Health and consumes exactly one instance.
- [x] Disabled Use at zero need or full Health keeps the item. Successful Use shows the resulting stat in the panel.

The Chrome detour transferred the can at 19.8 seconds of active play, including a brief hesitation in House A. Critical Thirst and Hunger begin at 40 and 50 seconds respectively when untreated. Chrome fixtures verified warning and relief states, Use feedback, and pause holds at both documented sizes. The combined production build kept all four stats and survival time frozen while the full map was open. The coordinator suite verified both independent lethal needs, the higher overlapping damage rate, and one consumption per eligible item.

## Design and references

- Written sources. [GAMEPLAY_HUD_SPEC](../../../docs/GAMEPLAY_HUD_SPEC.md) · [INVENTORY_UI_SPEC](../../../docs/INVENTORY_UI_SPEC.md) · [MAP_DESIGN_SPEC](../../../docs/MAP_DESIGN_SPEC.md) · [BUILDING_INTERIOR_SPEC](../../../docs/BUILDING_INTERIOR_SPEC.md)
- Visual references. [approved-gameplay-hud-concept](../../../references/approved-gameplay-hud-concept.png) · [approved-inventory-concept](../../../references/approved-inventory-concept.png)

