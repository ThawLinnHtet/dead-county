# 11: Manage needs and heal with a bandage

**What to build:** Read the survival meters, use consumables deliberately, and make the first supply run before critical needs begin harming Health.

**Blocked by:** 08 — Scavenge House C

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Health, Stamina, Hunger, Thirst and survival duration show the current run state. Needs and timers advance with active simulation and freeze for every pause reason.
- [ ] Complete the viable House A → detour → House B kitchen trip at cautious walking pace after collecting and equipping the bat. Transfer food before either need drains Health, with ordinary progression active throughout.
- [ ] Critical Hunger or Thirst can be lethal. When both are critical, use the greater damage rate and show both warnings. Distinguish need damage from the survivor’s bite cue.
- [ ] Food and water are consumed only by eligible Use. Rest restores Stamina according to the approved rules. An eligible Bandage Use is the only Health recovery, clamps to full Health and consumes exactly one instance.
- [ ] Disabled Use at zero need or full Health keeps the item. Successful Use shows the resulting stat in the panel.

## Design and references

- Written sources. [GAMEPLAY_HUD_SPEC](../../../docs/GAMEPLAY_HUD_SPEC.md) · [INVENTORY_UI_SPEC](../../../docs/INVENTORY_UI_SPEC.md) · [MAP_DESIGN_SPEC](../../../docs/MAP_DESIGN_SPEC.md) · [BUILDING_INTERIOR_SPEC](../../../docs/BUILDING_INTERIOR_SPEC.md)
- Visual references. [approved-gameplay-hud-concept](../../../references/approved-gameplay-hud-concept.png) · [approved-inventory-concept](../../../references/approved-inventory-concept.png)

