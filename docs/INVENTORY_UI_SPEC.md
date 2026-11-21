# Dead County — Inventory UI Specification

> **Status:** Inventory-panel visual direction approved; gameplay behavior constrained to the MVP  
> **Version:** 1.0 — 2026-11-18  
> **Scope:** Standalone inventory overlay only (Step 7.1); the separate Loot/Search panel receives its own review/spec  
> **Stack:** React + TypeScript + Tailwind CSS over the Phaser 4 game world  
> **Authorities:** `PRD.md` v2.1 → `DESIGN_SYSTEM.md` → `GAMEPLAY_HUD_SPEC.md`  
> **Concept reference:** `references/approved-inventory-concept.png` (visual inspiration, **not** a gameplay specification)

---

## 1. Decision and approval boundary

The user approved the Inventory UI concept's **layout and aesthetic**: matte charcoal surfaces, subtle weathered frames, warm cream typography, clearly outlined square item cells, restrained red/olive selection treatments, and an item detail region. The game world remains discernible behind a dim overlay.

The source of truth is 12 fixed inventory slots in a 4-column × 3-row grid, with one item instance per occupied slot and a shared carry weight limit.

- **Baseball Bat** — Equip / Unequip for melee combat.
- **Canned Food** — Use to reduce hunger severity.
- **Water Bottle** — Use to reduce thirst severity.
- **Bandage** — Use to restore health, capped at 100.
- **Trail Mix** — Use to relieve a small amount of hunger.
- **Canvas Backpack** — Equip from a normal inventory slot to raise carry capacity. Show its equipped marker on that slot.
- **Door Wedge** — Use beside a reachable closed door from inside its building. Show the reason when placement is unavailable.

Show total weight and the current limit together near the grid. A transfer that would exceed the limit leaves the source item in place. Removing the active backpack requires the remaining load to fit the base limit.

---

## 2. Screen purpose and entry points

- **Open / close:** Press `I` while playing to open the Inventory overlay; press `I`, `Esc`, or the visible `×` to close.
- **Run state:** Opening inventory enters the game's **blocking-overlay** state. All world simulation pauses, including zombies, combat, player movement, survival-stat progression and elapsed survival timer.
- **Focus:** On open, keyboard focus enters inventory; on close, return focus to the active gameplay canvas safely.
- **Combat safety:** Any mouse click inside the overlay must be handled by React and **must not** trigger Phaser's Left Mouse Click attack.
- **Overlay exclusivity:** Do not independently stack the standalone inventory over other blocking screens. When the Loot/Search panel is active, use that panel's coordinated inventory view rather than opening a second unrelated inventory overlay.
- **No world movement:** WASD, `E` and attack commands must be ignored by Phaser while inventory is visible. Escape should close the foreground panel only, not open Pause simultaneously.

---

## 3. Desktop composition

**Baseline:** Desktop 1280×720, scalable to 1920×1080 and smaller desktop browsers. Keep the player/world readable behind a moderately dimmed backdrop; artwork can remain static since gameplay is paused.

**Recommended composition:**

1. **Main panel, centered / slightly right of center:** Compact charcoal bordered rectangle with header `Inventory`, a top-right `×` close control, **4×3** item grid, and contextual actions.
2. **Item detail pane:** Adjacent panel or integrated right column for the selected item (icon, name, category, a one- or two-line description, and valid actions).
3. **Empty state:** Empty square slots remain visible and subtly inset; **no fake item icon** is rendered.
4. **Background:** Existing gameplay scene and normal HUD remain visually behind the modal with an overlay dim/scrim; no new character render, new 3D equipment interface, or world-scene change is required.

At narrower widths, place the detail pane **below** the grid rather than cropping slots or hiding the close control. Target a 4×3 grid at all supported desktop widths. No mobile layout is required for MVP.

### 3.1 Rough hierarchy

```text
                 ┌───────── INVENTORY ────────────┬──────── ITEM DETAILS ────────┐
                 │                            [×]│                              │
                 │ [ 1 ] [ 2 ] [ 3 ] [ 4 ]        │ Selected item icon & name    │
                 │ [ 5 ] [ 6 ] [ 7 ] [ 8 ]        │ Item category                 │
                 │ [ 9 ] [10 ] [11 ] [12 ]        │ Short descriptive text       │
                 │                                 │                              │
                 │            [selected item actions: Use/Equip · Drop]          │
                 └────────────────────────────────────────────────────────────────┘
```

Slot numbers in this **document** refer to positions. The bottom HUD strip provides click access to the first ten slots under FR-I17. The full grid handles rearrangement and retains all twelve positions.

---

## 4. Visual tokens and interactive states

Use `DESIGN_SYSTEM.md` tokens instead of color values sampled from the concept image.

| UI part | Direction / token |
|---|---|
| Surface | `color.surface` `#1B1E1D`; dark matte with restrained texture |
| Screen dim | `color.scrim` `rgb(0 0 0 / 70%)`, adapt opacity only for readability |
| Borders and dividers | `color.border` `#49544A`; subtle 1px / occasional 2px emphasis |
| Headings | `Bebas Neue` display; cream `color.textPrimary` `#EEE6D6` |
| Item labels & action text | Clean `Inter`, cream; readable, undistressed UI text |
| Hover/selection | Raised charcoal/olive context; clear border; no ambiguous color-only selection |
| Keyboard focus | High-contrast `color.focus` `#D6AE6D`, visible focus ring |
| Primary action | `color.accent` `#686A3F`, accessible text contrast |
| Destructive Drop emphasis | Subtle danger accent `color.danger` `#B14A3A`, not a giant alert |
| Empty slot | Muted inset square, no ghost icons or fabricated quantities |

**Interaction states:** empty, occupied, hovered, selected, keyboard-focused, equipped (bat), usable, disabled, full-inventory warning. Distinguish **selected** from **equipped**: selection determines the details pane; equipped determines combat readiness. The bat may be equipped even when its slot is not currently selected.

Keep slot hit targets comfortably clickable (~44px minimum), and prevent long names or descriptions from clipping. A slot's selected/equipped status must be communicated by icon/text/outline as well as color.

---

## 5. Inventory data and item semantics

### 5.1 Fixed storage rules

- Exactly **12 stable inventory positions**.
- At fresh-run spawn all 12 positions are empty and the equipped weapon reference is null for either survivor. The starter items remain in House A until the player transfers them.
- Each occupied position references exactly **one distinct item instance**.
- Duplicates of the *same item type* are allowed as **separate unstacked items**, each consuming its own slot. Example: three Bandages occupy three slots; **do not show `×3`** in a single cell.
- Pickups and container transfers fill the lowest-index empty slot. Indices 0 through 11 run left to right across each row from the top. Existing items keep their positions.
- Drag a carried item onto an empty slot to move it, or onto an occupied slot to swap the two instances. Use **Move** and then select a destination for the same action by keyboard or click. Moving either item preserves its equipment state and saves its resulting slot.
- The currently equipped Baseball Bat must refer to an item instance actually present in the inventory, or equipment must be a clearly defined saved entity using the same item ownership rules; **no duplicated free weapon**.
- Equipping or unequipping the bat does **not** silently destroy the item or change inventory capacity.

### 5.2 Actions

| Selected item | Primary action | Secondary action | Result |
|---|---|---|---|
| Baseball Bat | **Equip** (or **Unequip** if equipped) | **Drop** | Equip and Unequip change the equipped reference. A successful drop moves that bat into the world. |
| Canned Food | **Use** | **Drop** | Reduce hunger severity (toward 0); consume exactly one item |
| Water Bottle | **Use** | **Drop** | Reduce thirst severity (toward 0); consume exactly one item |
| Bandage | **Use** | **Drop** | Restore health up to 100; consume exactly one item |

Only show actions that apply to the selected item. When no item is selected, hide or disable item-specific controls and show a gentle instruction such as `Select an item to view details`.

Disable **Use** for a bandage at full health, food at zero hunger, and water at zero thirst. Keep the item and explain the reason in text, such as “Health is full.” If even one point can be restored or relieved, allow Use and clamp the benefit to the stat limit. Gameplay tuning supplies the item increments.

Bandage Use is the only Health recovery action in the MVP. On an eligible Use, apply the capped healing and consume exactly one selected instance in the same inventory operation. Resting can restore Stamina. It leaves Health at its current value.

After an Equip succeeds, mark the occupied slot as equipped. After a Use succeeds, show the affected stat and resulting value in the open panel. Derive both from the committed result, including when the used item's slot is now empty.

The inventory owns clicks on Use, Close and every slot through pointer release. Closing Inventory clears its own pause reason. An interrupted action continues from its saved phase once all pause reasons and any required Resume have cleared. A new swing requires a fresh press in the gameplay world.

**Drop placement and ownership**

Click **Drop** or drag a carried item onto the **Drop** button. Releasing it outside a valid target leaves it in its slot.

1. Validate that the original slot still holds the requested instance and that Drop is allowed. Test the survivor’s feet, then the nearest walkable position within immediate, unobstructed pickup reach. Check collision before placement.
2. Place the same item instance at the validated position. Only after placement succeeds, clear the source slot and clear the equipped reference if it points to this item. Publish one completed change so the HUD and save snapshots see the item in exactly one location. Repeating the command for the emptied slot creates no additional drop.
3. If no position qualifies or placement fails, discard any partial world placement. Keep the same instance in its original slot with its equipment state intact. Display **Cannot drop item here.**

During a bat swing, including recovery, disable **Unequip** and **Drop** for the equipped bat with “Finish your swing first.” Validate the lock when the command runs. Other items retain their usual actions. The remaining swing time stays frozen until gameplay resumes.

For a selected world drop, `E Pick up <item name>` moves that instance directly to one vacant inventory slot. The HUD selects between drops and containers using the shared [interaction rules](GAMEPLAY_HUD_SPEC.md#42-trigger-priority-and-dismissal).

### 5.3 Full-inventory behavior

- Pickup and transfer require a vacant slot. A recovered bat enters that slot unequipped, even when it was equipped before the drop. The Equip action is the only way to switch to that bat.
- If all 12 are occupied: reject the action, show `Inventory full`, and leave the source item **untouched**.
- Never overwrite an existing slot, silently discard a source item or create item duplication.
- An empty slot reopens capacity immediately after a legitimate use/drop.

---

## 6. Relationship with Loot/Search screen

The *approved picture* happens to show a Loot panel next to Inventory. This is a useful visual reference for **relative panel hierarchy**, but the **Loot/Search screen is not yet approved** as a separate Step 7.2 artifact.

Existing authoritative rules still apply:

- `E Search` appears **only next to a nearby reachable indoor Cabinet, Drawer or Supply Box**.
- A house doorway is **not** a search target; the survivor walks through the open doorway.
- Search/loot is another blocking overlay. The player must be able to transfer one item only if the 12-slot inventory has room.
- The actual layout and controls of the combined Loot/Search panel, including any `Take All` action, are **pending Step 7.2 review**. Do **not** copy the reference image's `E Take`, `R Take All`, item stacks or extra items as approved mechanics.

---

## 7. React / Phaser integration contract

**Gameplay state authority** stays in the Phaser-connected run store or canonical game-state layer. React presents immutable inventory snapshots and sends validated commands. Avoid keeping a second independent copy of the item list inside React local state.

Illustrative TypeScript types (rename to match existing codebase conventions):

```ts
type ItemKind = 'baseball_bat' | 'canned_food' | 'water_bottle' | 'bandage';

type InventorySlot = {
  slotIndex: number;            // 0..11
  item: null | {
    instanceId: string;         // unique across world + inventory
    kind: ItemKind;
  };
};

type InventoryUIState = {
  open: boolean;
  slots: readonly InventorySlot[];  // length exactly 12
  selectedSlotIndex: number | null;
  equippedItemInstanceId: string | null;
  error: string | null;
};
```

**Commands:** `openInventory()`, `closeInventory()`, `selectInventorySlot(index)`, `useItem(instanceId)`, `equipItem(instanceId)`, `unequipItem()`, `dropItem(instanceId)`. Gameplay validates the command against current run state and item ownership; the client UI must not treat visuals as authorization.

**Persistence:** Save and load all 12 slot positions, unique item instances and equipped bat reference using the existing IndexedDB/Dexie active-run snapshot. Restoring a save must not duplicate items, revive consumed items or change the selected male/female survivor.

**Event discipline:** The Inventory overlay consumes mouse/keyboard UI events so neither attacks nor other Phaser input fires. Ensure closing/reopening does not double-register listeners. Modal state and engine pause must stay synchronized.

---

## 8. Accessibility and usability

- The Inventory heading, selected item, icon meanings and available actions must be readable without hover-only tooltips.
- Keyboard navigation should support focusing a slot, moving through the grid and activating valid actions where practical; do not trap focus outside the modal.
- `I` and `Esc` close the foreground inventory once, with no double-triggered Pause.
- Provide visible focus states, accessible labels for occupied/empty slots and action buttons, and text feedback for errors.
- UI scales coherently at desktop viewport changes. Avoid clipping the bottom actions or overlay close button.

---

## 9. Acceptance criteria / implementation checklist

- [ ] Pressing `I` opens the Inventory panel with **exactly 12 cells (4×3)**; `I`, `Esc`, or `×` closes it.
- [ ] Only Baseball Bat, Canned Food, Water Bottle and Bandage can appear in occupied slots.
- [ ] Item instances occupy separate slots. The weight readout reflects the carried total and the active capacity.
- [ ] Selecting an item updates the details panel and shows only relevant `Use`, `Equip/Unequip`, `Drop` actions.
- [ ] Equipped bat is distinguished from merely selected bat; equipment state is restored from saved run.
- [ ] Food reduces Hunger severity; Water reduces Thirst severity; Bandage restores Health; no stat exceeds its limits.
- [ ] Successful use removes exactly one item. Drop creates one persistent, recoverable world item.
- [ ] Full 12-slot inventory rejects pickup without item loss/duplication and shows `Inventory full`.
- [ ] Game simulation, zombie AI, combat and elapsed survival time freeze while the inventory is open.
- [ ] UI clicks do not cause Left Click melee attacks or accidental `E Search` interactions.
- [ ] No firearm, axe, medkit, ammo, materials, weight, durability, crafting, quickbar assignment or item hotkeys are introduced from concept art.
- [ ] Gameplay HUD preview remains derived from existing inventory items (no extra slots).
- [ ] Screen retains the approved gritty charcoal/cream aesthetic at desktop sizes, with usable focus and contrast.
- [ ] Inventory and equipped state survive IndexedDB save/load without corruption.

---

## 10. Handoff

**Approved now:** Inventory **visual direction** plus this MVP-safe 12-slot specification.  
**Next design review:** **Step 7.2 — Loot/Search Panel**, as a **separate image** following the established one-image → review → approve → spec process.  
**PRD update:** Not required, because this specification implements already-approved `PRD.md` v2.1 behavior.

> **IMPORTANT:** The concept artwork in the package includes deliberately out-of-scope icons and UI text. Developers must follow this specification, not copy the screenshot literally.
