# 12: Die and start another run

**What to build:** Finish a run at zero Health, see how long the survivor lasted and start fresh or return to Main Menu.

**Blocked by:** 11 — Manage needs and heal with a bandage

**Status:** done

## Acceptance criteria

- [x] Both bite and critical-need damage can end a run at zero Health. Enter Game Over once and freeze the world, remaining inputs and final active survival duration.
- [x] Use the approved Game Over composition with final survival time, New Run and Main Menu. A death transition cannot increase the result.
- [x] New Run returns to survivor selection and creates the authored fresh start. Main Menu leaves the finished run unavailable for Continue.
- [x] Verify both survivor outcomes and keyboard and pointer behavior against the approved screen spec.

Chrome verified a female survivor's bite death and a male survivor's critical-need death in the authored neighborhood. The Game Over screen was checked at 1280×720, 1920×1080, and 1100×620. Chrome also verified the frozen clock, keyboard New Run, pointer Main Menu, fresh House A start, and disabled Continue. The background uses a hooded, face-obscured survivor for either selection. Ticket 13 owns durable invalidation of a saved run using the coordinator's Game Over result.

## Design and references

- Written sources. [GAME_OVER_SPEC](../../../docs/GAME_OVER_SPEC.md) · [MAIN_MENU_SPEC](../../../docs/MAIN_MENU_SPEC.md) · [CHARACTER_SELECTION_SPEC](../../../docs/CHARACTER_SELECTION_SPEC.md) · [DESIGN_SYSTEM](../../../docs/DESIGN_SYSTEM.md)
- Visual references. [approved-game-over-concept](../../../references/approved-game-over-concept.png) · [approved-main-menu](../../../references/approved-main-menu.png) · [approved-character-selection](../../../references/approved-character-selection.png)

