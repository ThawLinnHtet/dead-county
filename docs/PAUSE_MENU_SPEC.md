# Dead County — Pause Menu UI Specification

**Status:** Visual composition approved; this specification defines the MVP-safe implementation.  
**Version:** 1.0 — 2026-11-18  
**Phase:** Step 8.1 — Pause Menu  
**Platform:** Desktop browser · React / TypeScript UI over Phaser · IndexedDB / Dexie local saves  
**Source of truth:** `PRD.md` v2.1, `DESIGN_SYSTEM.md`, `GAMEPLAY_HUD_SPEC.md`. Reference artwork is **style guidance**, not feature authority.

## 1. Scope and approval

The user approved the **single-screen Pause Menu** reference: a dimmed isometric suburban street, a centered narrow weathered-charcoal panel, distressed cream **DEAD COUNTY** heading, compact vertically stacked button rows, restrained rust-red selected-row highlight, and a recognizable gameplay HUD/minimap beneath the dim overlay.

**Final MVP menu has exactly three actions:**

1. **Resume** — Close the pause menu and continue the same active run.
2. **Save Game** — Persist the current alive run in the one IndexedDB save slot; remain paused after completing the save.
3. **Save & Exit** — Persist the run, then return to Main Menu **only after a confirmed successful write**.

The reference image also shows **Load Game**, **Settings**, and **Quit to Main Menu**. **Do not add these to the final MVP Pause Menu.** The reference's `Load Game` is not a separate MVP screen: the save is loaded via **Main Menu → Continue**. More save slots or a separate Load Game UI are optional future ideas, not approved post-MVP requirements.

No other actions (Quit, Restart, Load Game, Settings, How to Play, separate unsaved Exit) are included in this version. Avoid generating implicit extra requirements from image content.

## 2. Presentation and layout

- **Backdrop:** Keep the real current game scene visible, darkened by a scrim (`color.scrim`, approximately 70% black). No scene switch, loading sequence, or required heavy blur. World and HUD remain recognizable but inactive.
- **Center stack:** Brand heading **DEAD COUNTY**, then a compact vertically stacked panel with only the three actions. Align and size relative to the game viewport rather than hard-coded screenshot pixels.
- **Button hierarchy:** `Resume` is visually emphasized when first opened, using a restrained rust-red selected-row state borrowed from the reference. **Keyboard focus** is indicated separately with the design system's high-contrast focus ring. `Save Game` and `Save & Exit` are subdued until hovered, selected or focused.
- **Visual tokens:** `color.surface` `#1B1E1D`, `color.border` `#49544A`, `color.textPrimary` `#EEE6D6`, `color.danger` `#B14A3A`, `color.focus` `#D6AE6D`. Use semantic design tokens from `DESIGN_SYSTEM.md` instead of per-screen colors. Don't overemphasize red for every action; it's a selection treatment, not a claim that Resume is destructive.
- **Typography:** Distressed brand title may be decorative; actionable labels, progress and errors use live accessible text. Use Bebas Neue for display emphasis and Inter for clear descriptive text, according to the design system. No text baked into a background image.
- **Spacing/hit areas:** Three distinct rows, comfortable click targets (approximately 44px high), crisp divider/border treatment and no excessive glow. Usable at 1280×720 and 1920×1080; adapt gracefully to smaller desktop windows.
- **Background HUD:** Player stats, elapsed survival duration and north-up circular minimap may remain visually present behind the scrim but **cannot be interacted with** while the pause menu is open. No enemy markers on the minimap.
- **Footer hints (optional):** Small `Esc Resume` / `Enter Select` prompts may be displayed if the actual keyboard behavior matches. Omit `Esc Back` where it would misleadingly imply returning to another menu.

## 3. Input and navigation

| Input | Required action |
|---|---|
| `Esc` during active gameplay | Open Pause Menu; suspend simulation |
| `Esc` with the Pause Menu foregrounded and no pending save | Resume an ordinarily paused run. After a visibility interruption, use the explicit Resume action. |
| `Enter` / `Space` with a focused button | Activate that button (ordinary accessible button behavior) |
| Left Mouse Click on a Pause Menu button | Activate that button **without** a Phaser melee attack |
| `Tab` / `Shift+Tab` | Move visible keyboard focus among the three actions |
| Hover / focus | Provide a clear, non-confusing button state |

- A single Escape key press must **not** open and instantly close the menu, or close multiple overlays in the same event.
- Opening Pause Menu while an Inventory, Loot/Search or Full Map blocking overlay is already foregrounded must follow the shared overlay priority model, not stack independent menus or unexpectedly resume gameplay. Standard Escape closes the existing foreground overlay first.
- While the Pause Menu is open, game-world inputs (WASD, Shift sprint, `E Search`, `I`, `M`, Left Click bat attack) are suppressed. UI pointer events never propagate into Phaser's world attack handler.
- On any gameplay hold, clear WASD and Shift immediately. After the last hold clears and any required Resume occurs, only a fresh gameplay press can activate a movement key. Ignore repeated keydowns from a held key. Continue starts with the same input reset. A frozen or saved attack retains its phase, locked direction and recovery.
- When the tab becomes visible, restore the foreground panel. If the player was in gameplay or Pause, show Resume. The visible Resume action clears the pending acknowledgment and the Pause-menu reason. Advance only when every hold has cleared and this tab owns a live run.
- Pause cannot open after a run has reached Game Over; use the Game Over screen instead.

## 4. World-pause contract

**Pause is a simulation state, not merely a visual overlay.** Freeze:

- Player movement, attacks and combat cooldown progression.
- Zombie FSM/pathfinding updates, motion, attacks and damage.
- Stamina recovery/drain, hunger/thirst progression, health changes due to survival systems.
- Elapsed active survival-duration timer.
- Contextual `E Search` interaction execution and loot transfers.

The visible game frame and current world positions remain unchanged. Avoid duplicate pause/resume handlers or an unintentional extra frame advancing the run during an asynchronous save. The menu and save controls remain responsive while the game world is paused.

## 5. Save behavior

### 5.1 Save Game

1. Player selects **Save Game** while paused.
2. Show an authentic short-lived `Saving…` pending state; disable duplicate save submissions. Keep the world paused.
3. Request a **consistent snapshot** of the current game run through the existing game-state boundary.
4. Pass the snapshot, current ownership token and expected slot revision to the save repository. Validate both values and commit the snapshot and advanced revision together.
5. Only after persistence has completed successfully, show `Game saved` feedback and leave the Pause Menu open. The player can Resume or Save & Exit afterward.
6. If persistence fails, route by cause using §5.4. Keep the simulation frozen and the committed record intact.

### 5.2 Save & Exit

1. Player selects **Save & Exit** while paused.
2. Use the **same validated snapshot + save path** as Save Game; show `Saving…` and block repeated submissions.
3. On verified Save & Exit success, release ownership and transition to Main Menu. A new owner reads the committed slot before play.
4. **On failure**, stay in the paused current run and show a recoverable error. Do not exit, silently discard progress or overwrite a prior valid save with partial data.
5. No extra "Are you sure?" modal is required for this action when the save succeeds. A failure cannot be converted into an automatic unsaved exit.

### 5.3 Save content and constraints

- Exactly **one active local save**; saving replaces it as the current state of the same unfinished run, not a named slot or a gallery of saves.
- Snapshot each living zombie’s pursuit at the paused simulation boundary. Both Save Game and Save & Exit preserve the last sighting and remaining active pursuit time. Completing the write leaves these values unchanged. [Pursuit snapshot](ZOMBIE_CHARACTER_SPEC.md#81-pursuit-snapshot)
- The same snapshot preserves an idle or wandering zombie’s position, selected destination (including none) and remaining active idle wait. Save Game and Save & Exit use the same capture rule. [Wander snapshot](ZOMBIE_CHARACTER_SPEC.md#83-wander-snapshot)
- Capture the run ID; selected male/female survivor; location, facing and survival stats; equipment and 12 unstacked inventory items; world/container depletion; recoverable dropped items; zombie cosmetic IDs, health, positions and alive/dead states; elapsed **active** survival time; and schema/world versions.
- Validate the save data; do not serialize decorative scene geometry or use roof opacity as gameplay truth. On load, derive indoor roof visibility from saved player occupancy before the first gameplay frame.
- Dead runs are **non-continuable**. Death routes to Game Over and invalidates the one active Continue save as defined by `PRD.md`; this Pause Menu cannot be used to rescue a dead run.
- Post-MVP autosave uses the same local slot and validated snapshot as a manual save. While visible, take a checkpoint after inventory or equipment changes, safehouse progress, or entering or leaving sleep. Checkpoint after 30 seconds of active gameplay since the last committed save while awake. Successful autosaves do not freeze the world or clear movement input.
- Continue displays the location, day, and time from the last committed save. Closing or refreshing can discard progress after that checkpoint. Save & Exit commits the exact paused state before exiting.
- While a live run has unsaved progress, request the browser's leave confirmation for closing, refreshing or navigating away. Cancel keeps the active run. Successful saves clear the warning until the simulation changes again. Switching tabs uses the usual visibility pause.
- The repository validates ownership and the expected revision in the same IndexedDB transaction as the write, including on every retry.

### 5.4 Save conflict recovery

These outcomes apply to Save Game and Save & Exit. Only a committed write can complete a save or a requested exit.

| Outcome | What the player sees | Permitted action |
|---|---|---|
| Ownership lost | “This run is open in another tab.” | Freeze the old run and return to the blocked menu. After release, wait for explicit Continue. |
| Owner still valid, revision changed | “Your progress wasn’t saved because the local save changed.” Show **Reload latest save** beside “Reloading will discard unsaved progress in this tab.” | Keep a conflict pause reason active. Esc, Resume, returning to the tab and dismissing a panel cannot clear it. Wait for the player to choose reload. |
| Ordinary storage failure with matching owner and revision | “Could not save.” with **Try again** | Retry the original operation with its expected revision. The retry transaction rechecks both guards. Route any new failure by its actual cause. |

Reload reads the current committed slot under verified exclusive ownership. Leave the snapshot and revision intact. Replace local memory only after a successful read and validation. A live save returns to Pause with any other blockers intact. A death marker returns the player to Main Menu with Continue disabled. A lost owner returns to the blocked menu. A read failure keeps the conflict hold and current in-memory run intact. Offer **Try reading again**, which verifies ownership and repeats only the read. A successful read then follows the [save classification rules](PRD.md#112-local-run-ownership-and-save-shape).

## 6. States and feedback

| Menu state | What user sees | World / input behavior |
|---|---|---|
| Opening | Dimmed world, centered brand + three buttons; Resume initially highlighted | Paused; world input blocked |
| Idle paused | Resume / Save Game / Save & Exit; clear focus on the active control | Paused |
| Saving | `Saving…` on the relevant action; disable conflicting exits and duplicate writes | Paused; React UI responsive |
| Save succeeded (Save Game) | `Game saved` status, then normal paused controls | Still paused |
| Save succeeded (Save & Exit) | Transition to Main Menu | Old scene cleaned up safely |
| Save failed | Cause-specific recovery from §5.4 | Keep the simulation frozen during recovery |
| Resume | Return focus to the next active panel or to gameplay | Advance once if all pause reasons are clear and the tab owns a ready, live run |

Prefer unobtrusive inline status within the Pause Menu rather than introducing a full separate Save/Load page. Avoid time estimates and arbitrary artificial loading delays.

## 7. Suggested implementation boundary

React owns pause-menu rendering and keyboard/focus interaction. Phaser/game state owns authoritative simulation, safe snapshots and save eligibility. Save persistence runs via an injected repository, not direct Dexie calls sprinkled throughout UI components.

Illustrative contracts (adapt names to actual project code):

```ts
type PauseSaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'storage_error'; message: string }
  | { kind: 'revision_conflict' }
  | { kind: 'ownership_lost' };

type PauseMenuView = {
  isOpen: boolean;
  runIsAlive: boolean;
  saveStatus: PauseSaveStatus;
};

interface PauseMenuActions {
  resume(): void;
  saveGame(): Promise<void>;
  saveAndExit(): Promise<void>;
  reloadLatestSave(): Promise<void>;
  retrySave(): Promise<void>;
}
```

Implementation requirements:

- Derive simulation eligibility from the independent pause reasons and pending Resume acknowledgment. [Pause decision](adr/0002-independent-pause-reasons.md)
- Serialize saves in the owning tab. An ownership or revision conflict leaves stored data intact and keeps stale gameplay suspended. [Save decision](adr/0003-exclusive-local-run-and-save-revisions.md)
- Guard `Esc`/navigation while a save is in progress, or handle pending operations without exiting and losing progress.
- Ensure component unmount/re-mount and React Strict Mode do not duplicate keyboard bindings or resume events.
- Continue performs normal loading from Main Menu. Reload latest save appears only during revision-conflict recovery.

## 8. Accessibility and usability

- Use native buttons with labels exactly `Resume`, `Save Game`, `Save & Exit` and visible focus outlines.
- Manage modal focus: focus the Resume button on entry; trap focus within the active menu as appropriate; restore focus to game canvas on Resume.
- Communicate save progress and save failure with text, not color alone; announce status in an accessible live region if suitable.
- Clicking an interactive panel/overlay does not attack zombies. Dimmed HUD/minimap behind the menu should not be keyboard- or pointer-actionable.
- Ensure contrast, readable typography and responsive bounds on supported desktop sizes.

## 9. Acceptance checklist

- [ ] Pause opens with `Esc` during active gameplay and shows **only Resume, Save Game, Save & Exit**.
- [ ] Visual treatment matches the approved central-panel layout, cream distressed branding, dim gameplay backdrop and restrained rust-red selection treatment.
- [ ] Escape and Resume return to active gameplay exactly once; correct focus and keys restored.
- [ ] Zombies, player motion, survival stats, combat, cooldowns and elapsed timer remain frozen while paused and saving.
- [ ] World attacks never fire from UI clicks; minimap, inventory and loot interactions stay blocked behind the modal.
- [ ] Save Game persists the correct current alive-run snapshot, reports success **only after** Dexie persistence, and keeps Pause Menu open.
- [ ] Save & Exit returns to Main Menu **only after save success**; Continue can resume the same character/world state.
- [ ] A failed save shows an error and retains the paused run and previously valid save; no premature exit or false success.
- [ ] Existing local save stays one slot; no Load Game screen, multiple save slots, Settings, separate Quit or clock system is added.
- [ ] Death disables Continue and goes through the separate Game Over flow, not Pause.
- [ ] Save/load preserves the active survivor, inventory, equipment, loot depletion, zombie state and survival duration.
- [ ] Controls work with keyboard and mouse, with visible focus and readable save statuses.

## 10. Handoff and next step

**Approved:** Pause Menu **visual style/layout** and the MVP behavior described here.  
**Visual reference:** `references/approved-pause-menu-concept.png` (contains extra illustrated rows; do not implement them).  
**No PRD change required:** These three actions and one-slot save/load policy already exist in the master PRD.  
**Next review:** Step 8.2 — the small save-status/confirmation treatment or, if sufficient, move directly to a **single Game Over screen** concept for visual approval; do not generate a multi-screen board.
