# 13: Save and Continue with one tab owner

**What to build:** Commit a paused run to the local slot, return through Continue, and keep a second tab from mutating the run.

**Blocked by:** 09 — Drop and recover an item, 12 — Die and start another run

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Acquire exclusive run ownership before beginning play. The owner retains it while paused or hidden. A second tab shows the blocked state and starts an acquisition attempt only after an explicit Continue.
- [ ] Every run write checks current ownership and expected revision in the committing IndexedDB transaction. Verify wrong-owner and stale-revision writes leave the committed slot intact.
- [ ] Save Game stays in Pause and reports success after commit. Save & Exit releases ownership and returns to Main Menu only after commit. Continue acquires and reads the latest committed state.
- [ ] Restore the survivor’s identity, world position, stats, inventory, equipment, depleted loot, dropped items and active time. Restore indoor roof state before the first visible frame.
- [ ] Verified unfinished saves require confirmation once at Start Run. Cancel preserves the original. Death commits an ownership- and revision-guarded invalidation and leaves Continue unavailable for that run.

## Design and references

- Written sources. [PAUSE_MENU_SPEC](../../../docs/PAUSE_MENU_SPEC.md) · [MAIN_MENU_SPEC](../../../docs/MAIN_MENU_SPEC.md) · [CONFIRMATION_DIALOG_SPEC](../../../docs/CONFIRMATION_DIALOG_SPEC.md) · [GAME_OVER_SPEC](../../../docs/GAME_OVER_SPEC.md) · [0003-exclusive-local-run-and-save-revisions](../../../docs/adr/0003-exclusive-local-run-and-save-revisions.md)
- Visual references. [dead_county_pause_menu_single_concept](../../../references/dead_county_pause_menu_single_concept.png) · [approved-main-menu](../../../references/approved-main-menu.png) · [approved-overwrite-confirmation](../../../references/approved-overwrite-confirmation.png)

