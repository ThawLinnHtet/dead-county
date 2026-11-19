# 15: Recover from ownership and revision conflicts

**What to build:** Recover predictably when another tab owns the run or the local save revision changes while the player is saving.

**Blocked by:** 13 — Save and Continue with one tab owner

**Status:** ready-for-agent

## Acceptance criteria

- [ ] After release, multiple idle menus remain idle. Simultaneous explicit Continue attempts produce one owner. The losing tab returns to the blocked menu. Delayed actions from a prior owner cannot affect the winner.
- [ ] A revision conflict leaves gameplay frozen and displays the approved message. Reload latest save warns that unsaved progress will be discarded, verifies ownership and reads without modifying the committed record.
- [ ] Reload of a live run returns to Pause. A dead record returns to Main Menu with Continue disabled. Ownership loss returns to the blocked state.
- [ ] An ordinary write failure offers Try again while both guards match. Every retry rechecks the token and expected revision inside its write transaction. Ownership loss offers blocked recovery.

## Design and references

- Written sources. [MAIN_MENU_SPEC](../../../docs/MAIN_MENU_SPEC.md) · [PAUSE_MENU_SPEC](../../../docs/PAUSE_MENU_SPEC.md) · [CONFIRMATION_DIALOG_SPEC](../../../docs/CONFIRMATION_DIALOG_SPEC.md) · [0003-exclusive-local-run-and-save-revisions](../../../docs/adr/0003-exclusive-local-run-and-save-revisions.md)
- Visual references. [approved-main-menu](../../../references/approved-main-menu.png) · [dead_county_pause_menu_single_concept](../../../references/dead_county_pause_menu_single_concept.png)

