# 16: Recover from unreadable or damaged saves

**What to build:** Recover from a temporary read failure, an unsupported save schema or confirmed damaged data with clear choices that preserve the committed slot.

**Blocked by:** 13 — Save and Continue with one tab owner

**Status:** ready-for-agent

## Acceptance criteria

- [ ] An unsuccessful read keeps any live in-memory run frozen and the stored record intact. Try reading again verifies ownership and retries only the read.
- [ ] Inspect the save-schema version before validating the payload. A newer unsupported schema disables Continue, gives compatibility guidance and preserves the record through menu actions.
- [ ] Offer Replace damaged save only after successfully reading and confirming malformation in a supported format or the common header. Explicit confirmation and successful new-run preparation precede the replacement commit.
- [ ] In the same transaction, validate ownership and compare the revision or the complete original stored value when the revision is unreadable. Cancel, a changed record, failed placement and an aborted commit preserve the existing data.

## Design and references

- Written sources. [MAIN_MENU_SPEC](../../../docs/MAIN_MENU_SPEC.md) · [PAUSE_MENU_SPEC](../../../docs/PAUSE_MENU_SPEC.md) · [CONFIRMATION_DIALOG_SPEC](../../../docs/CONFIRMATION_DIALOG_SPEC.md) · [CHARACTER_SELECTION_SPEC](../../../docs/CHARACTER_SELECTION_SPEC.md) · [0004-confirmed-damaged-save-replacement](../../../docs/adr/0004-confirmed-damaged-save-replacement.md)
- Visual references. [approved-main-menu](../../../references/approved-main-menu.png) · [dead_county_pause_menu_single_concept](../../../references/dead_county_pause_menu_single_concept.png) · [approved-overwrite-confirmation](../../../references/approved-overwrite-confirmation.png)

