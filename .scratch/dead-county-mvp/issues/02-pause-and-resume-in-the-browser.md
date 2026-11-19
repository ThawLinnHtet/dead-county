# 02: Pause and resume in the browser

**What to build:** Pause and resume a live run through the approved Pause Menu and when returning to a hidden browser tab.

**Blocked by:** 01 — Walk through House A

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Esc opens the Pause Menu and stops world movement and active survival time. Resume advances the same run once all pause reasons clear.
- [ ] Visibility, the foreground panel and pending saves have independent pause reasons. Returning from a hidden tab restores the panel and requires explicit Resume before simulation advances.
- [ ] Held WASD and Shift clear when a hold begins. Closing an overlay or returning from a hidden tab produces no player-driven movement until a fresh press. Key repeats cannot reactivate input.
- [ ] Check keyboard focus and pointer interception against the Pause spec. Pause controls remain usable while simulation is frozen.

## Design and references

- Written sources. [PAUSE_MENU_SPEC](../../../docs/PAUSE_MENU_SPEC.md) · [DESIGN_SYSTEM](../../../docs/DESIGN_SYSTEM.md) · [0002-independent-pause-reasons](../../../docs/adr/0002-independent-pause-reasons.md)
- Visual references. [dead_county_pause_menu_single_concept](../../../references/dead_county_pause_menu_single_concept.png)

