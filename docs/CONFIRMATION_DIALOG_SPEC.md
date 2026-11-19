# Dead County — Confirmation Dialog Specification

**Step:** 8.3 — New Game Overwrite Confirmation  
**Status:** Approved visual design; MVP-safe implementation specification  
**Version:** 1.0 · 2026-11-18  
**Platform:** Desktop browser · React / TypeScript / Tailwind UI · IndexedDB/Dexie saves  
**Related documents:** `PRD.md` (v2.1), `DESIGN_SYSTEM.md`, `MAIN_MENU_SPEC.md`, `CHARACTER_SELECTION_SPEC.md`, `PAUSE_MENU_SPEC.md`, `GAME_OVER_SPEC.md`  
**Approved reference:** `references/approved-overwrite-confirmation.png`

## 1. Approval boundary

The user approved the **single “New Game?” overwrite confirmation dialog** design:
- Small centered dark charcoal modal; thin worn cream border; restrained post-apocalyptic texture.
- Warning icon, clear cream heading, short explanation.
- Two large horizontal actions: **Cancel** (secondary dark) and **New Game** (rust-red destructive confirmation).
- Game/menu backdrop subdued by a dark scrim.

The **larger concept board** that originally contained multiple other dialogs is **not** wholesale approval of those screens. This specification includes minimal save-progress/success/error behaviors **only where already required** by the master PRD and Pause Menu spec. Do not add save galleries, “Load Game”, multiple overwrite steps, or unrelated dialogs based on concept art.

**Exact approved visible copy:**

- Heading: **New Game?**
- Body: **This will overwrite your current save progress. Continue?**
- Buttons: **Cancel** · **New Game**

Use live React text, not baked-in image text. A confirm button icon is optional decoration; the label must remain readable.

## 2. Purpose and trigger

The MVP has exactly **one resumable alive-run save** stored locally using IndexedDB/Dexie. A new run must never silently destroy an unfinished saved run.

Canonical MVP user flow:

```text
Main Menu
  └─ New Game
       └─ Choose Survivor (male / female; no default required)
            └─ Start Game
                 ├─ verified empty slot or verified dead run → Start fresh run
                 ├─ read failed or schema unsupported → Preserve slot and show recovery status
                 ├─ confirmed malformed record → Explicit damaged-save recovery
                 └─ valid unfinished save → “New Game?” dialog
                      ├─ Cancel → stay on Choose Survivor; save unchanged
                      └─ New Game → commit replacement and start new run
```

The Master PRD expresses the requirement to warn before an existing run is overwritten. Character Selection spec places that check at **Start Game**; follow this sequence to avoid asking twice. Merely opening Main Menu or Choose Survivor does not delete or mutate a saved run.

**Only show the confirmation** when there is a valid, compatible, unfinished **alive** active save and a new game action would replace it. No save or an invalid/non-resumable/dead save must not produce a misleading “overwrite your current progress” warning. Save validation/loading errors may have their own recoverable status UI but must never be silently treated as safe-to-delete data.

## 3. Visual and layout guidance

### 3.1 Desktop layout

- Center over the current menu/character-selection screen (not a new Phaser scene or gameplay level).
- Use a compact modal with a sensible responsive max-width (approximately 440–520 CSS px at 1280×720). Keep important content visible at narrower desktop sizes.
- Surface: `color.surface` (`#1B1E1D`); overlay scrim: `color.scrim` (`rgb(0 0 0 / 70%)`).
- Outline: subtle distressed cream visual accent with semantic `color.border` (`#49544A`); do not sacrifice contrast to texture.
- Header: cream `color.textPrimary` (`#EEE6D6`), Bebas Neue or the project's approved display font, with a warning triangle icon.
- Body: Inter, comfortably readable and centered/left aligned consistently; `color.textPrimary` / readable muted explanatory text.
- Button placement: **Cancel left**, **New Game right**. Buttons should be similarly sized with ≥44px clickable height.
- Confirm CTA: rust-red branded/destructive treatment using `color.dangerFilled` (`#963C33`) and readable cream text. Cancel: charcoal/dark outlined treatment.
- Use approved `color.focus` (`#D6AE6D`) visible ring, not the destructive red for keyboard focus.
- Keep other menus visible underneath as a dimmed, inert background.
- No HUD zombie blips, day/night clock, other survival stats, save slot cards, or unapproved features are added by this modal.

### 3.2 Content order

```text
        ┌─────────────────────────────────────────────┐
        │  ⚠       New Game?                          │
        │  ─────────────────────────────────────────  │
        │  This will overwrite your current save      │
        │  progress. Continue?                        │
        │                                             │
        │   [       Cancel       ] [    New Game    ]  │
        └─────────────────────────────────────────────┘
```

All strings must be displayed as semantic UI text with working buttons and accessible names. Background artwork is decorative only.

## 4. Behavior contract

| Event | Expected behavior |
|---|---|
| `Start Game`, no alive unfinished save | Skip the modal and start the new run with chosen survivor. |
| `Start Game`, alive unfinished save | Show **one** overwrite modal without changing stored data. |
| `Cancel` | Close modal, return focus to Start Game / character-selection context, leave current save intact. |
| `Esc` while dialog is open | Same as Cancel; do not also go Back, Pause or trigger another overlay. |
| `New Game` | Enter a single pending transition, initialize a new run with selected survivor, replace old run safely, and enter gameplay. |
| Double click / repeated submit | Exactly one replacement/start command; ignore duplicates while pending. |
| Failure starting/committing run | Show recoverable error; do not claim success, do not enter gameplay, and preserve previously valid save whenever possible. |
| Continue existing save | Restore existing run via Main Menu; does **not** open this modal. |
| Dead run | Dead save is non-continuable; no false “overwrite unfinished run” warning. |

**Safe replacement.** Preserve the existing slot throughout character selection and Cancel. On confirmation, initialize the fresh run and commit replacement only while owning the slot and at the revision that the player agreed to replace. Validate both in the replacement transaction. If either changed, reject the operation and preserve the committed slot.

When the new run succeeds, start it in **House A**, with the selected male/female survivor, correct indoor roof state, fresh zombie/container/inventory state, and elapsed survival timer reset to zero.

## 5. Input, modality and accessibility

- The dialog is the topmost **modal**; block interaction with the underlying character picker, other menus, gameplay canvas and all hotkeys that would act behind it.
- Use semantic `role="alertdialog"` (or the equivalent accessible dialog primitive) with heading and description associations and `aria-modal="true"`.
- On open, place focus on **Cancel** by default (safe action). Do **not** automatically focus destructive **New Game**.
- Tab / Shift+Tab cycle through enabled modal controls; Enter/Space activates the focused button. `Esc` cancels unless a destructive transaction is already committing, in which case do not ambiguously cancel an in-flight write.
- Restore focus to the correct Start Game action when cancelled.
- Pointer clicks in React modal/scrim must never pass through to Phaser as the **Left Mouse Click attack**.
- Avoid click-outside-to-confirm; backdrop click should not perform a destructive action. It may optionally cancel only if consistent with the modal component's accessibility behavior.
- While committing a new run: disable repeated action, show a brief readable busy state, and keep the old save safe until commit.

## 6. Save feedback required by existing MVP

**These are behavior states, not separately visually approved modal designs.** Reuse existing menu/pause notice or compact dialog components as appropriate; do not add extra screens.

### 6.1 Save Game (Pause Menu)

- On click: show **Saving…** while the game stays paused.
- After the IndexedDB/Dexie write actually succeeds: show **Game saved** and remain on Pause Menu.
- Follow the [save recovery rules](PAUSE_MENU_SPEC.md#54-save-conflict-recovery). A revision conflict offers Reload latest save, a lost owner returns to the blocked menu, and a verified retryable storage error offers Try again.
- No extra “Are you sure?” required for normal Save Game. A named save-slot picker is not in MVP.

### 6.2 Save & Exit (Pause Menu)

- Show **Saving…** during persistence.
- On success **only**, transition to Main Menu, where **Continue** can resume the newly saved active run.
- A failed Save & Exit follows the same cause-specific recovery rules as Save Game. Keep the simulation frozen and the committed save intact.
- Do **not** create a mandatory separate “Save & Exit?” confirmation for this already-safe action; `PAUSE_MENU_SPEC.md` explicitly does not require one.

### 6.3 Save / validation edge cases

- Disable repeated save submissions while one write is in flight.
- If storage access is denied, quota exhausted, schema incompatible or data invalid: explain the issue in simple language and leave the player on a recoverable screen.
- Offer **Replace damaged save** after a successful read confirms malformation. Warn “Starting a new run will replace this damaged save.” Require explicit confirmation and retain the original on Cancel or Back. Confirmation authorizes replacement only of the observed record once the chosen survivor is ready and successfully placed. Follow the guarded [replacement decision](adr/0004-confirmed-damaged-save-replacement.md).
- No automatic backup, cloud saving, save-slot thumbnails, arbitrary save management or standalone Load Game screen in MVP.

## 7. React and save-repository responsibilities

**React** owns modal visibility, copy, buttons, focus, pending/error feedback and pointer/keyboard event interception.

**Game coordinator / save service** owns selecting the chosen survivor, checking the active save's eligibility, initializing the new run, committing save replacement safely, and changing scene/run state.

**IndexedDB/Dexie repository** stores one versioned active-run snapshot and exposes validated save operations. Keep raw Dexie calls out of individual dialog buttons.

Illustrative contract:

```ts
type OverwriteDialogState =
  | { kind: 'closed' }
  | { kind: 'confirm-new-game'; survivorId: 'survivor_male' | 'survivor_female' }
  | { kind: 'starting'; survivorId: 'survivor_male' | 'survivor_female' }
  | { kind: 'error'; survivorId: 'survivor_male' | 'survivor_female'; message: string };

interface NewGameCoordinator {
  hasValidUnfinishedSave(): Promise<boolean>;
  requestStartNewGame(survivorId: 'survivor_male' | 'survivor_female'): Promise<void>;
  cancelNewGameOverwrite(): void;
  confirmNewGameOverwrite(): Promise<void>;
}
```

These are **example API names**, not instructions to implement a second game-state store. Reuse the project's existing typed React–Phaser bridge and `SaveRepository`, and guard against stale async transitions after unmount.

## 8. Test and acceptance checklist

- [ ] The approved centered **New Game?** dialog matches the provided reference in mood, layout and text hierarchy.
- [ ] Exactly two dialog actions: **Cancel** and **New Game**; warning text explicitly describes replacing current save progress.
- [ ] Main Menu New Game → Character Selection does not alter saved data.
- [ ] A verified empty slot or verified dead run starts through the normal New Game flow. An unsuccessful read or unsupported schema preserves the slot. Confirmed damage uses its own explicit recovery flow.
- [ ] With a valid alive unfinished save, Start Game shows exactly **one** confirmation dialog.
- [ ] Cancel / Esc leave the previous save byte-for-byte valid and return to Choose Survivor.
- [ ] New Game starts the selected survivor in House A, resets world/run state and replaces the prior run safely.
- [ ] Double click and key repeat cannot create multiple new runs or duplicate Phaser scenes/listeners.
- [ ] Save/check/init errors do not silently delete the old save, present fake success, or enter a broken run.
- [ ] Underlying inputs are inert while modal is open; focus starts on Cancel, remains within dialog, and restores afterward.
- [ ] No Left Click melee combat is triggered by dialog interactions.
- [ ] Save Game shows success only when write finishes, and stays paused.
- [ ] Save & Exit returns to Main Menu only after successful write; failure retains paused game.
- [ ] The MVP keeps one active save slot; no standalone Load Game, multiple save cards or unnecessary dialogs.
- [ ] After death, the run is not resumable and Game Over has **New Game** and **Main Menu** only.

## 9. Production handoff

- **Visual approval applies to:** the **New Game overwrite confirmation dialog** only.
- **Supporting approved behavior:** the Save Game / Save & Exit feedback required by the Pause Menu spec.
- **Not approved:** other confirmation variants from the larger concept board or any post-MVP save gallery.
- **PRD change:** none required; this document clarifies existing MVP rules without changing product scope.
- **Next step:** Step 9 — effects, real production sprite/tileset asset requirements, and implementation handoff.
