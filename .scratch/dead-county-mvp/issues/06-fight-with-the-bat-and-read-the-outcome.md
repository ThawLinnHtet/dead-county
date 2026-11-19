# 06: Fight with the bat and read the outcome

**What to build:** Equip the bat, read the zombie’s attack, and distinguish a successful swing from a miss at gameplay zoom.

**Blocked by:** 04 — Loot the starter container and equip the bat, 05 — Evade a roaming zombie

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A world Left Click locks aim at swing start. Contact checks current positions, reach, arc and obstacles. One qualifying zombie can take damage, ordered by angle, distance and stable ID.
- [ ] A swing costs zero Stamina and permits slow steps during the attack. Nonlethal damage keeps a committed attack in progress. Separate valid bites can each deal damage.
- [ ] Hits and misses share swing motion and sound. A confirmed hit adds one distinct impact sound and a brief visual cue identifying the actual target at default zoom even with sound muted.
- [ ] A bite has a distinct anticipation pose, contact and recovery. Confirmed bites cue the survivor and update Health. At zero Health the affected actor stops attacking.
- [ ] World attack commands stay suppressed during blocking overlays. A click that closes the UI cannot start a swing.

## Design and references

- Written sources. [PLAYER_CHARACTER_SPEC](../../../docs/PLAYER_CHARACTER_SPEC.md) · [ZOMBIE_CHARACTER_SPEC](../../../docs/ZOMBIE_CHARACTER_SPEC.md) · [GAMEPLAY_HUD_SPEC](../../../docs/GAMEPLAY_HUD_SPEC.md) · [ART_DIRECTION](../../../docs/ART_DIRECTION.md) · [0001-preserve-attack-timing](../../../docs/adr/0001-preserve-attack-timing.md)
- Visual references. [Dead County_ MVP Survivor Character Pair](../../../references/Dead%20County_%20MVP%20Survivor%20Character%20Pair.png) · [Dead County_ Zombie Design Sheet-2](../../../references/Dead%20County_%20Zombie%20Design%20Sheet-2.png) · [approved-gameplay-hud-concept](../../../references/approved-gameplay-hud-concept.png)

