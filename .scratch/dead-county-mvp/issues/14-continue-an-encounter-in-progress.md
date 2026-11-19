# 14: Continue an encounter in progress

**What to build:** Continue during a fight, a lost-sight pursuit or an ordinary wander and get the same behavior as resuming from Pause.

**Blocked by:** 13 — Save and Continue with one tab owner

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Resume a committed swing or bite before and after contact. Restore aim, applied-damage state, phase and recovery before the first active step. A prior hit cannot apply twice.
- [ ] Restore each zombie’s position, pursuit state, last known position, remaining grace, wander destination or its absence, and idle wait. Rebuild navigation from logical state without saved waypoints or random draws during restoration.
- [ ] Compare Pause → Resume with Save & Exit → Continue under matched input and active steps. Match transition steps and compare positions within the documented tolerance.
- [ ] Test an unreachable sighting or wander target, and a zombie crossing into House A. Time away consumes none of the simulation timers. Continue starts with empty movement input.

## Design and references

- Written sources. [ZOMBIE_CHARACTER_SPEC](../../../docs/ZOMBIE_CHARACTER_SPEC.md) · [PLAYER_CHARACTER_SPEC](../../../docs/PLAYER_CHARACTER_SPEC.md) · [PAUSE_MENU_SPEC](../../../docs/PAUSE_MENU_SPEC.md) · [0001-preserve-attack-timing](../../../docs/adr/0001-preserve-attack-timing.md) · [0002-independent-pause-reasons](../../../docs/adr/0002-independent-pause-reasons.md)
- Visual references. [Dead County_ Zombie Design Sheet-2](../../../references/Dead%20County_%20Zombie%20Design%20Sheet-2.png) · [dead_county_pause_menu_single_concept](../../../references/dead_county_pause_menu_single_concept.png)

