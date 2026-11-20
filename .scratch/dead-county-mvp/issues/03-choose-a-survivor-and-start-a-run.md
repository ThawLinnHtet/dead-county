# 03: Choose a survivor and start a run

**What to build:** Enter the game through the Main Menu and choose either approved survivor. Both begin a fresh run in House A with identical abilities.

**Blocked by:** 01 — Walk through House A

**Status:** done

## Acceptance criteria

- [x] New Game opens the two survivor choices. Controls describes WASD, Shift, mouse aim, Left Click and the approved interaction keys. Back returns to Main Menu.
- [x] Both characters have equal presentation and selection affordances. Start Run requires a selection and opens House A with its roof already cleared.
- [x] Either survivor starts at Health 100, Stamina 100, Hunger 0 and Thirst 0 with an empty 12-slot inventory and no equipped weapon.
- [x] Verify the approved menu and character selection layouts at the documented desktop viewport with real focusable controls.

## Design and references

- Written sources. [MAIN_MENU_SPEC](../../../docs/MAIN_MENU_SPEC.md) · [CHARACTER_SELECTION_SPEC](../../../docs/CHARACTER_SELECTION_SPEC.md) · [PLAYER_CHARACTER_SPEC](../../../docs/PLAYER_CHARACTER_SPEC.md) · [DESIGN_SYSTEM](../../../docs/DESIGN_SYSTEM.md)
- Visual references. [approved-main-menu](../../../references/approved-main-menu.png) · [approved-character-selection](../../../references/approved-character-selection.png) · [Dead County_ MVP Survivor Character Pair](../../../references/Dead%20County_%20MVP%20Survivor%20Character%20Pair.png)

Verified equal run defaults in the coordinator and the approved menu and survivor selection flow in Chrome at 1280×720.
