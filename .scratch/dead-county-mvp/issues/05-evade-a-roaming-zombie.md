# 05: Evade a roaming zombie

**What to build:** In the prototype block, encounter an ordinary zombie that can wander through the open doorway, see the survivor, and continue pursuing a last known position.

**Blocked by:** 01 — Walk through House A

**Status:** ready-for-agent

## Acceptance criteria

- [ ] One standard zombie starts its authored wander in the playable block. Wander and Chase use the same collision-valid indoor and outdoor paths. Blocked paths respect collision and retry within bounds.
- [ ] Range and line of sight establish detection. After sight loss, hidden movement cannot move the destination away from the last known position. A fresh sighting immediately redirects the chase.
- [ ] Spend pursuit grace only in active play. After expiry without a sighting, the zombie begins ordinary wandering where it stopped.
- [ ] On clear ground a pursuing zombie gains on a walking survivor. Sprinting spends Stamina and opens a gap. Shift must be pressed again after sprint exhaustion. Sprint itself does not end pursuit.

## Design and references

- Written sources. [ZOMBIE_CHARACTER_SPEC](../../../docs/ZOMBIE_CHARACTER_SPEC.md) · [MAP_DESIGN_SPEC](../../../docs/MAP_DESIGN_SPEC.md) · [BUILDING_INTERIOR_SPEC](../../../docs/BUILDING_INTERIOR_SPEC.md) · [ART_DIRECTION](../../../docs/ART_DIRECTION.md)
- Visual references. [Dead County_ Zombie Design Blueprint-1](../../../references/Dead%20County_%20Zombie%20Design%20Blueprint-1.png) · [Dead County_ Zombie Design Sheet-2](../../../references/Dead%20County_%20Zombie%20Design%20Sheet-2.png) · [Dead County_ Building Entry Gameplay-1](../../../references/Dead%20County_%20Building%20Entry%20Gameplay-1.png)

